import asyncio
from datetime import datetime, timezone

from icalendar import Calendar

from routes.calendar_routes import _build_property_ical
from routes.booking_routes import _blocked_date_query
from services.calendar_sync_service import (
    _assert_public_calendar_url,
    _calendar_is_due,
    _parse_ical_events,
)


def _ical(*events: str) -> bytes:
    return ("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n" + "".join(events) + "END:VCALENDAR\r\n").encode()


def _event(uid: str, start: str, end: str, extra: str = "") -> str:
    return (
        "BEGIN:VEVENT\r\n"
        f"UID:{uid}\r\nDTSTART;VALUE=DATE:{start}\r\nDTEND;VALUE=DATE:{end}\r\n"
        f"{extra}SUMMARY:Reserved\r\nEND:VEVENT\r\n"
    )


def test_import_converts_exclusive_dtend_to_inclusive_block():
    events = _parse_ical_events(_ical(_event("ota-1", "20261010", "20261012")))
    assert events == [
        {
            "external_uid": "ota-1",
            "start_date": "2026-10-10",
            "end_date": "2026-10-11",
            "summary": "Reserved",
            "description": None,
        }
    ]


def test_import_ignores_cancelled_and_transparent_events():
    content = _ical(
        _event("cancelled", "20261010", "20261012", "STATUS:CANCELLED\r\n"),
        _event("transparent", "20261013", "20261014", "TRANSP:TRANSPARENT\r\n"),
    )
    assert _parse_ical_events(content) == []


def test_import_accepts_valid_one_day_event_without_dtend():
    content = _ical(
        "BEGIN:VEVENT\r\nUID:one-day\r\nDTSTART;VALUE=DATE:20261020\r\nSUMMARY:Reserved\r\nEND:VEVENT\r\n"
    )
    event = _parse_ical_events(content)[0]
    assert event["start_date"] == "2026-10-20"
    assert event["end_date"] == "2026-10-20"


def test_frequency_due_logic_honors_selected_interval():
    now = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
    record = {
        "sync_frequency": "Hourly",
        "last_synced_at": "2026-10-01T11:30:00+00:00",
    }
    assert _calendar_is_due(record, now) is False
    record["last_synced_at"] = "2026-10-01T10:59:59+00:00"
    assert _calendar_is_due(record, now) is True


def test_stay_checkout_is_exclusive_but_event_venue_end_is_inclusive():
    stay = _blocked_date_query("prop-1", "2026-10-10", "2026-10-12", "residential")
    venue = _blocked_date_query("prop-1", "2026-10-10", "2026-10-12", "event_venue")
    assert stay["start_date"] == {"$lt": "2026-10-12"}
    assert venue["start_date"] == {"$lte": "2026-10-12"}


def test_private_calendar_urls_are_rejected():
    for url in ("http://localhost/feed.ics", "http://127.0.0.1/feed.ics", "http://169.254.169.254/latest/meta-data"):
        try:
            asyncio.run(_assert_public_calendar_url(url))
        except ValueError as exc:
            assert "local or private" in str(exc)
        else:
            raise AssertionError(f"private URL was accepted: {url}")


class _Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, length):
        return self.rows[:length]


class _Collection:
    def __init__(self, rows):
        self.rows = rows
        self.last_query = None

    def find(self, query, projection):
        self.last_query = query
        return _Cursor(self.rows)


class _Db:
    def __init__(self):
        self.bookings = _Collection(
            [{"booking_id": "book-1", "check_in_date": "2026-10-10", "check_out_date": "2026-10-12"}]
        )
        self.blocked_dates = _Collection(
            [{
                "blocked_date_id": "block-1",
                "start_date": "2026-10-15",
                "end_date": "2026-10-17",
                "reason": "Owner stay",
            }]
        )


def test_export_uses_correct_exclusive_end_dates_and_omits_terminal_bookings():
    db = _Db()
    raw = asyncio.run(_build_property_ical("prop-1", {"title": "Villa", "category": "residential"}, db))
    events = {str(event.get("uid")): event for event in Calendar.from_ical(raw).walk("VEVENT")}

    assert events["book-1@x-space360.in"].decoded("dtend").isoformat() == "2026-10-12"
    assert events["block-1@x-space360.in"].decoded("dtend").isoformat() == "2026-10-18"
    assert db.bookings.last_query["booking_status"]["$nin"] == [
        "cancelled",
        "canceled",
        "rejected",
        "expired",
    ]
