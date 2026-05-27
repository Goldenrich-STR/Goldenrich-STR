"""Property verification state-machine + notifications.

Transitions:
  draft → pending_verification (host submits) → broker auto-assigned
  pending_verification → under_review (broker submits site visit data)
  under_review → live (admin final approve, after RM approval) 
  under_review → rejected (admin rejects)
  under_review → draft (RM rejects, host resubmits)

Notifications fire at each transition.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.notification import NotificationChannel, NotificationType
from services.notification_service import send_multi_channel_notification

logger = logging.getLogger(__name__)


# --------------- Broker auto-assignment ---------------

async def assign_broker(db: AsyncIOMotorDatabase, property_id: str, city: str) -> Optional[str]:
    """Pick the broker with the lowest in-flight verification load.

    Preference: brokers in the same city; fallback to any active broker.
    Returns the broker user_id assigned (or None if no broker found).
    """
    try:
        # First, check if the host has a specific broker assigned during registration (via LG Code)
        property_data = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        if property_data and property_data.get("owner_id"):
            owner = await db.users.find_one({"user_id": property_data["owner_id"]})
            if owner and owner.get("broker_id"):
                chosen_broker = await db.users.find_one({"user_id": owner["broker_id"], "role": "broker", "is_active": True})
                if chosen_broker:
                    await db.properties.update_one(
                        {"property_id": property_id},
                        {"$set": {"broker_id": chosen_broker["user_id"], "updated_at": datetime.now(timezone.utc)}},
                    )
                    from models.verification import PropertyVerification, VerificationStatus
                    existing = await db.property_verifications.find_one({"property_id": property_id})
                    if not existing:
                        verification = PropertyVerification(
                            property_id=property_id,
                            broker_id=chosen_broker["user_id"],
                            owner_id=property_data["owner_id"],
                            status=VerificationStatus.PENDING,
                        )
                        await db.property_verifications.insert_one(verification.model_dump())
                    logger.info(f"Host's registered broker {chosen_broker['user_id']} assigned directly to property {property_id}")
                    return chosen_broker["user_id"]

        # Fallback to load-balanced city-based auto-assignment
        brokers = await db.users.find(
            {"role": "broker", "is_active": True}, {"_id": 0}
        ).to_list(length=200)
        if not brokers:
            return None

        same_city = [b for b in brokers if (b.get("city") or "").lower() == (city or "").lower()]
        candidates = same_city if same_city else brokers

        # Compute load (open verifications) for each
        async def load_for(b):
            return await db.property_verifications.count_documents({
                "broker_id": b["user_id"],
                "status": {"$in": ["pending", "in_progress"]},
            })

        loads = await asyncio.gather(*[load_for(b) for b in candidates])
        chosen = candidates[loads.index(min(loads))]

        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {"broker_id": chosen["user_id"], "updated_at": datetime.now(timezone.utc)}},
        )
        # Pre-create a PENDING verification record so it shows in broker queue
        from models.verification import PropertyVerification, VerificationStatus
        property_data = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        existing = await db.property_verifications.find_one({"property_id": property_id})
        if not existing and property_data:
            verification = PropertyVerification(
                property_id=property_id,
                broker_id=chosen["user_id"],
                owner_id=property_data["owner_id"],
                status=VerificationStatus.PENDING,
            )
            await db.property_verifications.insert_one(verification.model_dump())

        logger.info(f"Broker {chosen['user_id']} assigned to property {property_id} (load={min(loads)})")
        return chosen["user_id"]
    except Exception as e:
        logger.error(f"assign_broker failed: {e}")
        return None


# --------------- Notification helpers ---------------

async def _notify(
    db: AsyncIOMotorDatabase,
    user_id: str,
    notif_type: NotificationType,
    title: str,
    message: str,
    data: dict,
    channels: Optional[list] = None,
) -> None:
    try:
        await send_multi_channel_notification(
            db=db,
            user_id=user_id,
            notification_type=notif_type,
            title=title,
            message=message,
            channels=channels or [
                NotificationChannel.IN_APP,
                NotificationChannel.WHATSAPP,
                NotificationChannel.EMAIL,
            ],
            data=data,
        )
    except Exception as e:
        logger.warning(f"_notify failed for {user_id}: {e}")


# --------------- Transition triggers ---------------

async def on_host_submit(db: AsyncIOMotorDatabase, property_data: dict) -> Optional[str]:
    """Host just submitted property for verification. Auto-assign broker + notify."""
    property_id = property_data["property_id"]
    broker_id = await assign_broker(db, property_id, property_data.get("city", ""))

    if broker_id:
        await _notify(
            db,
            broker_id,
            NotificationType.VERIFICATION_ASSIGNED,
            "New verification assignment",
            f"You've been assigned to verify '{property_data.get('title')}' in {property_data.get('city')}. "
            f"Visit the site and submit photos + checklist.",
            {
                "property_id": property_id,
                "property_title": property_data.get("title"),
                "city": property_data.get("city"),
            },
        )

    # Notify host that verification is queued
    await _notify(
        db,
        property_data["owner_id"],
        NotificationType.VERIFICATION_ASSIGNED,
        "Property submitted for verification",
        f"'{property_data.get('title')}' is now in the verification queue. "
        f"{'A broker has been assigned to visit your property.' if broker_id else 'A broker will be assigned shortly.'}",
        {"property_id": property_id, "broker_id": broker_id},
        channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    )
    return broker_id


async def on_broker_submit(db: AsyncIOMotorDatabase, verification: dict) -> None:
    """Broker submitted site-visit data. Notify assigned RM or all RMs (employees)."""
    property_id = verification["property_id"]
    property_data = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not property_data:
        return

    # Check if broker has an assigned RM
    broker_id = verification.get("broker_id")
    target_rms = []
    
    if broker_id:
        broker_data = await db.users.find_one({"user_id": broker_id, "role": "broker"})
        if broker_data and broker_data.get("rm_id"):
            rm_data = await db.users.find_one({"user_id": broker_data["rm_id"], "role": "employee", "is_active": True})
            if rm_data:
                target_rms.append(rm_data)

    # Fallback to all RMs if no specific RM assigned
    if not target_rms:
        target_rms = await db.users.find(
            {"role": "employee", "is_active": True}, {"_id": 0, "user_id": 1}
        ).to_list(length=50)

    title = "Verification ready for review"
    message = (
        f"Broker submitted verification for '{property_data.get('title')}' "
        f"({property_data.get('city')}). Please review."
    )
    data = {
        "verification_id": verification.get("verification_id"),
        "property_id": property_id,
        "property_title": property_data.get("title"),
    }
    for rm in target_rms:
        await _notify(
            db, rm["user_id"], NotificationType.VERIFICATION_SUBMITTED, title, message, data,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
        )

    # Notify host that broker visit is complete
    await _notify(
        db,
        property_data["owner_id"],
        NotificationType.VERIFICATION_SUBMITTED,
        "Broker visit complete",
        f"Our broker has finished the site visit for '{property_data.get('title')}'. Awaiting RM review.",
        data,
        channels=[NotificationChannel.IN_APP],
    )


async def on_rm_decision(db: AsyncIOMotorDatabase, verification: dict, approved: bool, remarks: str = "") -> None:
    """RM approved / rejected the verification. Notify admins (on approve) or host (on reject)."""
    property_id = verification["property_id"]
    property_data = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
    if not property_data:
        return

    if approved:
        admins = await db.users.find(
            {"role": "admin", "is_active": True}, {"_id": 0, "user_id": 1}
        ).to_list(length=20)
        for admin in admins:
            await _notify(
                db,
                admin["user_id"],
                NotificationType.VERIFICATION_REVIEWED,
                "Property awaiting final approval",
                f"RM has approved verification for '{property_data.get('title')}'. Make the final call.",
                {
                    "verification_id": verification.get("verification_id"),
                    "property_id": property_id,
                    "property_title": property_data.get("title"),
                },
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            )

        # Tell host RM has approved
        await _notify(
            db,
            property_data["owner_id"],
            NotificationType.VERIFICATION_REVIEWED,
            "RM review complete",
            f"Our Relationship Manager approved the inspection for '{property_data.get('title')}'. "
            f"Final admin approval is the only step left.",
            {"property_id": property_id},
            channels=[NotificationChannel.IN_APP],
        )
    else:
        await _notify(
            db,
            property_data["owner_id"],
            NotificationType.PROPERTY_REJECTED,
            "Listing needs revision",
            f"RM has flagged your listing '{property_data.get('title')}' for changes: {remarks or 'see details'}. "
            f"Please update and resubmit.",
            {"property_id": property_id, "remarks": remarks},
        )


async def on_admin_decision(db: AsyncIOMotorDatabase, property_data: dict, approved: bool, reason: str = "") -> None:
    """Admin approved/rejected — notify host with the final outcome."""
    if approved:
        await _notify(
            db,
            property_data["owner_id"],
            NotificationType.PROPERTY_APPROVED,
            "Your listing is live!",
            f"Congratulations! '{property_data.get('title')}' is now live on Golden Rich Stay and accepting bookings.",
            {"property_id": property_data["property_id"]},
        )
    else:
        await _notify(
            db,
            property_data["owner_id"],
            NotificationType.PROPERTY_REJECTED,
            "Listing not approved",
            f"Unfortunately '{property_data.get('title')}' was not approved: {reason or 'see admin remarks'}. "
            f"You can update and resubmit.",
            {"property_id": property_data["property_id"], "reason": reason},
        )
