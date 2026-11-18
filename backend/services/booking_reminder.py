"""Send one booking reminder before each confirmed stay."""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from urllib.parse import quote_plus

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
    guest = await db.users.find_one(
        {"user_id": booking["guest_id"]},
        {"_id": 0, "full_name": 1},
    ) or {}
    property_title = prop.get("title") or "your stay"
    frontend_url = os.getenv(
        "PUBLIC_FRONTEND_URL", "https://x-space360.in"
    ).rstrip("/")
    map_url = prop.get("google_maps_url") or ""
    if not map_url and prop.get("latitude") is not None and prop.get("longitude") is not None:
        map_url = f"https://www.google.com/maps?q={prop['latitude']},{prop['longitude']}"
    if not map_url:
        address = ", ".join(filter(None, [prop.get("address"), prop.get("city"), prop.get("state"), prop.get("pin_code")]))
        if address:
            map_url = f"https://www.google.com/maps/search/?api=1&query={quote_plus(address)}"

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
                NotificationChannel.WHATSAPP,
            ],
            data={
                "guest_name": guest.get("full_name") or "Guest",
                "booking_id": booking["booking_id"],
                "property_id": booking["property_id"],
                "property_title": property_title,
                "property_address": prop.get("address") or "",
                "check_in_date": booking.get("check_in_date"),
                "check_out_date": booking.get("check_out_date"),
                "check_in_time": prop.get("check_in_time") or "12:00 PM",
                "check_out_time": prop.get("check_out_time") or "11:00 AM",
                "check_in_date_time": f"{booking.get('check_in_date')} {prop.get('check_in_time') or '12:00 PM'}",
                "check_out_date_time": f"{booking.get('check_out_date')} {prop.get('check_out_time') or '11:00 AM'}",
                "map_url": map_url,
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
        results = result.get("results") or {}
        return bool((results.get("whatsapp") or {}).get("success") or (results.get("email") or {}).get("success"))
    except Exception:
        logger.exception(
            "[booking-reminder] send failed for %s", booking.get("booking_id")
        )
        return False


async def _send_checkout_reminder(db: AsyncIOMotorDatabase, booking: dict) -> bool:
    prop = await db.properties.find_one({"property_id": booking["property_id"]}, {"_id": 0}) or {}
    guest = await db.users.find_one({"user_id": booking["guest_id"]}, {"_id": 0, "full_name": 1}) or {}
    try:
        result = await send_multi_channel_notification(
            db=db,
            user_id=booking["guest_id"],
            notification_type=NotificationType.GUEST_CHECKOUT_REMINDER,
            title="Check-out reminder",
            message=f"Your check-out for booking {booking['booking_id']} is today.",
            channels=[NotificationChannel.IN_APP, NotificationChannel.WHATSAPP],
            data={
                "guest_name": guest.get("full_name") or "Guest",
                "property_title": prop.get("title") or "Your property",
                "booking_id": booking["booking_id"],
                "check_out_date": booking.get("check_out_date"),
                "check_out_date_time": f"{booking.get('check_out_date')} {prop.get('check_out_time') or '11:00 AM'}",
            },
        )
        return bool(((result.get("results") or {}).get("whatsapp") or {}).get("success"))
    except Exception:
        logger.exception("[booking-reminder] checkout send failed for %s", booking.get("booking_id"))
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

    checkout_cursor = db.bookings.find(
        {
            "booking_status": "confirmed",
            "payment_status": {"$in": ["paid", "partially_paid"]},
            "check_out_date": date.today().isoformat(),
            "checkout_reminder_sent_at": {"$exists": False},
        },
        {"_id": 0},
    )
    checkout_bookings = await checkout_cursor.to_list(length=500)

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

    checkout_sent = checkout_failed = 0
    for booking in checkout_bookings:
        ok = await _send_checkout_reminder(db, booking)
        if ok:
            await db.bookings.update_one(
                {"booking_id": booking["booking_id"], "checkout_reminder_sent_at": {"$exists": False}},
                {"$set": {"checkout_reminder_sent_at": datetime.now(timezone.utc)}},
            )
            checkout_sent += 1
        else:
            checkout_failed += 1

    if bookings:
        logger.info(
            "[booking-reminder] total=%s sent=%s failed=%s",
            len(bookings),
            sent,
            failed,
        )
    return {
        "total": len(bookings), "sent": sent, "failed": failed,
        "checkout_total": len(checkout_bookings),
        "checkout_sent": checkout_sent,
        "checkout_failed": checkout_failed,
    }


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
