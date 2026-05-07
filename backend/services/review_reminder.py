"""Phase 20 — Auto review-request reminder.

Periodically scans completed bookings and nudges the guest to leave a review.

Trigger window:
  • Booking is `confirmed` + `payment_status="paid"`
  • check_out_date is between (today - REVIEW_REMINDER_DELAY_DAYS) and today
  • No review exists yet for the booking
  • `review_reminder_sent_at` is unset (idempotency — fire once per booking)

The reminder fans out across in-app + WhatsApp + email (whatever the user has
opted into) and carries a deep link to /guest/bookings?review={booking_id} so
the frontend can auto-open the review modal.

Implementation matches the existing periodic-sweep pattern (soft-lock reaper,
iCal sync, payout sweeper) — asyncio loop inside the FastAPI worker, ready to
be lifted into Celery beat once volume warrants.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.notification import NotificationChannel, NotificationType

logger = logging.getLogger(__name__)


SWEEP_INTERVAL_SECONDS = int(os.environ.get("REVIEW_REMINDER_INTERVAL", "3600"))  # 1h
DELAY_DAYS = int(os.environ.get("REVIEW_REMINDER_DELAY_DAYS", "1"))  # check-out + 1d
LOOKBACK_DAYS = int(os.environ.get("REVIEW_REMINDER_LOOKBACK_DAYS", "5"))  # safety net
PUBLIC_URL = os.environ.get("PUBLIC_FRONTEND_URL") or os.environ.get("REACT_APP_BACKEND_URL", "")

_task: Optional[asyncio.Task] = None


async def _send_review_request(db: AsyncIOMotorDatabase, booking: dict) -> bool:
    """Multi-channel reminder for a single booking. Returns True on success."""
    from services.notification_service import send_multi_channel_notification

    prop = await db.properties.find_one(
        {"property_id": booking["property_id"]}, {"_id": 0, "title": 1, "city": 1}
    ) or {}
    title = prop.get("title", "your stay")

    deep_link = (
        f"{PUBLIC_URL}/guest/bookings?review={booking['booking_id']}"
        if PUBLIC_URL else f"/guest/bookings?review={booking['booking_id']}"
    )

    try:
        await send_multi_channel_notification(
            db=db,
            user_id=booking["guest_id"],
            notification_type=NotificationType.REVIEW_REQUEST,
            title=f"How was {title}?",
            message=(
                f"Hope you enjoyed {title}! Take 30 seconds to share your experience — "
                f"future guests rely on honest reviews."
            ),
            channels=[
                NotificationChannel.IN_APP,
                NotificationChannel.WHATSAPP,
                NotificationChannel.EMAIL,
            ],
            data={
                "booking_id": booking["booking_id"],
                "property_id": booking["property_id"],
                "deep_link": deep_link,
            },
        )
        return True
    except Exception as e:
        logger.warning(f"[review-reminder] send failed for {booking['booking_id']}: {e}")
        return False


async def sweep_once(db: AsyncIOMotorDatabase) -> dict:
    """One pass — scan eligible bookings and send reminders."""
    today = date.today()
    upper = (today - timedelta(days=DELAY_DAYS)).isoformat()
    lower = (today - timedelta(days=DELAY_DAYS + LOOKBACK_DAYS)).isoformat()

    # Bookings whose check_out fell in [lower, upper] AND haven't been nudged yet
    cursor = db.bookings.find({
        "booking_status": "confirmed",
        "payment_status": "paid",
        "check_out_date": {"$gte": lower, "$lte": upper},
        "review_reminder_sent_at": {"$exists": False},
    }, {"_id": 0})
    bookings = await cursor.to_list(length=500)

    sent, skipped, failed = 0, 0, 0
    for booking in bookings:
        # Skip if a review already exists (covers the rare race where a guest
        # reviewed before the reminder fired)
        existing = await db.reviews.find_one(
            {"booking_id": booking["booking_id"]}, {"_id": 0, "review_id": 1}
        )
        if existing:
            await db.bookings.update_one(
                {"booking_id": booking["booking_id"]},
                {"$set": {"review_reminder_sent_at": datetime.now(timezone.utc),
                          "review_reminder_skip_reason": "already_reviewed"}},
            )
            skipped += 1
            continue

        ok = await _send_review_request(db, booking)
        if ok:
            await db.bookings.update_one(
                {"booking_id": booking["booking_id"]},
                {"$set": {"review_reminder_sent_at": datetime.now(timezone.utc)}},
            )
            sent += 1
        else:
            failed += 1

    if bookings:
        logger.info(
            f"[review-reminder] swept {len(bookings)} eligible bookings: "
            f"sent={sent} skipped={skipped} failed={failed}"
        )
    return {"total": len(bookings), "sent": sent, "skipped": skipped, "failed": failed}


async def _loop(db: AsyncIOMotorDatabase, interval_seconds: int) -> None:
    await asyncio.sleep(45)  # warm-up before first sweep
    while True:
        try:
            await sweep_once(db)
        except Exception as e:
            logger.exception(f"[review-reminder] sweep crashed (will retry): {e}")
        await asyncio.sleep(interval_seconds)


def start_review_reminder(
    db: AsyncIOMotorDatabase, interval_seconds: int = SWEEP_INTERVAL_SECONDS
) -> None:
    """Idempotent — safe to call multiple times."""
    global _task
    if _task and not _task.done():
        logger.info("[review-reminder] already running, skipping start")
        return
    _task = asyncio.create_task(_loop(db, interval_seconds))
    logger.info(
        f"[review-reminder] started (interval={interval_seconds}s, "
        f"delay={DELAY_DAYS}d, lookback={LOOKBACK_DAYS}d)"
    )
