"""Transform read-only Lodgify calendars into XSpace360 calendar-preview data."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def _dates(start: date, end: date):
    cursor = start
    while cursor <= end:
        yield cursor
        cursor += timedelta(days=1)


def _parse_date(value: Any) -> date | None:
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def build_calendar_preview(
    *,
    xspace_property_id: str,
    lodgify_property_id: int,
    room_type_id: int,
    start: date,
    end: date,
    availability: dict | list,
    rates: dict,
) -> dict:
    warnings: list[str] = []
    daily: dict[str, dict] = {
        day.isoformat(): {
            "date": day.isoformat(),
            "available": None,
            "available_units": None,
            "closed_period": None,
            "nightly_rate": None,
            "currency": None,
            "min_stay": None,
            "max_stay": None,
            "price_options": [],
        }
        for day in _dates(start, end)
    }

    availability_records = availability if isinstance(availability, list) else [availability]
    matching_availability = [
        item
        for item in availability_records
        if isinstance(item, dict)
        and str(item.get("property_id")) == str(lodgify_property_id)
        and str(item.get("room_type_id")) == str(room_type_id)
    ]
    if len(matching_availability) == 1:
        availability_record = matching_availability[0]
    elif len(matching_availability) > 1:
        availability_record = {"periods": []}
        warnings.append("Lodgify returned duplicate availability records for the mapped room type")
    elif len(availability_records) == 1 and isinstance(availability_records[0], dict):
        availability_record = availability_records[0]
        warnings.append("Lodgify availability response did not identify the mapped property and room type")
    else:
        availability_record = {"periods": []}
        warnings.append("Lodgify did not return availability for the mapped room type")

    for period in availability_record.get("periods") or []:
        period_start = _parse_date(period.get("start"))
        period_end = _parse_date(period.get("end"))
        if not period_start or not period_end or period_end < period_start:
            warnings.append("Lodgify returned an invalid availability period")
            continue
        units = period.get("available")
        closed = period.get("closed_period")
        for day in _dates(max(start, period_start), min(end, period_end)):
            key = day.isoformat()
            if key not in daily:
                continue
            try:
                numeric_units = int(units) if units is not None else None
            except (TypeError, ValueError):
                numeric_units = None
            daily[key]["available_units"] = numeric_units
            daily[key]["closed_period"] = closed
            daily[key]["available"] = (
                numeric_units > 0 and closed is None if numeric_units is not None else None
            )

    rate_settings = rates.get("rate_settings") or {}
    currency = rate_settings.get("currency_code") or None
    calendar_items = rates.get("calendar_items") or []
    default_item = next((item for item in calendar_items if item.get("date") is None and item.get("is_default")), None)

    def normalized_prices(item: dict | None) -> list[dict]:
        result = []
        for price in (item or {}).get("prices") or []:
            amount = price.get("price_per_day")
            result.append(
                {
                    "nightly_rate": amount,
                    "currency": currency,
                    "min_stay": price.get("min_stay"),
                    "max_stay": price.get("max_stay"),
                    "additional_guest_rate": price.get("price_per_additional_guest"),
                    "additional_guests_from": price.get("additional_guests_starts_from"),
                }
            )
        return result

    default_prices = normalized_prices(default_item)
    for item in calendar_items:
        item_date = _parse_date(item.get("date"))
        if not item_date:
            continue
        key = item_date.isoformat()
        if key not in daily:
            continue
        options = normalized_prices(item)
        daily[key]["price_options"] = options
        daily[key]["currency"] = currency
        if len(options) == 1:
            daily[key]["nightly_rate"] = options[0]["nightly_rate"]
            daily[key]["min_stay"] = options[0]["min_stay"]
            daily[key]["max_stay"] = options[0]["max_stay"]
        elif len(options) > 1:
            warnings.append(f"Multiple Lodgify price options exist for {key}; nightly_rate was left ambiguous")

    unavailable_dates = [key for key, value in daily.items() if value["available"] is False]
    unknown_availability_dates = [key for key, value in daily.items() if value["available"] is None]
    missing_rate_dates = [key for key, value in daily.items() if not value["price_options"]]
    if unknown_availability_dates:
        warnings.append("Lodgify did not return availability for every requested date")
    if missing_rate_dates:
        warnings.append("Lodgify did not return a dated rate for every requested date")
    if not currency:
        warnings.append("Lodgify did not return a currency code")

    events = []
    for key in unavailable_dates:
        value = daily[key]
        events.append(
            {
                "event_id": f"lodgify_{room_type_id}_{key}",
                "property_id": xspace_property_id,
                "title": "Lodgify unavailable",
                "start_date": key,
                "end_date": key,
                "source": "external",
                "source_id": f"lodgify:{lodgify_property_id}:{room_type_id}",
                "color": "#F59E0B",
                "details": {
                    "provider": "lodgify",
                    "available_units": value["available_units"],
                    "closed_period": value["closed_period"],
                },
            }
        )

    return {
        "read_only": True,
        "writes_performed": 0,
        "property_id": xspace_property_id,
        "provider": "lodgify",
        "mapping": {
            "lodgify_property_id": str(lodgify_property_id),
            "lodgify_room_type_id": str(room_type_id),
        },
        "range": {"start": start.isoformat(), "end": end.isoformat(), "inclusive": True},
        "timezone": None,
        "timezone_status": "not_provided_by_lodgify_response",
        "date_semantics": "Lodgify date-only property calendar",
        "currency": currency,
        "rate_settings": {
            "check_in_hour": rate_settings.get("check_in_hour"),
            "check_out_hour": rate_settings.get("check_out_hour"),
            "bookability": rate_settings.get("bookability"),
        },
        "default_rate_options": default_prices,
        "daily": list(daily.values()),
        "events": events,
        "total_events": len(events),
        "unavailable_dates": unavailable_dates,
        "unknown_availability_dates": unknown_availability_dates,
        "missing_rate_dates": missing_rate_dates,
        "warnings": list(dict.fromkeys(warnings)),
    }
