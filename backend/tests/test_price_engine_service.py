from datetime import date

import asyncio

from routes.property_routes import _add_dynamic_property_price
from services.price_engine_service import calculate_booking_base_price, calculate_price, is_eligible_property, overlapping_date_rules


PROPERTY = {"property_id": "p1", "property_type": "villa", "price_per_night": 8000}


def test_all_supported_property_categories_are_eligible():
    assert is_eligible_property({"property_type": "Villa"})
    assert is_eligible_property({"property_subtype": "Homestay"})
    assert is_eligible_property({"property_type": "apartment", "category": "residential"})
    assert is_eligible_property({"property_type": "meeting_room", "category": "commercial"})
    assert is_eligible_property({"property_type": "banquet_hall", "category": "event_venue"})
    assert not is_eligible_property({"property_type": "vehicle", "category": "transport"})


def test_season_has_priority_over_weekend_and_base_is_unchanged():
    rules = [
        {"rule_id": "weekend", "rule_type": "WEEKEND", "rule_name": "Weekend", "days_of_week": [5, 6], "day_adjustments": {"5": 20, "6": 15}, "adjustment_percentage": 0, "is_active": True, "priority": 200},
        {"rule_id": "diwali", "rule_type": "SEASON", "rule_name": "Diwali", "start_date": "2026-10-20", "end_date": "2026-10-25", "adjustment_type": "INCREASE", "adjustment_percentage": 40, "is_active": True, "priority": 100},
    ]
    result = calculate_price(PROPERTY, date(2026, 10, 24), rules)
    assert result["final_price"] == 11200
    assert result["rule_id"] == "diwali"
    assert PROPERTY["price_per_night"] == 8000


def test_weekend_automatically_stops_after_the_day():
    rules = [{"rule_id": "weekend", "rule_type": "WEEKEND", "rule_name": "Weekend", "days_of_week": [5, 6], "day_adjustments": {"5": 20, "6": 15}, "adjustment_percentage": 0, "is_active": True}]
    assert calculate_price(PROPERTY, "2026-10-24", rules)["final_price"] == 9600
    assert calculate_price(PROPERTY, "2026-10-25", rules)["final_price"] == 9200
    assert calculate_price(PROPERTY, "2026-10-26", rules)["final_price"] == 8000


def test_season_expires_without_reset_and_decrease_is_supported():
    rules = [{"rule_id": "low", "rule_type": "CUSTOM", "rule_name": "Low season", "start_date": "2026-10-20", "end_date": "2026-10-25", "adjustment_type": "DECREASE", "adjustment_percentage": 25, "is_active": True}]
    assert calculate_price(PROPERTY, "2026-10-22", rules)["final_price"] == 6000
    assert calculate_price(PROPERTY, "2026-10-26", rules)["final_price"] == 8000


def test_overlap_is_detected_without_compounding():
    existing = [{"rule_id": "a", "rule_type": "SEASON", "start_date": "2026-10-20", "end_date": "2026-10-25", "is_active": True}]
    candidate = {"rule_id": "b", "rule_type": "CUSTOM", "start_date": "2026-10-25", "end_date": "2026-10-28", "is_active": True}
    assert [rule["rule_id"] for rule in overlapping_date_rules(candidate, existing)] == ["a"]


def test_property_api_projection_uses_effective_price_without_mutating_base():
    class Cursor:
        async def to_list(self, length=None):
            return [{"rule_id": "season", "property_id": "p1", "rule_type": "SEASON", "rule_name": "Diwali", "start_date": "2026-09-24", "end_date": "2026-09-30", "adjustment_type": "INCREASE", "adjustment_percentage": 20, "is_active": True}]

    class Rules:
        def find(self, query, projection=None):
            return Cursor()

    class DB:
        property_price_rules = Rules()

    response_property = dict(PROPERTY)
    asyncio.run(_add_dynamic_property_price(DB(), response_property, "2026-09-24"))
    assert response_property["base_price_per_night"] == 8000
    assert response_property["effective_price_per_night"] == 9600
    assert response_property["price_per_night"] == 9600
    assert PROPERTY["price_per_night"] == 8000


def test_event_venue_pricing_includes_both_selected_dates():
    class Cursor:
        async def to_list(self, length=None):
            return [{"rule_id": "event", "property_id": "e1", "rule_type": "SEASON", "rule_name": "Wedding Season", "start_date": "2026-10-01", "end_date": "2026-10-31", "adjustment_type": "INCREASE", "adjustment_percentage": 25, "is_active": True}]

    class Rules:
        def find(self, query, projection=None):
            return Cursor()

    class DB:
        property_price_rules = Rules()

    venue = {"property_id": "e1", "category": "event_venue", "property_type": "banquet_hall", "price_per_night": 10000}
    result = asyncio.run(calculate_booking_base_price(DB(), venue, "2026-10-10", "2026-10-11", 2))
    assert result["total"] == 25000
    assert len(result["nights"]) == 2


def test_hourly_commercial_pricing_adjusts_unit_rate_before_multiplying_hours():
    class Cursor:
        async def to_list(self, length=None):
            return [{"rule_id": "busy", "property_id": "c1", "rule_type": "CUSTOM", "rule_name": "Busy Hours", "start_date": "2026-10-10", "end_date": "2026-10-10", "adjustment_type": "INCREASE", "adjustment_percentage": 20, "is_active": True}]

    class Rules:
        def find(self, query, projection=None):
            return Cursor()

    class DB:
        property_price_rules = Rules()

    office = {"property_id": "c1", "category": "commercial", "property_type": "meeting_room", "pricing_cycle": "hourly", "price_per_night": 1000}
    result = asyncio.run(calculate_booking_base_price(DB(), office, "2026-10-10", "2026-10-10", 3))
    assert result["average_nightly_price"] == 1200
    assert result["total"] == 3600


def test_flat_amount_adjustment_supported():
    rules_increase = [{"rule_id": "flat_inc", "rule_type": "SEASON", "rule_name": "Flat Peak", "start_date": "2026-10-01", "end_date": "2026-10-05", "adjustment_type": "INCREASE", "adjustment_unit": "FLAT", "adjustment_amount": 2000, "is_active": True}]
    res_inc = calculate_price(PROPERTY, "2026-10-02", rules_increase)
    assert res_inc["final_price"] == 10000
    assert res_inc["adjustment_amount"] == 2000
    assert res_inc["adjustment_unit"] == "FLAT"

    rules_decrease = [{"rule_id": "flat_dec", "rule_type": "SEASON", "rule_name": "Flat Off", "start_date": "2026-10-01", "end_date": "2026-10-05", "adjustment_type": "DECREASE", "adjustment_unit": "FLAT", "adjustment_amount": 1500, "is_active": True}]
    res_dec = calculate_price(PROPERTY, "2026-10-02", rules_decrease)
    assert res_dec["final_price"] == 6500
    assert res_dec["adjustment_amount"] == -1500
    assert res_dec["adjustment_unit"] == "FLAT"

