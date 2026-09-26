from datetime import date, datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status

from middleware.auth_middleware import get_current_user
from models.price_engine import BulkPriceUpdate, PriceCalculationRequest, PriceRuleCreate, PriceRuleUpdate, PropertyPriceRule
from services.price_engine_service import (
    base_price, calculate_price, calculate_property_price, is_eligible_property,
    overlapping_date_rules, property_rules, property_type_key,
)

router = APIRouter(prefix="/v1/price-engine", tags=["Price Engine"])


async def get_db():
    from server import db_instance
    return db_instance


def require_price_user(user: dict):
    if str(user.get("role") or "").lower() not in {"admin", "host"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")


def is_admin(user: dict) -> bool:
    return str(user.get("role") or "").lower() == "admin"


async def eligible_properties(db, user: dict) -> list[dict]:
    query = {} if is_admin(user) else {"owner_id": user.get("user_id")}
    records = await db.properties.find(query, {"_id": 0}).to_list(length=5000)
    return [item for item in records if is_eligible_property(item)]


async def ensure_property_access(db, user: dict, property_id: str) -> dict:
    query = {"property_id": property_id}
    if not is_admin(user):
        query["owner_id"] = user.get("user_id")
    prop = await db.properties.find_one(query, {"_id": 0})
    if not prop or not is_eligible_property(prop):
        raise HTTPException(status_code=404, detail="Eligible property not found")
    return prop


def rule_status(rule: dict, today: date) -> str:
    if not rule.get("is_active", True):
        return "disabled"
    if rule.get("start_date") and rule["start_date"] > today.isoformat():
        return "upcoming"
    if rule.get("end_date") and rule["end_date"] < today.isoformat():
        return "expired"
    return "active"


async def add_history(db, user, property_id, title, reason, adjustment=0):
    await db.price_history.insert_one({
        "history_id": f"hist_{uuid4().hex[:12]}", "property_id": property_id,
        "property_title": title, "reason": reason, "adjustment_percentage": adjustment,
        "updated_by": user.get("full_name") or user.get("email") or "Admin",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@router.get("/properties")
async def list_properties(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    today = date.today()
    output = []
    for prop in await eligible_properties(db, current_user):
        rules = await property_rules(db, prop.get("property_id"), include_inactive=True)
        current = calculate_price(prop, today, rules)
        active = [rule for rule in rules if rule_status(rule, today) == "active"]
        upcoming = [rule for rule in rules if rule_status(rule, today) == "upcoming"]
        weekend = next((rule for rule in active if rule.get("rule_type") == "WEEKEND"), None)
        seasonal = next((rule for rule in active + upcoming if rule.get("rule_type") in {"SEASON", "CUSTOM"}), None)
        output.append({
            "property_id": prop.get("property_id"), "title": prop.get("title") or "Untitled property",
            "category": property_type_key(prop), "city": prop.get("city") or "", "state": prop.get("state") or "",
            "base_price": base_price(prop), "today_price": current["final_price"], "current_rule": current,
            "weekend_adjustment": (weekend or {}).get("adjustment_percentage", 0),
            "season_adjustment": (seasonal or {}).get("adjustment_percentage", 0),
            "active_rule_count": len(active), "upcoming_rule_count": len(upcoming),
            "pricing_status": "active" if active else "upcoming" if upcoming else "no_rules",
        })
    return output


@router.get("/rules")
async def list_rules(property_id: Optional[str] = None, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    if property_id:
        await ensure_property_access(db, current_user, property_id)
        query = {"property_id": property_id}
    elif is_admin(current_user):
        query = {}
    else:
        ids = [prop["property_id"] for prop in await eligible_properties(db, current_user)]
        query = {"property_id": {"$in": ids}}
    rules = await db.property_price_rules.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=5000)
    today = date.today()
    return [{**rule, "status": rule_status(rule, today)} for rule in rules]


async def validate_targets(db, property_ids: list[str], user: dict) -> list[dict]:
    unique_ids = list(dict.fromkeys(property_ids))
    query = {"property_id": {"$in": unique_ids}}
    if not is_admin(user):
        query["owner_id"] = user.get("user_id")
    records = await db.properties.find(query, {"_id": 0}).to_list(length=5000)
    records = [item for item in records if is_eligible_property(item)]
    if len(records) != len(unique_ids):
        raise HTTPException(status_code=400, detail="Price Engine is available only for Villas and Homestays")
    return records


@router.post("/rules", status_code=201)
async def create_rule(payload: PriceRuleCreate, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    if not payload.property_ids:
        raise HTTPException(status_code=400, detail="Choose at least one property")
    properties = await validate_targets(db, payload.property_ids, current_user)
    created = []
    candidates = []
    conflicts = []
    for prop in properties:
        data = payload.model_dump(exclude={"property_ids"})
        data["property_id"] = prop["property_id"]
        rule = PropertyPriceRule(**data).model_dump(mode="json")
        existing = await property_rules(db, prop["property_id"], include_inactive=True)
        overlaps = overlapping_date_rules(rule, existing)
        if overlaps:
            conflicts.append({"property_id": prop["property_id"], "property_title": prop.get("title"), "rules": [item.get("rule_name") for item in overlaps]})
        candidates.append((prop, rule))
    # Validate the entire bulk operation before writing so a conflict cannot
    # leave only some selected properties updated.
    if conflicts:
        raise HTTPException(status_code=409, detail={"message": "Two seasonal pricing rules overlap on these dates.", "conflicts": conflicts})
    for prop, rule in candidates:
        await db.property_price_rules.insert_one(rule)
        await add_history(db, current_user, prop["property_id"], prop.get("title"), f'{rule["rule_name"]} pricing created', rule["adjustment_percentage"])
        created.append(rule)
    return {"created_count": len(created), "rules": created}


@router.patch("/rules/{rule_id}")
async def update_rule(rule_id: str, payload: PriceRuleUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    current = await db.property_price_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    await ensure_property_access(db, current_user, current["property_id"])
    changes = payload.model_dump(exclude_none=True, mode="json")
    candidate = {**current, **changes, "updated_at": datetime.now(timezone.utc).isoformat()}
    overlaps = overlapping_date_rules(candidate, await property_rules(db, current["property_id"], True), rule_id)
    if overlaps:
        raise HTTPException(status_code=409, detail="Two seasonal pricing rules overlap on these dates.")
    await db.property_price_rules.update_one({"rule_id": rule_id}, {"$set": changes | {"updated_at": candidate["updated_at"]}})
    prop = await db.properties.find_one({"property_id": current["property_id"]}, {"_id": 0})
    if "is_active" in changes:
        action = "started" if changes["is_active"] else "stopped"
        reason = f'{candidate["rule_name"]} pricing {action}'
    else:
        reason = f'{candidate["rule_name"]} pricing updated'
    await add_history(db, current_user, current["property_id"], (prop or {}).get("title"), reason, candidate["adjustment_percentage"])
    return candidate


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    current = await db.property_price_rules.find_one({"rule_id": rule_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    await ensure_property_access(db, current_user, current["property_id"])
    await db.property_price_rules.delete_one({"rule_id": rule_id})
    prop = await db.properties.find_one({"property_id": current["property_id"]}, {"_id": 0})
    await add_history(db, current_user, current["property_id"], (prop or {}).get("title"), f'{current["rule_name"]} pricing deleted')
    return {"message": "Pricing rule deleted"}


@router.get("/calendar/{property_id}")
async def price_calendar(property_id: str, month: str = Query(..., pattern=r"^\d{4}-\d{2}$"), current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    prop = await ensure_property_access(db, current_user, property_id)
    year, number = [int(part) for part in month.split("-")]
    cursor = date(year, number, 1)
    next_month = date(year + (number == 12), 1 if number == 12 else number + 1, 1)
    rules = await property_rules(db, property_id)
    days = []
    while cursor < next_month:
        days.append(calculate_price(prop, cursor, rules))
        cursor += timedelta(days=1)
    return {"property_id": property_id, "property_title": prop.get("title"), "month": month, "days": days}


@router.post("/bulk-update")
async def bulk_update(payload: BulkPriceUpdate, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    properties = await validate_targets(db, payload.property_ids, current_user)
    factor = 1 + ((payload.adjustment_percentage if payload.adjustment_type.value == "INCREASE" else -payload.adjustment_percentage) / 100)
    changed = []
    for prop in properties:
        old = base_price(prop)
        new = round(max(0, old * factor), 2)
        changes = {"price_per_night": new, "updated_at": datetime.now(timezone.utc)}
        if prop.get("base_price") not in (None, ""):
            changes["base_price"] = new
        await db.properties.update_one({"property_id": prop["property_id"]}, {"$set": changes})
        await add_history(db, current_user, prop["property_id"], prop.get("title"), "Base pricing updated", payload.adjustment_percentage if factor >= 1 else -payload.adjustment_percentage)
        changed.append({"property_id": prop["property_id"], "old_price": old, "new_price": new})
    return {"updated_count": len(changed), "properties": changed}


@router.post("/reset")
async def reset_rules(property_ids: list[str], current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    await validate_targets(db, property_ids, current_user)
    result = await db.property_price_rules.delete_many({"property_id": {"$in": property_ids}})
    return {"message": "Pricing rules reset", "deleted_count": getattr(result, "deleted_count", 0)}


@router.post("/calculate")
async def calculate(payload: PriceCalculationRequest, current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    prop = await ensure_property_access(db, current_user, payload.property_id)
    return await calculate_property_price(db, prop, payload.date)


@router.get("/history")
async def recent_history(current_user: dict = Depends(get_current_user), db=Depends(get_db)):
    require_price_user(current_user)
    query = {}
    if not is_admin(current_user):
        ids = [prop["property_id"] for prop in await eligible_properties(db, current_user)]
        query = {"property_id": {"$in": ids}}
    return await db.price_history.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=20)
