"""Phase 15 — Host-facing payout preference + payouts history."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from middleware.auth_middleware import get_current_user
from models.transaction import HostPayoutPreferenceUpdate, PayoutDestinationType
from models.user import UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/host", tags=["Host Payouts"])


async def get_db():
    from server import db_instance
    return db_instance


async def require_host(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.HOST.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Host access required")
    return current_user


def _sanitise(pref: dict) -> dict:
    """Strip internal flags; expose a masked account number alongside the raw one.
    The raw value is still included because the host needs it to pre-fill the
    edit form on their own page."""
    out = dict(pref)
    if out.get("bank_account_number"):
        bn = out["bank_account_number"]
        out["bank_account_number_masked"] = (
            f"{'*' * max(0, len(bn) - 4)}{bn[-4:]}" if len(bn) >= 4 else bn
        )
    return out


@router.get("/payout-preference")
async def get_payout_preference(
    current_user: dict = Depends(require_host),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    user = await db.users.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "payout_preference": 1},
    )
    pref = (user or {}).get("payout_preference") or {"preferred": "upi"}
    return {"payout_preference": _sanitise(pref)}


@router.put("/payout-preference")
async def update_payout_preference(
    payload: HostPayoutPreferenceUpdate,
    current_user: dict = Depends(require_host),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    # Strict validation per preferred destination — host must re-send all fields
    # for the chosen channel every time they save, so the backend never silently
    # reuses stale data.
    if payload.preferred == PayoutDestinationType.UPI:
        if not payload.upi_vpa or "@" not in payload.upi_vpa:
            raise HTTPException(400, detail="A valid UPI VPA (e.g. name@bank) is required")
    else:
        if not (payload.bank_account_number and payload.bank_ifsc and payload.bank_account_holder):
            raise HTTPException(
                400,
                detail="Bank account number, IFSC and holder name are all required",
            )

    pref_doc = payload.model_dump()
    pref_doc["updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"payout_preference": pref_doc, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Payout preference updated", "payout_preference": _sanitise(pref_doc)}


@router.get("/payouts")
async def list_my_payouts(
    payout_status: Optional[str] = None,
    current_user: dict = Depends(require_host),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query: dict = {"host_id": current_user["user_id"]}
    if payout_status:
        query["status"] = payout_status
    cursor = db.payouts.find(query, {"_id": 0}).sort("eligible_at", -1)
    items = await cursor.to_list(length=200)
    for p in items:
        prop = await db.properties.find_one(
            {"property_id": p["property_id"]},
            {"_id": 0, "title": 1, "city": 1},
        )
        p["property"] = prop
    return {"payouts": items, "total": len(items)}


from pydantic import BaseModel

class HostVerificationSubmit(BaseModel):
    aadhar_card: str
    property_proof: str
    cancelled_cheque: str
    gst_certificate: Optional[str] = None
    gst_number: Optional[str] = None
    agreement_owner_name: str
    agreement_owner_address: str
    agreement_signature: str


@router.post("/submit-verification")
async def submit_host_verification(
    payload: HostVerificationSubmit,
    current_user: dict = Depends(require_host),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    docs = [
        {"document_type": "aadhar_card", "document_url": payload.aadhar_card},
        {"document_type": "property_proof", "document_url": payload.property_proof},
        {"document_type": "cancelled_cheque", "document_url": payload.cancelled_cheque},
    ]
    if payload.gst_certificate:
        docs.append({"document_type": "gst_certificate", "document_url": payload.gst_certificate})
    if payload.gst_number:
        docs.append({"document_type": "gst_number", "document_url": payload.gst_number})

    await db.users.update_one(
        {"user_id": current_user["user_id"]},
        {
            "$set": {
                "kyc_status": "pending",
                "kyc_documents": docs,
                "agreement_owner_name": payload.agreement_owner_name,
                "agreement_owner_address": payload.agreement_owner_address,
                "agreement_signature": payload.agreement_signature,
                "agreement_signed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )

    try:
        from services.notification_service import NotificationService
        from models.notification import NotificationType, NotificationChannel
        
        # Find all admins
        admins_cursor = db.users.find({"role": "admin"})
        admins = await admins_cursor.to_list(length=100)
        
        notification_service = NotificationService(db)
        for admin in admins:
            await notification_service.send_notification(
                user_id=admin["user_id"],
                notification_type=NotificationType.VERIFICATION_SUBMITTED,
                channels=[NotificationChannel.IN_APP],
                title="New Host Document Verification Request",
                message=f"Host {current_user.get('full_name', 'Unknown')} has submitted documents for verification.",
                data={
                    "host_id": current_user["user_id"],
                    "host_name": current_user.get("full_name"),
                    "request_type": "host_verification"
                }
            )
    except Exception as n_err:
        logger.warning(f"Failed to notify admins of host verification: {n_err}")

    return {"message": "Verification documents submitted successfully"}
