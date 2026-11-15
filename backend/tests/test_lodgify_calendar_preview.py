from datetime import date

from services.lodgify_calendar_preview import build_calendar_preview


def test_calendar_preview_expands_inclusive_dates_and_marks_unavailable():
    result = build_calendar_preview(
        xspace_property_id="prop_demo",
        lodgify_property_id=860024,
        room_type_id=927213,
        start=date(2026, 10, 23),
        end=date(2026, 10, 25),
        availability=[{
            "property_id": 860024,
            "room_type_id": 927213,
            "periods": [
                {"start": "2026-10-23", "end": "2026-10-24", "available": 1, "closed_period": None},
                {"start": "2026-10-25", "end": "2026-10-25", "available": 0, "closed_period": None},
            ]
        }],
        rates={
            "rate_settings": {"currency_code": "INR", "check_in_hour": 14, "check_out_hour": 12},
            "calendar_items": [
                {"date": day, "is_default": False, "prices": [{"price_per_day": 4500, "min_stay": 1, "max_stay": 30}]}
                for day in ("2026-10-23", "2026-10-24", "2026-10-25")
            ],
        },
    )

    assert len(result["daily"]) == 3
    assert result["currency"] == "INR"
    assert result["timezone"] is None
    assert result["unavailable_dates"] == ["2026-10-25"]
    assert result["events"][0]["source"] == "external"
    assert result["daily"][0]["nightly_rate"] == 4500


def test_calendar_preview_reports_missing_and_ambiguous_values():
    result = build_calendar_preview(
        xspace_property_id="prop_demo",
        lodgify_property_id=860024,
        room_type_id=927213,
        start=date(2026, 10, 23),
        end=date(2026, 10, 24),
        availability={"periods": [{"start": "2026-10-23", "end": "2026-10-23", "available": 1}]},
        rates={
            "rate_settings": {},
            "calendar_items": [{
                "date": "2026-10-23",
                "prices": [{"price_per_day": 100}, {"price_per_day": 200}],
            }],
        },
    )

    assert result["daily"][0]["nightly_rate"] is None
    assert result["unknown_availability_dates"] == ["2026-10-24"]
    assert result["missing_rate_dates"] == ["2026-10-24"]
    assert result["currency"] is None
    assert result["warnings"]
    assert result["writes_performed"] == 0
