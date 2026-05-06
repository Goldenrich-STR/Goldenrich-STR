"""Soft-lock reaper + reminder recovery.

Two background concerns are handled here:

1. **Reaper**: every `interval_seconds`, scan for `soft_lock` bookings whose
   `soft_lock_expires_at` is in the past, mark them `cancelled`, and remove any
   booking-source blocked-date entries so the calendar frees up.

2. **Recovery**: on FastAPI startup, re-schedule the 8-minute reminder for any
   `soft_lock` booking whose lock is still in the future and which has not yet
   been notified (`soft_lock_reminder_sent` flag).

Both helpers run on the FastAPI event loop via `asyncio.create_task`. Failures
are logged but never propagate.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.booking import BookingStatus
from services.booking_notifications import schedule_soft_lock_reminder

logger = logging.getLogger(__name__)


async def reap_expired_soft_locks(db: AsyncIOMotorDatabase) -> int:
    """Cancel soft-lock bookings whose hold has expired. Returns count cancelled."""
    now = datetime.utcnow()

    cursor = db.bookings.find(
        {
            "booking_status": BookingStatus.SOFT_LOCK.value,
            "soft_lock_expires_at": {"$lte": now},
        },
        {"_id": 0, "booking_id": 1},
    )
    expired = await cursor.to_list(length=500)
    if not expired:
        return 0

    booking_ids = [b["booking_id"] for b in expired]

    await db.bookings.update_many(
        {"booking_id": {"$in": booking_ids}},
        {
            "$set": {
                "booking_status": BookingStatus.CANCELLED.value,
                "cancelled_at": now,
                "updated_at": now,
                "cancellation_reason": "soft_lock_expired",
            }
        },
    )

    # Remove any booking-source blocked-date entries (pre-empts any that may
    # have been inserted during a confirm-payment race; safe no-op otherwise).
    await db.blocked_dates.delete_many(
        {"source": "booking", "source_id": {"$in": booking_ids}}
    )

    logger.info(f"Soft-lock reaper: cancelled {len(booking_ids)} expired bookings")
    return len(booking_ids)


async def _reaper_loop(db: AsyncIOMotorDatabase, interval_seconds: int):
    while True:
        try:
            await reap_expired_soft_locks(db)
        except Exception as e:
            logger.error(f"reaper_loop iteration failed: {e}")
        await asyncio.sleep(interval_seconds)


def start_soft_lock_reaper(
    db: AsyncIOMotorDatabase, interval_seconds: int = 30
) -> Optional[asyncio.Task]:
    """Start the periodic soft-lock reaper. Idempotent across restarts (in-process)."""
    try:
        task = asyncio.create_task(_reaper_loop(db, interval_seconds))
        logger.info(f"Soft-lock reaper started (interval={interval_seconds}s)")
        return task
    except Exception as e:
        logger.error(f"Failed to start soft-lock reaper: {e}")
        return None


async def recover_pending_reminders(db: AsyncIOMotorDatabase) -> int:
    """Re-schedule reminders for live soft-locks that may have lost their in-process task.

    A booking is eligible if:
      - status == soft_lock
      - soft_lock_expires_at > now
      - soft_lock_reminder_sent is not True

    Returns count rescheduled.
    """
    now = datetime.utcnow()
    cursor = db.bookings.find(
        {
            "booking_status": BookingStatus.SOFT_LOCK.value,
            "soft_lock_expires_at": {"$gt": now},
            "$or": [
                {"soft_lock_reminder_sent": {"$exists": False}},
                {"soft_lock_reminder_sent": False},
            ],
        },
        {"_id": 0, "booking_id": 1, "soft_lock_expires_at": 1},
    )
    pending = await cursor.to_list(length=500)
    rescheduled = 0
    for b in pending:
        try:
            schedule_soft_lock_reminder(db, b["booking_id"], b["soft_lock_expires_at"])
            rescheduled += 1
        except Exception as e:
            logger.warning(f"Failed to recover reminder for {b['booking_id']}: {e}")

    if rescheduled:
        logger.info(f"Soft-lock reminders recovered for {rescheduled} pending bookings")
    return rescheduled
