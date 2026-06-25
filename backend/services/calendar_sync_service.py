from __future__ import annotations

import logging
import uuid
from datetime import date, datetime, timezone
from typing import Any, Iterable

import requests
from icalendar import Calendar as ICalendar
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.calendar import BlockedDateSource

logger = logging.getLogger(__name__)

HTTP_TIMEOUT_SECONDS = 20
USER_AGENT = "X-Space360-CalendarSync/1.0"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _normalize_ical_url(url: str) -> str:
    if url.startswith("webcal://"):
        return "https://" + url[len("webcal://") :]
    return url


def _to_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return None


def _component_text(component: Any, field: str) -> str | None:
    value = component.get(field)
    return str(value) if value is not None else None


def _event_uid(component: Any) -> str | None:
    uid = _component_text(component, "uid")
    return uid.strip() if uid and uid.strip() else None


def _parse_ical_events(content: bytes) -> list[dict[str, str]]:
    calendar = ICalendar.from_ical(content)
    events: list[dict[str, str]] = []

    for component in calendar.walk("VEVENT"):
        start = _to_date(getattr(component.get("dtstart"), "dt", None))
        end = _to_date(getattr(component.get("dtend"), "dt", None))
        uid = _event_uid(component)

        if not uid or not start or not end:
            logger.debug("Skipping VEVENT without uid/start/end")
            continue

        events.append(
            {
                "external_uid": uid,
                "start_date": start.isoformat(),
                "end_date": end.isoformat(),
                "summary": _component_text(component, "summary") or "External Booking",
                "description": _component_text(component, "description"),
            }
        )

    return events


async def _insert_sync_log(
    db: AsyncIOMotorDatabase,
    sync_record: dict,
    status: str,
    message: str,
) -> None:
    await db.calendar_sync_logs.insert_one(
        {
            "log_id": f"sync_log_{uuid.uuid4().hex}",
            "property_id": sync_record.get("property_id"),
            "calendar_id": sync_record.get("calendar_id"),
            "platform": sync_record.get("platform") or sync_record.get("name"),
            "status": status,
            "message": message[:1000],
            "synced_at": _utcnow(),
        }
    )


async def _delete_stale_events(
    db: AsyncIOMotorDatabase,
    sync_record: dict,
    seen_uids: Iterable[str],
) -> int:
    seen = set(seen_uids)
    cursor = db.blocked_dates.find(
        {
            "property_id": sync_record["property_id"],
            "source": BlockedDateSource.EXTERNAL.value,
            "source_id": sync_record["calendar_id"],
        },
        {"_id": 0},
    )
    existing = await cursor.to_list(length=2000)

    removed = 0
    for item in existing:
        external_uid = item.get("external_uid")
        if not external_uid or external_uid not in seen:
            await db.blocked_dates.delete_one({"blocked_date_id": item["blocked_date_id"]})
            removed += 1
    return removed


async def _upsert_external_event(
    db: AsyncIOMotorDatabase,
    sync_record: dict,
    event: dict[str, str],
) -> None:
    now = _utcnow()
    query = {
        "property_id": sync_record["property_id"],
        "source": BlockedDateSource.EXTERNAL.value,
        "source_id": sync_record["calendar_id"],
        "external_uid": event["external_uid"],
    }
    update = {
        "$set": {
            "property_id": sync_record["property_id"],
            "owner_id": sync_record["owner_id"],
            "start_date": event["start_date"],
            "end_date": event["end_date"],
            "source": BlockedDateSource.EXTERNAL.value,
            "source_id": sync_record["calendar_id"],
            "external_uid": event["external_uid"],
            "event_type": "external_booking",
            "title": event["summary"],
            "reason": event["description"] or event["summary"],
            "updated_at": now,
        },
        "$setOnInsert": {
            "blocked_date_id": f"blocked_{uuid.uuid4().hex}",
            "created_at": now,
        },
    }
    await db.blocked_dates.update_one(query, update, upsert=True)


async def sync_single_calendar(
    sync_record: dict,
    db: AsyncIOMotorDatabase,
) -> dict[str, int | str]:
    calendar_id = sync_record.get("calendar_id")
    platform = sync_record.get("platform") or sync_record.get("name") or "external"

    if not sync_record.get("is_active", True):
        return {"status": "skipped", "created_or_updated": 0, "removed": 0}

    try:
        response = requests.get(
            _normalize_ical_url(sync_record["ical_url"]),
            timeout=HTTP_TIMEOUT_SECONDS,
            headers={"User-Agent": USER_AGENT, "Accept": "text/calendar,*/*"},
        )
        response.raise_for_status()

        events = _parse_ical_events(response.content)
        for event in events:
            await _upsert_external_event(db, sync_record, event)

        removed = await _delete_stale_events(
            db,
            sync_record,
            [event["external_uid"] for event in events],
        )

        now = _utcnow()
        await db.external_calendars.update_one(
            {"calendar_id": calendar_id},
            {
                "$set": {
                    "sync_status": "success",
                    "sync_error": None,
                    "last_synced_at": now,
                    "updated_at": now,
                }
            },
        )
        await _insert_sync_log(
            db,
            sync_record,
            "success",
            f"Synced {len(events)} {platform} events; removed {removed} stale events.",
        )
        logger.info(
            "Calendar sync success: calendar_id=%s platform=%s events=%s removed=%s",
            calendar_id,
            platform,
            len(events),
            removed,
        )
        return {"status": "success", "created_or_updated": len(events), "removed": removed}

    except Exception as exc:
        message = str(exc)
        now = _utcnow()
        await db.external_calendars.update_one(
            {"calendar_id": calendar_id},
            {
                "$set": {
                    "sync_status": "failed",
                    "sync_error": message,
                    "updated_at": now,
                }
            },
        )
        await _insert_sync_log(db, sync_record, "failed", message)
        logger.exception("Calendar sync failed: calendar_id=%s", calendar_id)
        raise


async def sync_calendar_by_id(calendar_id: str, db: AsyncIOMotorDatabase) -> dict[str, int | str]:
    sync_record = await db.external_calendars.find_one({"calendar_id": calendar_id}, {"_id": 0})
    if not sync_record:
        return {"status": "not_found", "created_or_updated": 0, "removed": 0}
    return await sync_single_calendar(sync_record, db)


async def sync_all_calendars(db: AsyncIOMotorDatabase) -> dict[str, int]:
    cursor = db.external_calendars.find({"is_active": True}, {"_id": 0})
    sync_records = await cursor.to_list(length=5000)

    stats = {"total": len(sync_records), "success": 0, "failed": 0, "skipped": 0}
    for sync_record in sync_records:
        try:
            result = await sync_single_calendar(sync_record, db)
            if result["status"] == "skipped":
                stats["skipped"] += 1
            else:
                stats["success"] += 1
        except Exception:
            stats["failed"] += 1

    logger.info("Calendar sync sweep complete: %s", stats)
    return stats
