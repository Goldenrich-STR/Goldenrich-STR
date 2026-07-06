"""Send one booking reminder before each confirmed stay."""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.notification import NotificationChannel, NotificationType
from services.notification_service import send_multi_channel_notification

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = int(os.getenv("BOOKING_REMINDER_INTERVAL", "3600"))
LEAD_DAYS = int(os.getenv("BOOKING_REMINDER_LEAD_DAYS", "1"))

_task: Optional[asyncio.Task] = None


async def _send_reminder(db: AsyncIOMotorDatabase, booking: dict) -> bool:
    prop = await db.properties.find_one(
        {"property_id": booking["property_id"]},
        {"_id": 0},
    ) or {}
    host = await db.users.find_one(
        {"user_id": booking["host_id"]},
        {"_id": 0, "full_name": 1, "phone": 1, "mobile": 1},
    ) or {}
    property_title = prop.get("title") or "your stay"
    frontend_url = os.getenv(
        "PUBLIC_FRONTEND_URL", "https://uat.x-space360.in"
    ).rstrip("/")

    try:
        result = await send_multi_channel_notification(
            db=db,
            user_id=booking["guest_id"],
            notification_type=NotificationType.BOOKING_REMINDER,
            title=f"Your stay at {property_title} is coming up",
            message=(
                f"Reminder: booking {booking['booking_id']} starts on "
                f"{booking.get('check_in_date')}."
            ),
            channels=[
                NotificationChannel.IN_APP,
                NotificationChannel.EMAIL,
            ],
            data={
                "booking_id": booking["booking_id"],
                "property_id": booking["property_id"],
                "property_title": property_title,
                "property_address": prop.get("address") or "",
                "check_in_date": booking.get("check_in_date"),
                "check_out_date": booking.get("check_out_date"),
                "check_in_time": prop.get("check_in_time") or "12:00 PM",
                "check_out_time": prop.get("check_out_time") or "11:00 AM",
                "host_name": host.get("full_name") or "Host",
                "host_mobile": host.get("phone") or host.get("mobile") or "",
                "check_in_instructions": (
                    prop.get("check_in_instructions")
                    or "Please contact the host upon arrival."
                ),
                "action_url": (
                    f"{frontend_url}/guest/booking-confirmation"
                    f"?booking_id={booking['booking_id']}"
                ),
            },
        )
        email_result = (result.get("results") or {}).get("email") or {}
        return bool(email_result.get("success"))
    except Exception:
        logger.exception(
            "[booking-reminder] send failed for %s", booking.get("booking_id")
        )
        return False


async def sweep_once(db: AsyncIOMotorDatabase) -> dict:
    target_date = (date.today() + timedelta(days=LEAD_DAYS)).isoformat()
    cursor = db.bookings.find(
        {
            "booking_status": "confirmed",
            "payment_status": {"$in": ["paid", "partially_paid"]},
            "check_in_date": target_date,
            "booking_reminder_sent_at": {"$exists": False},
        },
        {"_id": 0},
    )
    bookings = await cursor.to_list(length=500)

    sent = failed = 0
    for booking in bookings:
        ok = await _send_reminder(db, booking)
        if ok:
            await db.bookings.update_one(
                {
                    "booking_id": booking["booking_id"],
                    "booking_reminder_sent_at": {"$exists": False},
                },
                {
                    "$set": {
                        "booking_reminder_sent_at": datetime.now(timezone.utc)
                    }
                },
            )
            sent += 1
        else:
            failed += 1

    if bookings:
        logger.info(
            "[booking-reminder] total=%s sent=%s failed=%s",
            len(bookings),
            sent,
            failed,
        )
    return {"total": len(bookings), "sent": sent, "failed": failed}


async def _loop(db: AsyncIOMotorDatabase, interval_seconds: int) -> None:
    await asyncio.sleep(30)
    while True:
        try:
            await sweep_once(db)
        except Exception:
            logger.exception("[booking-reminder] sweep crashed; retrying")
        await asyncio.sleep(interval_seconds)


def start_booking_reminder(
    db: AsyncIOMotorDatabase,
    interval_seconds: int = SWEEP_INTERVAL_SECONDS,
) -> None:
    global _task
    if _task and not _task.done():
        return
    _task = asyncio.create_task(_loop(db, interval_seconds))
    logger.info(
        "[booking-reminder] started interval=%ss lead=%sd",
        interval_seconds,
        LEAD_DAYS,
    )
