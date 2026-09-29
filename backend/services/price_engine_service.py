from __future__ import annotations

from datetime import date, datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import Iterable, Optional


ELIGIBLE_PROPERTY_TYPES = {"villa", "homestay", "home_stay", "home stay"}
DATE_RULE_TYPES = {"SEASON", "CUSTOM"}


def property_type_key(property_dict: dict) -> str:
    values = [
        property_dict.get("property_type"),
        property_dict.get("property_subtype"),
        property_dict.get("type"),
        property_dict.get("configuration"),
    ]
    for value in values:
        key = str(value or "").strip().lower().replace("-", "_")
        if key in ELIGIBLE_PROPERTY_TYPES:
            return "homestay" if key in {"homestay", "home_stay", "home stay"} else "villa"
    return ""


def is_eligible_property(property_dict: dict) -> bool:
    return bool(property_type_key(property_dict))


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


def adjustment_for(rule: dict, target_date: date) -> float:
    day_values = rule.get("day_adjustments") or {}
    raw = day_values.get(str(target_date.weekday()), rule.get("adjustment_percentage", 0))
    value = float(raw or 0)
    return -value if str(rule.get("adjustment_type") or "INCREASE").upper() == "DECREASE" else value


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
    percentage = adjustment_for(rule, on_date) if rule else 0.0
    amount = Decimal(str(original)) * (Decimal("1") + Decimal(str(percentage)) / Decimal("100"))
    final = max(Decimal("0"), amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return {
        "date": on_date.isoformat(),
        "base_price": original,
        "final_price": float(final),
        "adjustment_percentage": percentage,
        "rule_id": rule.get("rule_id") if rule else None,
        "rule_name": rule.get("rule_name") if rule else "Base",
        "rule_type": rule.get("rule_type") if rule else "BASE",
    }


async def property_rules(db, property_id: str, include_inactive: bool = False) -> list[dict]:
    query = {"property_id": property_id}
    if not include_inactive:
        query["is_active"] = True
    return await db.property_price_rules.find(query, {"_id": 0}).to_list(length=1000)


async def calculate_property_price(db, property_dict: dict, target_date) -> dict:
    rules = await property_rules(db, property_dict.get("property_id"))
    return calculate_price(property_dict, target_date, rules)


async def calculate_stay_price(db, property_dict: dict, check_in, check_out) -> dict:
    start = parse_date(check_in)
    end = parse_date(check_out)
    rules = await property_rules(db, property_dict.get("property_id"))
    nights = []
    cursor = start
    while cursor < end:
        nights.append(calculate_price(property_dict, cursor, rules))
        cursor += timedelta(days=1)
    total = round(sum(item["final_price"] for item in nights), 2)
    return {"total": total, "nights": nights, "average_nightly_price": round(total / len(nights), 2) if nights else base_price(property_dict)}


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

