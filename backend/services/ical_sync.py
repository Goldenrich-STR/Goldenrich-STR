"""Phase 18 — Background iCal sweep.

Pulls every registered external calendar on a fixed interval and refreshes the
EXTERNAL blocked-date entries through the existing `sync_external_calendar()`
helper. Implemented as an asyncio task so it lives inside the FastAPI worker —
matching the soft-lock reaper pattern.

>>> Production upgrade path: Celery
>>>     The `sync_one()` call below is a Celery-ready unit of work. To migrate,
>>>     install Celery + a broker (Redis/RabbitMQ), wrap `sync_one(calendar_id)`
>>>     in `@celery_app.task`, replace this loop with `celery beat` and route
>>>     via worker pools. The DB schema, the public sync API, and the per-feed
>>>     state machine all stay identical.
"""
from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# How often we sweep all calendars (seconds). Override with env ICAL_SWEEP_INTERVAL.
DEFAULT_INTERVAL = int(os.environ.get("ICAL_SWEEP_INTERVAL", "1800"))  # 30 min
# Per-feed minimum freshness — skip a calendar if it was synced less than this
# many seconds ago (override with ICAL_MIN_FRESHNESS).
MIN_FRESHNESS_SECONDS = int(os.environ.get("ICAL_MIN_FRESHNESS", "900"))  # 15 min


_task: Optional[asyncio.Task] = None


async def sync_one(calendar_id: str, db: AsyncIOMotorDatabase) -> None:
    """Celery-friendly wrapper around the route-level sync helper."""
    from routes.calendar_routes import sync_external_calendar
    await sync_external_calendar(calendar_id, db)


async def _sweep_once(db: AsyncIOMotorDatabase) -> dict:
    """One pass over every external calendar — refresh whatever is stale."""
    cursor = db.external_calendars.find({}, {"_id": 0})
    cals = await cursor.to_list(length=2000)
    now = datetime.now(timezone.utc)

    synced, skipped, failed = 0, 0, 0
    for cal in cals:
        last = cal.get("last_synced_at")
        if last:
            # `last` is a tz-aware datetime since motor was opened with tz_aware=True
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if (now - last).total_seconds() < MIN_FRESHNESS_SECONDS:
                skipped += 1
                continue
        try:
            await sync_one(cal["calendar_id"], db)
            synced += 1
        except Exception as e:
            failed += 1
            logger.warning(f"[ical-sweep] sync failed for {cal['calendar_id']}: {e}")

    if cals:
        logger.info(
            f"[ical-sweep] swept {len(cals)} calendars: synced={synced} "
            f"skipped={skipped} failed={failed}"
        )
    return {"total": len(cals), "synced": synced, "skipped": skipped, "failed": failed}


async def _loop(db: AsyncIOMotorDatabase, interval_seconds: int) -> None:
    # initial slack so the worker fully boots before we hammer external feeds
    await asyncio.sleep(20)
    while True:
        try:
            await _sweep_once(db)
        except Exception as e:
            logger.exception(f"[ical-sweep] sweep crashed (will retry): {e}")
        await asyncio.sleep(interval_seconds)


def start_ical_sync(db: AsyncIOMotorDatabase, interval_seconds: int = DEFAULT_INTERVAL) -> None:
    """Kick off the periodic sweep. Idempotent — safe to call twice."""
    global _task
    if _task and not _task.done():
        logger.info("[ical-sweep] already running, skipping start")
        return
    _task = asyncio.create_task(_loop(db, interval_seconds))
    logger.info(f"[ical-sweep] started (interval={interval_seconds}s, freshness>{MIN_FRESHNESS_SECONDS}s)")
