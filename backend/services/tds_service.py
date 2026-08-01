from __future__ import annotations

import logging
import re
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_CEILING, ROUND_FLOOR, ROUND_HALF_UP
from typing import Any, Dict, Optional, Tuple
from uuid import uuid4

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

PAN_PATTERN = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")
ROUNDING_METHODS = {"NEAREST_RUPEE", "TWO_DECIMAL", "FLOOR", "CEIL"}
ENTITY_TYPES_WITH_THRESHOLD = {"individual", "huf"}
TDS_TABLES = [
    "tds_configurations",
    "host_tax_profiles",
    "host_financial_year_summaries",
    "host_payout_ledger",
]


def money(value: Any) -> Decimal:
    try:
        amount = Decimal(str(value if value not in (None, "") else 0))
    except (InvalidOperation, ValueError):
        amount = Decimal("0")
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def as_float(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_utc() -> date:
    return datetime.now(timezone.utc).date()


def parse_date(value: Any, default: Optional[date] = None) -> Optional[date]:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str) and value.strip():
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
        except ValueError:
            try:
                return datetime.strptime(value[:10], "%Y-%m-%d").date()
            except ValueError:
                return default
    return default


def financial_year_bounds(transaction_date: Any = None) -> Tuple[date, date, str]:
    target = parse_date(transaction_date, today_utc()) or today_utc()
    start_year = target.year if target.month >= 4 else target.year - 1
    start = date(start_year, 4, 1)
    end = date(start_year + 1, 3, 31)
    return start, end, f"{start.year}-{str(end.year)[-2:]}"


async def ensure_tds_tables(db: AsyncIOMotorDatabase) -> None:
    ensure_table = getattr(db, "ensure_table", None)
    if not ensure_table:
        return
    for table in TDS_TABLES:
        try:
            await ensure_table(table)
        except Exception as exc:
            logger.warning("Could not ensure %s table: %s", table, exc)


def _percent(value: Any, default: float = 0.0, max_value: float = 100.0) -> float:
    amount = money(value if value not in (None, "") else default)
    if amount < 0:
        amount = Decimal("0")
    if amount > Decimal(str(max_value)):
        amount = Decimal(str(max_value))
    return as_float(amount)


def _thresholds(raw: Optional[Dict[str, Any]] = None) -> Dict[str, float]:
    raw = raw or {}
    return {
        "individual_huf": as_float(max(Decimal("0"), money(raw.get("individual_huf", 500000)))),
        "other_entity": as_float(max(Decimal("0"), money(raw.get("other_entity", 0)))),
    }


def default_tds_config() -> Dict[str, Any]:
    fy_start, _, _ = financial_year_bounds()
    timestamp = now_iso()
    return {
        "config_id": "tds_default",
        "is_enabled": True,
        "is_current": True,
        "provision_code": "Section 194-O",
        "standard_rate": 0.10,
        "calculation_base": "GROSS_BOOKING_VALUE",
        "financial_year_start_month": 4,
        "effective_from": fy_start.isoformat(),
        "effective_to": None,
        "rounding_method": "NEAREST_RUPEE",
        "thresholds": {"individual_huf": 500000.0, "other_entity": 0.0},
        "pan_aadhaar_required": True,
        "missing_pan_rate": 20.0,
        "version": 1,
        "created_at": timestamp,
        "updated_at": timestamp,
        "created_by": "system",
        "updated_by": "system",
    }


def normalize_tds_config(raw: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    base = default_tds_config()
    raw = raw or {}
    config = {**base, **raw}
    config["is_enabled"] = bool(config.get("is_enabled", True))
    config["is_current"] = bool(config.get("is_current", True))
    config["provision_code"] = str(config.get("provision_code") or "Section 194-O").strip() or "Section 194-O"
    config["standard_rate"] = _percent(config.get("standard_rate"), 0.10)
    config["calculation_base"] = "GROSS_BOOKING_VALUE"
    config["financial_year_start_month"] = 4
    config["rounding_method"] = str(config.get("rounding_method") or "NEAREST_RUPEE").upper()
    if config["rounding_method"] not in ROUNDING_METHODS:
        config["rounding_method"] = "NEAREST_RUPEE"
    effective_from = parse_date(config.get("effective_from"), parse_date(base["effective_from"]))
    effective_to = parse_date(config.get("effective_to"))
    config["effective_from"] = effective_from.isoformat() if effective_from else base["effective_from"]
    config["effective_to"] = effective_to.isoformat() if effective_to else None
    config["thresholds"] = _thresholds(config.get("thresholds"))
    config["pan_aadhaar_required"] = bool(config.get("pan_aadhaar_required", True))
    config["missing_pan_rate"] = _percent(config.get("missing_pan_rate"), 20.0)
    return config


async def get_active_tds_config(db: AsyncIOMotorDatabase, transaction_date: Any = None) -> Dict[str, Any]:
    await ensure_tds_tables(db)
    target = parse_date(transaction_date, today_utc()) or today_utc()
    try:
        configs = await db.tds_configurations.find({"is_current": True}, {"_id": 0}).sort("version", -1).to_list(50)
    except Exception as exc:
        logger.warning("Could not load TDS config, using defaults: %s", exc)
        configs = []

    for config in configs:
        normalized = normalize_tds_config(config)
        start = parse_date(normalized.get("effective_from"), date.min) or date.min
        end = parse_date(normalized.get("effective_to"), date.max) or date.max
        if start <= target <= end:
            return normalized
    return normalize_tds_config(configs[0] if configs else None)


async def save_tds_config(db: AsyncIOMotorDatabase, payload: Dict[str, Any], current_user: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    await ensure_tds_tables(db)
    config = normalize_tds_config(payload)
    effective_from = parse_date(config.get("effective_from"))
    effective_to = parse_date(config.get("effective_to"))
    if effective_to and effective_from and effective_to < effective_from:
        raise ValueError("Effective To date cannot be before Effective From date")

    existing = await db.tds_configurations.find({"is_current": True}, {"_id": 0}).sort("version", -1).to_list(1)
    previous_version = int((existing[0] or {}).get("version") or 0) if existing else 0
    timestamp = now_iso()
    actor_id = current_user.get("user_id") if isinstance(current_user, dict) else (current_user or "system")
    config.update({
        "config_id": f"tds_{uuid4().hex[:14]}",
        "version": previous_version + 1,
        "is_current": True,
        "created_at": timestamp,
        "updated_at": timestamp,
        "created_by": actor_id,
        "updated_by": actor_id,
    })
    await db.tds_configurations.update_many({"is_current": True}, {"$set": {"is_current": False, "updated_at": timestamp}})
    await db.tds_configurations.insert_one(config)
    return {k: v for k, v in config.items() if k != "_id"}


def _pan_status(profile: Dict[str, Any]) -> str:
    explicit = str(profile.get("pan_status") or "").lower()
    if explicit in {"verified", "valid"}:
        return "valid"
    if explicit in {"invalid", "rejected"}:
        return "invalid"
    pan = str(profile.get("pan") or "").strip().upper()
    if not pan:
        return "missing"
    return "valid" if PAN_PATTERN.match(pan) else "invalid"


async def get_host_tax_profile(db: AsyncIOMotorDatabase, host_id: str) -> Dict[str, Any]:
    await ensure_tds_tables(db)
    profile = await db.host_tax_profiles.find_one({"host_id": host_id}, {"_id": 0}) or {}
    user = await db.users.find_one({"user_id": host_id}, {"_id": 0}) or {}
    merged = {
        "host_id": host_id,
        "legal_entity_type": profile.get("legal_entity_type") or user.get("legal_entity_type") or "individual",
        "residential_status": profile.get("residential_status") or user.get("residential_status") or "resident",
        "legal_business_name": profile.get("legal_business_name") or user.get("full_name") or user.get("name") or "",
        "pan": profile.get("pan") or user.get("pan") or "",
        "aadhaar": profile.get("aadhaar") or user.get("aadhaar") or "",
        "gstin": profile.get("gstin") or user.get("gstin") or "",
        **profile,
    }
    merged["pan_status"] = _pan_status(merged)
    return merged


async def _fy_gross_before(db: AsyncIOMotorDatabase, host_id: str, fy_label: str, booking_id: Optional[str], payout_id: Optional[str]) -> Decimal:
    total = Decimal("0.00")
    summary = await db.host_financial_year_summaries.find_one({"host_id": host_id, "financial_year": fy_label}, {"_id": 0}) or {}
    summary_amount = money(summary.get("gross_booking_value") or summary.get("gross_amount") or summary.get("total_gross") or 0)
    try:
        ledger = await db.host_payout_ledger.find({"host_id": host_id, "financial_year": fy_label}, {"_id": 0}).to_list(10000)
        for row in ledger:
            if booking_id and row.get("booking_id") == booking_id:
                continue
            if payout_id and row.get("payout_id") == payout_id:
                continue
            total += money(row.get("gross_booking_value") or 0)
    except Exception as exc:
        logger.warning("Could not read host payout ledger for TDS summary: %s", exc)

    # Backward compatibility: older payout rows may not have a matching
    # host_payout_ledger entry yet. Count GST-excluded payout gross from those
    # rows too, so threshold checks remain correct after deployment.
    payout_total = Decimal("0.00")
    fy_start, fy_end, _ = financial_year_bounds(f"{fy_label[:4]}-04-01" if fy_label else None)
    try:
        payouts = await db.payouts.find(
            {"host_id": host_id},
            {"_id": 0, "payout_id": 1, "booking_id": 1, "gross_amount": 1, "eligible_at": 1, "created_at": 1},
        ).to_list(10000)
        for row in payouts:
            if booking_id and row.get("booking_id") == booking_id:
                continue
            if payout_id and row.get("payout_id") == payout_id:
                continue
            payout_date = parse_date(row.get("eligible_at") or row.get("created_at"))
            if payout_date and not (fy_start <= payout_date <= fy_end):
                continue
            # Payout model stores money fields in paise; ledger/config stores rupees.
            payout_total += money(money(row.get("gross_amount") or 0) / Decimal("100"))
    except Exception as exc:
        logger.warning("Could not read legacy payouts for TDS summary: %s", exc)

    return max(summary_amount, total, payout_total)


async def record_host_payout_tds_ledger(
    db: AsyncIOMotorDatabase,
    *,
    host_id: str,
    booking_id: str,
    payout_id: str,
    tds_breakdown: Dict[str, Any],
) -> None:
    """Persist host-wise FY gross/TDS movement for future threshold checks.

    Amounts are stored in rupees because the TDS configuration thresholds are
    rupee values. This ledger intentionally uses GST-excluded gross booking
    value, not the customer grand total.
    """
    if not host_id or not booking_id or not payout_id:
        return
    await ensure_tds_tables(db)
    fy_label = tds_breakdown.get("financial_year") or financial_year_bounds()[2]
    gross = money(tds_breakdown.get("gross_booking_value") or 0)
    tds_amount = money(tds_breakdown.get("tds_amount") or 0)
    timestamp = now_iso()
    row = {
        "host_id": host_id,
        "booking_id": booking_id,
        "payout_id": payout_id,
        "financial_year": fy_label,
        "gross_booking_value": as_float(gross),
        "tds_base_amount": as_float(money(tds_breakdown.get("tds_base_amount") or 0)),
        "tds_amount": as_float(tds_amount),
        "tds_rate_percent": tds_breakdown.get("rate_percent") or 0,
        "threshold_amount": tds_breakdown.get("threshold_amount") or 0,
        "threshold_crossed": bool(tds_breakdown.get("threshold_crossed")),
        "projected_fy_gross": tds_breakdown.get("projected_fy_gross") or as_float(gross),
        "updated_at": timestamp,
    }
    await db.host_payout_ledger.update_one(
        {"host_id": host_id, "booking_id": booking_id, "payout_id": payout_id},
        {"$set": row, "$setOnInsert": {"created_at": timestamp}},
        upsert=True,
    )

    ledger = await db.host_payout_ledger.find(
        {"host_id": host_id, "financial_year": fy_label},
        {"_id": 0, "gross_booking_value": 1, "tds_amount": 1},
    ).to_list(10000)
    fy_gross = sum((money(item.get("gross_booking_value") or 0) for item in ledger), Decimal("0.00"))
    fy_tds = sum((money(item.get("tds_amount") or 0) for item in ledger), Decimal("0.00"))
    await db.host_financial_year_summaries.update_one(
        {"host_id": host_id, "financial_year": fy_label},
        {"$set": {
            "host_id": host_id,
            "financial_year": fy_label,
            "gross_booking_value": as_float(fy_gross),
            "tds_amount": as_float(fy_tds),
            "updated_at": timestamp,
        }, "$setOnInsert": {"created_at": timestamp}},
        upsert=True,
    )


def _round_tds(amount: Decimal, method: str) -> Decimal:
    if method == "TWO_DECIMAL":
        return money(amount)
    if method == "FLOOR":
        return amount.to_integral_value(rounding=ROUND_FLOOR).quantize(Decimal("0.01"))
    if method == "CEIL":
        return amount.to_integral_value(rounding=ROUND_CEILING).quantize(Decimal("0.01"))
    return amount.to_integral_value(rounding=ROUND_HALF_UP).quantize(Decimal("0.01"))


async def calculate_host_payout_tds(
    db: AsyncIOMotorDatabase,
    *,
    host_id: str,
    booking_id: Optional[str],
    gross_booking_value: Any,
    transaction_date: Any,
    payout_id: Optional[str] = None,
) -> Dict[str, Any]:
    config = await get_active_tds_config(db, transaction_date)
    fy_start, fy_end, fy_label = financial_year_bounds(transaction_date)
    gross = max(Decimal("0.00"), money(gross_booking_value))
    profile = await get_host_tax_profile(db, host_id) if host_id else {"pan_status": "missing", "legal_entity_type": "unknown", "residential_status": "unknown"}
    prior = await _fy_gross_before(db, host_id, fy_label, booking_id, payout_id) if host_id else Decimal("0.00")
    projected = money(prior + gross)
    entity = str(profile.get("legal_entity_type") or "individual").lower()
    residential = str(profile.get("residential_status") or "resident").lower()
    threshold_key = "individual_huf" if entity in ENTITY_TYPES_WITH_THRESHOLD and residential == "resident" else "other_entity"
    threshold = money((config.get("thresholds") or {}).get(threshold_key, 0))
    threshold_crossed = projected > threshold
    warnings = []

    rate = money(config.get("standard_rate"))
    pan_status = profile.get("pan_status") or "missing"
    if config.get("pan_aadhaar_required") and pan_status != "valid":
        rate = money(config.get("missing_pan_rate"))
        warnings.append("PAN_MISSING_OR_INVALID")
    exemption_remaining_before = max(Decimal("0.00"), money(threshold - prior)) if threshold > 0 else Decimal("0.00")
    # TDS is calculated only on the host-entered booking value. Customer-side
    # charges and GST are excluded, and threshold only controls applicability.
    tds_base = gross

    if threshold > 0 and not threshold_crossed:
        rate = Decimal("0.00")
        warnings.append("TDS_THRESHOLD_NOT_CROSSED")
    if not config.get("is_enabled") or gross <= 0:
        rate = Decimal("0.00")
        if not config.get("is_enabled"):
            warnings.append("TDS_DISABLED")
    if gross <= 0:
        rate = Decimal("0.00")

    raw_tds = money(tds_base * rate / Decimal("100"))
    tds_amount = _round_tds(raw_tds, config.get("rounding_method") or "NEAREST_RUPEE")
    return {
        "enabled": bool(config.get("is_enabled")),
        "config_id": config.get("config_id"),
        "config_version": config.get("version"),
        "provision_code": config.get("provision_code"),
        "calculation_base": "GROSS_BOOKING_VALUE",
        "financial_year": fy_label,
        "fy_start": fy_start.isoformat(),
        "fy_end": fy_end.isoformat(),
        "host_id": host_id,
        "booking_id": booking_id,
        "payout_id": payout_id,
        "gross_booking_value": as_float(gross),
        "prior_fy_gross": as_float(prior),
        "projected_fy_gross": as_float(projected),
        "threshold_key": threshold_key,
        "threshold_amount": as_float(threshold),
        "threshold_crossed": threshold_crossed,
        "exemption_remaining_before": as_float(exemption_remaining_before),
        "tds_base_amount": as_float(tds_base),
        "standard_rate": as_float(money(config.get("standard_rate"))),
        "missing_pan_rate": as_float(money(config.get("missing_pan_rate"))),
        "rate_percent": as_float(rate),
        "raw_tds_amount": as_float(raw_tds),
        "tds_amount": as_float(tds_amount),
        "rounding_method": config.get("rounding_method"),
        "pan_aadhaar_required": bool(config.get("pan_aadhaar_required")),
        "pan_status": pan_status,
        "legal_entity_type": profile.get("legal_entity_type"),
        "residential_status": profile.get("residential_status"),
        "warnings": warnings,
        "calculated_at": now_iso(),
    }
