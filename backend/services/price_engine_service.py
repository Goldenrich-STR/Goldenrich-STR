from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Optional


SUPPORTED_PROPERTY_CATEGORIES = {"residential", "commercial", "event_venue"}
PROPERTY_TYPE_CATEGORIES = {
    "apartment": "residential",
    "villa": "residential",
    "homestay": "residential",
    "home_stay": "residential",
    "bungalow": "residential",
    "studio": "residential",
    "independent_house": "residential",
    "farmhouse": "residential",
    "private_office": "commercial",
    "co_working": "commercial",
    "meeting_room": "commercial",
    "conference_room": "commercial",
    "shop": "commercial",
    "warehouse": "commercial",
    "banquet_hall": "event_venue",
    "hotel_ballroom": "event_venue",
    "wedding_venue": "event_venue",
    "rooftop": "event_venue",
    "resort": "event_venue",
}
DATE_RULE_TYPES = {"SEASON", "CUSTOM"}


def normalize_key(value) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def property_type_key(property_dict: dict) -> str:
    values = [
        property_dict.get("property_type"),
        property_dict.get("property_subtype"),
        property_dict.get("type"),
        property_dict.get("configuration"),
    ]
    for value in values:
        key = normalize_key(value)
        if key in PROPERTY_TYPE_CATEGORIES:
            return "homestay" if key == "home_stay" else key
    return ""


def property_category_key(property_dict: dict) -> str:
    category = normalize_key(property_dict.get("category"))
    if category in SUPPORTED_PROPERTY_CATEGORIES:
        return category
    return PROPERTY_TYPE_CATEGORIES.get(property_type_key(property_dict), "")


def is_eligible_property(property_dict: dict) -> bool:
    return bool(property_category_key(property_dict))


def base_price(property_dict: dict) -> float:
    raw = property_dict.get("base_price")
    if raw in (None, ""):
        raw = property_dict.get("price_per_night")
    try:
        return max(0.0, float(raw or 0))
    except (TypeError, ValueError):
        return 0.0


def parse_date(value) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    return datetime.strptime(str(value)[:10], "%Y-%m-%d").date()


def rule_applies(rule: dict, target_date: date) -> bool:
    if not rule.get("is_active", True):
        return False
    kind = str(rule.get("rule_type") or "").upper()
    if kind in DATE_RULE_TYPES:
        try:
            return parse_date(rule.get("start_date")) <= target_date <= parse_date(rule.get("end_date"))
        except (TypeError, ValueError):
            return False
    if kind == "WEEKEND":
        days = rule.get("days_of_week") or [5, 6]
        return target_date.weekday() in [int(day) for day in days]
    return False


def adjustment_for(rule: dict, target_date: date) -> tuple[float, str, float]:
    """Return (signed_percentage, adjustment_unit, signed_flat_amount)."""
    day_values = rule.get("day_adjustments") or {}
    unit = str(rule.get("adjustment_unit") or rule.get("value_type") or "PERCENTAGE").upper()
    adj_type = str(rule.get("adjustment_type") or "INCREASE").upper()
    sign = -1.0 if adj_type == "DECREASE" else 1.0

    if unit in {"FLAT", "AMOUNT", "RUPEES", "FIXED"}:
        raw_amt = float(day_values.get(str(target_date.weekday()), rule.get("adjustment_amount", 0)))
        return 0.0, "FLAT", sign * max(0.0, raw_amt)
    else:
        raw_pct = float(day_values.get(str(target_date.weekday()), rule.get("adjustment_percentage", 0)))
        return sign * max(0.0, raw_pct), "PERCENTAGE", 0.0


def select_rule(rules: Iterable[dict], target_date: date) -> Optional[dict]:
    applicable = [rule for rule in rules if rule_applies(rule, target_date)]
    date_rules = [rule for rule in applicable if str(rule.get("rule_type") or "").upper() in DATE_RULE_TYPES]
    if date_rules:
        return sorted(date_rules, key=lambda item: (int(item.get("priority") or 100), str(item.get("created_at") or "")))[0]
    weekends = [rule for rule in applicable if str(rule.get("rule_type") or "").upper() == "WEEKEND"]
    return sorted(weekends, key=lambda item: (int(item.get("priority") or 200), str(item.get("created_at") or "")))[0] if weekends else None


def calculate_price(property_dict: dict, target_date, rules: Iterable[dict]) -> dict:
    on_date = parse_date(target_date)
    original = base_price(property_dict)
    rule = select_rule(rules, on_date)
    if not rule:
        return {
            "date": on_date.isoformat(),
            "base_price": original,
            "final_price": original,
            "adjustment_percentage": 0.0,
            "adjustment_amount": 0.0,
            "adjustment_unit": "PERCENTAGE",
            "rule_id": None,
            "rule_name": "Base",
            "rule_type": "BASE",
        }

    pct, unit, flat_amt = adjustment_for(rule, on_date)
    if unit == "FLAT":
        final = max(Decimal("0"), Decimal(str(original)) + Decimal(str(flat_amt))).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        eff_pct = round((flat_amt / original * 100), 2) if original > 0 else 0.0
        return {
            "date": on_date.isoformat(),
            "base_price": original,
            "final_price": float(final),
            "adjustment_percentage": eff_pct,
            "adjustment_amount": flat_amt,
            "adjustment_unit": "FLAT",
            "rule_id": rule.get("rule_id"),
            "rule_name": rule.get("rule_name") if rule.get("rule_name") else "Seasonal Rule",
            "rule_type": rule.get("rule_type") if rule.get("rule_type") else "SEASON",
        }
    else:
        amount = Decimal(str(original)) * (Decimal("1") + Decimal(str(pct)) / Decimal("100"))
        final = max(Decimal("0"), amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        diff = float(final - Decimal(str(original)))
        return {
            "date": on_date.isoformat(),
            "base_price": original,
            "final_price": float(final),
            "adjustment_percentage": pct,
            "adjustment_amount": diff,
            "adjustment_unit": "PERCENTAGE",
            "rule_id": rule.get("rule_id"),
            "rule_name": rule.get("rule_name") if rule.get("rule_name") else "Seasonal Rule",
            "rule_type": rule.get("rule_type") if rule.get("rule_type") else "SEASON",
        }


async def property_rules(db, property_id: str, include_inactive: bool = False) -> list[dict]:
    query = {"property_id": property_id}
    if not include_inactive:
        query["is_active"] = True
    return await db.property_price_rules.find(query, {"_id": 0}).to_list(length=1000)


async def calculate_property_price(db, property_dict: dict, target_date) -> dict:
    rules = await property_rules(db, property_dict.get("property_id"))
    return calculate_price(property_dict, target_date, rules)


async def calculate_stay_price(db, property_dict: dict, check_in, check_out, include_end: bool = False) -> dict:
    start = parse_date(check_in)
    end = parse_date(check_out)
    rules = await property_rules(db, property_dict.get("property_id"))
    nights = []
    cursor = start
    while cursor < end or (include_end and cursor == end):
        nights.append(calculate_price(property_dict, cursor, rules))
        cursor += timedelta(days=1)
    total = round(sum(item["final_price"] for item in nights), 2)
    return {"total": total, "nights": nights, "average_nightly_price": round(total / len(nights), 2) if nights else base_price(property_dict)}


async def calculate_booking_base_price(db, property_dict: dict, check_in, check_out, units: float | None = None) -> dict:
    """Calculate the dynamic base charge using the listing's booking unit."""
    category = property_category_key(property_dict)
    cycle = normalize_key(property_dict.get("pricing_cycle") or "day")
    if category == "commercial" and cycle == "hourly":
        count = max(1.0, float(units or 1))
        start, end = parse_date(check_in), parse_date(check_out)
        day_count = max(1, (end - start).days + 1)
        units_per_day = count / day_count
        rules = await property_rules(db, property_dict.get("property_id"))
        prices = []
        cursor = start
        while cursor <= end:
            prices.append(calculate_price(property_dict, cursor, rules))
            cursor += timedelta(days=1)
        total = round(sum(item["final_price"] * units_per_day for item in prices), 2)
        return {
            "total": total,
            "nights": prices,
            "average_nightly_price": round(total / count, 2),
        }
    return await calculate_stay_price(
        db,
        property_dict,
        check_in,
        check_out,
        include_end=category == "event_venue",
    )


def overlapping_date_rules(candidate: dict, existing_rules: Iterable[dict], ignore_rule_id: str | None = None) -> list[dict]:
    if str(candidate.get("rule_type") or "").upper() not in DATE_RULE_TYPES or not candidate.get("is_active", True):
        return []
    start, end = parse_date(candidate.get("start_date")), parse_date(candidate.get("end_date"))
    overlaps = []
    for rule in existing_rules:
        if rule.get("rule_id") == ignore_rule_id or not rule.get("is_active", True):
            continue
        if str(rule.get("rule_type") or "").upper() not in DATE_RULE_TYPES:
            continue
        try:
            if start <= parse_date(rule.get("end_date")) and end >= parse_date(rule.get("start_date")):
                overlaps.append(rule)
        except (TypeError, ValueError):
            continue
    return overlaps
