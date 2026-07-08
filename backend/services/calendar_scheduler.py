from __future__ import annotations

import logging
import os

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase

from services.calendar_sync_service import sync_all_calendars

logger = logging.getLogger(__name__)

DEFAULT_SYNC_INTERVAL_MINUTES = int(os.environ.get("ICAL_SYNC_INTERVAL_MINUTES", "30"))

_scheduler: AsyncIOScheduler | None = None


async def _run_sync(db: AsyncIOMotorDatabase) -> None:
    await sync_all_calendars(db)


def start_calendar_scheduler(
    db: AsyncIOMotorDatabase,
    interval_minutes: int = DEFAULT_SYNC_INTERVAL_MINUTES,
) -> AsyncIOScheduler:
    global _scheduler

    if _scheduler and _scheduler.running:
        logger.info("Calendar scheduler already running")
        return _scheduler

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        _run_sync,
        trigger=IntervalTrigger(minutes=interval_minutes),
        args=[db],
        id="calendar_sync_job",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
        misfire_grace_time=300,
    )
    _scheduler.start()
    logger.info("Calendar scheduler started (interval=%s minutes)", interval_minutes)
    return _scheduler


def shutdown_calendar_scheduler() -> None:
    global _scheduler

    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("Calendar scheduler stopped")
