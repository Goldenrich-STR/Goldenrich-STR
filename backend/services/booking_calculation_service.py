from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from services.tds_service import calculate_host_payout_tds

logger = logging.getLogger(__name__)

BOOKING_PAYMENT_CONFIG_KEY = "booking_payment_config"
DEFAULT_BOOKING_GST_PERCENT = 0.0

PERCENTAGE = "percentage"
FIXED = "fixed"
BOOKING_CHARGE_KEYS = [
    "platform_fee",
    "payment_gateway_charge",
    "convenience_fee",
    "insurance_fee",
    "cleaning_fee",
    "extra_guest_fee",
]

CHARGE_LABELS = {
    "platform_fee": "Platform Fee",
    "payment_gateway_charge": "Payment Gateway Charge",
    "convenience_fee": "Convenience Fee",
    "insurance_fee": "Insurance Fee",
    "cleaning_fee": "Cleaning Fee",
    "extra_guest_fee": "Extra Guest Fee",
    "platform_commission": "Platform Commission",
    "gateway_charge": "Gateway Charges",
}

PLATFORM_FEE_CONTEXT_DEFAULT = "default"
PLATFORM_FEE_CONTEXT_BROKER = "broker_mapped"
PLATFORM_FEE_CONTEXT_RM = "rm_mapped"
PLATFORM_FEE_CONTEXTS = {
    PLATFORM_FEE_CONTEXT_DEFAULT,
    PLATFORM_FEE_CONTEXT_BROKER,
    PLATFORM_FEE_CONTEXT_RM,
}


def money(value: Any) -> Decimal:
    try:
        amount = Decimal(str(value if value is not None and value != "" else 0))
    except (InvalidOperation, ValueError):
        amount = Decimal("0")
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def as_float(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _first_money(*values: Any) -> Decimal:
    for value in values:
        amount = money(value)
        if amount != Decimal("0.00"):
            return amount
    return Decimal("0.00")


def _nested_first(data: Dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in data and data.get(key) not in (None, ""):
            return data.get(key)
    return None


def _snapshot_source(booking: Dict[str, Any]) -> Dict[str, Any]:
    source: Dict[str, Any] = {}
    for key in ("pricing", "pricing_snapshot", "pricing_breakdown", "breakdown"):
        value = booking.get(key)
        if isinstance(value, dict):
            source.update(value)
    for key, value in booking.items():
        if key not in source and key not in {"pricing", "pricing_snapshot", "pricing_breakdown", "breakdown"}:
            source[key] = value
    return source


def _charge_map_amount(value: Any) -> Decimal:
    if isinstance(value, dict):
        return _first_money(
            value.get("amount"),
            value.get("amount_rupees"),
            value.get("applied_amount"),
            value.get("total"),
        )
    return money(value)


def extract_booking_pricing_snapshot(booking: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize booking pricing values for finance and payout displays.

    Booking payout must use the persisted booking pricing snapshot, not current
    property pricing or current platform settings. Amounts returned here are in
    rupees. Percentage/rate config values are intentionally ignored.
    """
    booking = booking or {}
    pricing = _snapshot_source(booking)

    units = int(money(
        _nested_first(pricing, "pricing_units", "nights", "number_of_nights")
        or booking.get("pricing_units")
        or booking.get("nights")
        or booking.get("number_of_nights")
        or 1
    ))
    units = max(1, units)

    unit_host_price = _first_money(
        pricing.get("unit_host_price"),
        pricing.get("host_price_per_night"),
        booking.get("unit_host_price"),
        booking.get("host_price_per_night"),
        booking.get("price_per_night"),
    )
    host_actual = _first_money(
        pricing.get("host_actual_value"),
        pricing.get("host_amount"),
        pricing.get("host_base_amount"),
        booking.get("host_actual_value"),
        booking.get("host_amount"),
        booking.get("host_base_amount"),
    )
    if host_actual == Decimal("0.00") and unit_host_price != Decimal("0.00"):
        host_actual = unit_host_price * units
    if host_actual == Decimal("0.00"):
        # Last-resort fallback for legacy rows only. New code must persist
        # host_amount/host_actual_value so customer subtotal is not mistaken
        # for the host base value.
        host_actual = money(booking.get("base_amount") or 0)

    def charge_amount(key: str, *aliases: str) -> Decimal:
        names = (key, *aliases)
        nested_maps = (
            pricing.get("extra_charges"),
            pricing.get("customer_charge_breakdown"),
            pricing.get("charge_breakdown"),
            pricing.get("applied_charges"),
            booking.get("extra_charges"),
            booking.get("customer_charge_breakdown"),
            booking.get("charge_breakdown"),
            booking.get("applied_charges"),
        )
        for charge_map in nested_maps:
            if not isinstance(charge_map, dict):
                continue
            for name in names:
                if name in charge_map:
                    amount = _charge_map_amount(charge_map.get(name))
                    if amount != Decimal("0.00"):
                        return amount

        amount_suffixes = (
            "_amount",
            "_total",
            "_charge_amount",
            "_fee_amount",
            "_applied_amount",
        )
        values = []
        for name in names:
            for suffix in amount_suffixes:
                amount_key = f"{name}{suffix}"
                values.append(pricing.get(amount_key))
                values.append(booking.get(amount_key))
        return _first_money(*values)

    extra_charges = {
        "platform_fee": charge_amount("platform_fee", "service_fee"),
        "gateway_charge": charge_amount("gateway_charge", "payment_gateway_charge"),
        "convenience_fee": charge_amount("convenience_fee"),
        "insurance_fee": charge_amount("insurance_fee"),
        "cleaning_fee": charge_amount("cleaning_fee"),
        "extra_guest_fee": charge_amount("extra_guest_fee"),
        "company_charge": charge_amount("company_charge"),
    }
    total_extra_charges = sum(extra_charges.values(), Decimal("0.00"))
    if total_extra_charges == Decimal("0.00"):
        total_extra_charges = _first_money(
            pricing.get("total_extra_charges"),
            pricing.get("total_extra_charges_amount"),
            booking.get("total_extra_charges"),
            booking.get("total_extra_charges_amount"),
        )

    gst_amount = _first_money(
        pricing.get("gst_amount"),
        pricing.get("taxes"),
        pricing.get("tax_amount"),
        booking.get("gst_amount"),
        booking.get("taxes"),
        booking.get("tax_amount"),
    )
    discount_amount = _first_money(
        pricing.get("discount_amount"),
        pricing.get("customer_discount_amount"),
        booking.get("discount_amount"),
        booking.get("customer_discount_amount"),
    )
    customer_final = _first_money(
        pricing.get("customer_final_payable"),
        pricing.get("total_amount"),
        booking.get("customer_final_payable"),
        booking.get("total_amount"),
    )
    if total_extra_charges == Decimal("0.00") and customer_final != Decimal("0.00"):
        derived_extra_charges = customer_final - host_actual - gst_amount + discount_amount
        if derived_extra_charges > Decimal("0.00"):
            total_extra_charges = derived_extra_charges
            if not any(value > Decimal("0.00") for value in extra_charges.values()):
                extra_charges["company_charge"] = derived_extra_charges
    if customer_final == Decimal("0.00"):
        customer_final = host_actual + total_extra_charges + gst_amount - discount_amount

    return {
        "host_actual_value": as_float(host_actual),
        "extra_charges": {key: as_float(value) for key, value in extra_charges.items()},
        "total_extra_charges": as_float(total_extra_charges),
        "gst_amount": as_float(gst_amount),
        "customer_discount_amount": as_float(discount_amount),
        "customer_final_payable": as_float(customer_final),
        "pricing_units": units,
        "pricing_currency": booking.get("currency") or pricing.get("currency") or "INR",
        "pricing_version": pricing.get("pricing_version") or booking.get("pricing_version") or 1,
    }


def _default_platform_fee_percent() -> float:
    try:
        value = float(os.getenv("BOOKING_PLATFORM_FEE_PERCENT", "0"))
    except ValueError:
        value = 0.0
    return max(0.0, min(100.0, value))


async def ensure_booking_tax_slabs_table(db: AsyncIOMotorDatabase) -> None:
    ensure_table = getattr(db, "ensure_table", None)
    if ensure_table:
        try:
            await ensure_table("booking_tax_slabs")
        except Exception as exc:
            logger.warning("Could not ensure booking_tax_slabs table: %s", exc)


async def ensure_platform_settings_table(db: AsyncIOMotorDatabase) -> None:
    ensure_table = getattr(db, "ensure_table", None)
    if ensure_table:
        try:
            await ensure_table("platform_settings")
        except Exception as exc:
            logger.warning("Could not ensure platform_settings table: %s", exc)


def _sanitize_type(value: Any) -> str:
    allowed = {PERCENTAGE, FIXED}
    value = str(value or "").strip().lower()
    return value if value in allowed else PERCENTAGE


def _sanitize_charge(key: str, raw: Optional[Dict[str, Any]], *, default_enabled: bool = False) -> Dict[str, Any]:
    raw = raw or {}
    charge_type = _sanitize_type(raw.get("charge_type") or raw.get("type") or (PERCENTAGE if key == "platform_fee" else FIXED))
    default_value = _default_platform_fee_percent() if key == "platform_fee" else 0
    value = money(raw.get("value", raw.get("percent", default_value)))
    if value < 0:
        value = Decimal("0")
    if charge_type == PERCENTAGE and value > 100:
        value = Decimal("100")
    return {
        "enabled": bool(raw.get("enabled", default_enabled)),
        "charge_type": charge_type,
        "value": as_float(value),
        "label": (raw.get("label") or CHARGE_LABELS.get(key) or key.replace("_", " ").title()).strip(),
    }


def _sanitize_platform_fee_overrides(raw: Optional[Dict[str, Any]], platform_fee: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    raw = raw or {}
    base_value = platform_fee["value"] if platform_fee.get("charge_type") == PERCENTAGE else _default_platform_fee_percent()
    defaults = {
        PLATFORM_FEE_CONTEXT_BROKER: {
            "enabled": True,
            "charge_type": PERCENTAGE,
            "value": base_value,
            "label": "Broker Mapped Platform Fee",
        },
        PLATFORM_FEE_CONTEXT_RM: {
            "enabled": True,
            "charge_type": PERCENTAGE,
            "value": base_value,
            "label": "RM Mapped Platform Fee",
        },
    }
    overrides: Dict[str, Dict[str, Any]] = {}
    for key, default in defaults.items():
        override = _sanitize_charge("platform_fee", {**default, **dict(raw.get(key) or {})}, default_enabled=False)
        override["charge_type"] = PERCENTAGE
        override["label"] = (raw.get(key) or {}).get("label") or default["label"]
        overrides[key] = override
    return overrides


def _sanitize_commission_rules(raw: Optional[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    raw = raw or {}
    defaults = {
        "broker": {"label": "Broker Commission"},
        "employee": {"label": "RM / Employee Commission"},
        "branch_manager": {"label": "Branch Manager Commission"},
    }
    rules: Dict[str, Dict[str, Any]] = {}
    for key, default in defaults.items():
        rule = _sanitize_charge(
            key,
            {**default, **dict(raw.get(key) or {})},
            default_enabled=False,
        )
        rule["charge_type"] = PERCENTAGE
        rule["label"] = (raw.get(key) or {}).get("label") or default["label"]
        rules[key] = rule
    return rules


def normalize_booking_payment_config(config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    config = config or {}
    legacy_percent = config.get("platform_fee_percent", _default_platform_fee_percent())
    legacy_label = config.get("platform_fee_label") or CHARGE_LABELS["platform_fee"]

    raw_charges = dict(config.get("charges") or {})
    raw_platform = dict(raw_charges.get("platform_fee") or {})
    raw_platform.setdefault("enabled", True)
    raw_platform.setdefault("charge_type", PERCENTAGE)
    raw_platform.setdefault("value", legacy_percent)
    raw_platform.setdefault("label", legacy_label)
    raw_charges["platform_fee"] = raw_platform

    charges = {
        key: _sanitize_charge(key, raw_charges.get(key), default_enabled=(key == "platform_fee"))
        for key in BOOKING_CHARGE_KEYS
    }

    host_payout = dict(config.get("host_payout") or {})
    for payout_key in ("platform_commission", "gateway_charge"):
        raw_payout = dict(host_payout.get(payout_key) or {})
        raw_payout.setdefault("charge_type", PERCENTAGE if payout_key == "platform_commission" else FIXED)
        host_payout[payout_key] = raw_payout
    payout_config = {
        "platform_commission": _sanitize_charge("platform_commission", host_payout.get("platform_commission"), default_enabled=True),
        "gateway_charge": _sanitize_charge("gateway_charge", host_payout.get("gateway_charge"), default_enabled=False),
    }
    payout_config["platform_commission"]["label"] = "Platform Commission"
    payout_config["gateway_charge"]["label"] = "Gateway Charges"
    payout_config["company_charge"] = {
        "enabled": False,
        "charge_type": FIXED,
        "value": 0.0,
        "label": "Company Charges (Deprecated)",
        "deprecated": True,
    }
    payout_config["tds"] = {
        "enabled": False,
        "charge_type": PERCENTAGE,
        "value": 0.0,
        "label": "TDS (Managed in TDS Configuration)",
        "deprecated": True,
    }

    platform_fee = charges["platform_fee"]
    platform_fee_overrides = _sanitize_platform_fee_overrides(config.get("platform_fee_overrides"), platform_fee)
    commission_rules = _sanitize_commission_rules(config.get("commission_rules"))
    return {
        **{k: v for k, v in config.items() if k not in {"charges", "coupon_discount", "host_payout", "commission_rules"}},
        "platform_fee_percent": platform_fee["value"] if platform_fee["charge_type"] == PERCENTAGE else 0,
        "platform_fee_label": platform_fee["label"],
        "platform_fee_overrides": platform_fee_overrides,
        "commission_rules": commission_rules,
        "charges": charges,
        "host_payout": payout_config,
    }


async def get_booking_payment_config(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    await ensure_platform_settings_table(db)
    try:
        config = await db.platform_settings.find_one({"key": BOOKING_PAYMENT_CONFIG_KEY}, {"_id": 0}) or {}
    except Exception as exc:
        logger.warning("Could not load booking payment config, using defaults: %s", exc)
        config = {}
    return normalize_booking_payment_config(config)


async def get_active_booking_tax_slab(db: AsyncIOMotorDatabase, taxable_amount: float) -> Dict[str, Any]:
    await ensure_booking_tax_slabs_table(db)
    amount = max(0.0, float(taxable_amount or 0))
    try:
        slabs = await db.booking_tax_slabs.find({"is_active": True}, {"_id": 0}).sort("from_amount", 1).to_list(length=500)
    except Exception as exc:
        logger.warning("Could not load booking tax slabs, using default GST: %s", exc)
        slabs = []

    for slab in slabs:
        try:
            start = float(slab.get("from_amount") or 0)
            raw_end = slab.get("to_amount")
            end = None if raw_end in (None, "") else float(raw_end)
            gst = float(slab.get("gst_percent") if slab.get("gst_percent") is not None else DEFAULT_BOOKING_GST_PERCENT)
        except (TypeError, ValueError):
            continue
        if amount >= start and (end is None or amount <= end):
            return {
                "slab_id": slab.get("slab_id"),
                "from_amount": start,
                "to_amount": end,
                "gst_percent": max(0.0, gst),
                "status": "active",
            }

    return {
        "slab_id": "default_booking_gst",
        "from_amount": 0.0,
        "to_amount": None,
        "gst_percent": DEFAULT_BOOKING_GST_PERCENT,
        "status": "default",
    }


def calculate_configured_charge(base: Decimal, config: Dict[str, Any]) -> Decimal:
    if not config.get("enabled", False):
        return Decimal("0.00")
    value = money(config.get("value"))
    if config.get("charge_type") == PERCENTAGE:
        return money(base * value / Decimal("100"))
    return value


def resolve_platform_fee_charge(config: Dict[str, Any], context: Optional[str] = None) -> Dict[str, Any]:
    charge_config = dict(config["charges"]["platform_fee"])
    context = context if context in PLATFORM_FEE_CONTEXTS else PLATFORM_FEE_CONTEXT_DEFAULT
    override = dict((config.get("platform_fee_overrides") or {}).get(context) or {})
    if context != PLATFORM_FEE_CONTEXT_DEFAULT and override.get("enabled"):
        charge_config.update({
            "enabled": True,
            "charge_type": PERCENTAGE,
            "value": override.get("value", charge_config.get("value", 0)),
            "label": override.get("label") or charge_config.get("label") or CHARGE_LABELS["platform_fee"],
        })
    charge_config["context"] = context
    return charge_config


def calculate_configured_charges_total(
    base: Decimal,
    config: Dict[str, Any],
    *,
    legacy_service_fee_percent: Optional[float] = None,
    platform_fee_context: Optional[str] = None,
) -> Decimal:
    total = Decimal("0.00")
    for key in BOOKING_CHARGE_KEYS:
        charge_config = dict(config["charges"][key])
        if key == "platform_fee":
            charge_config = resolve_platform_fee_charge(config, platform_fee_context)
        if key == "platform_fee" and legacy_service_fee_percent is not None:
            charge_config["enabled"] = True
            charge_config["charge_type"] = PERCENTAGE
            charge_config["value"] = max(0.0, min(100.0, float(legacy_service_fee_percent or 0)))
        total += calculate_configured_charge(base, charge_config)
    return money(total)


async def calculate_booking_breakdown(
    db: AsyncIOMotorDatabase,
    host_amount: float,
    *,
    coupon_discount: float = 0,
    coupon_code: Optional[str] = None,
    legacy_service_fee_percent: Optional[float] = None,
    tax_slab_base_amount: Optional[float] = None,
    pricing_units: Optional[int] = 1,
    extra_guest_amount: float = 0,
    platform_fee_context: Optional[str] = None,
) -> Dict[str, Any]:
    config = await get_booking_payment_config(db)
    host_price = money(host_amount)
    host_extra_guest_fee = money(extra_guest_amount)
    if host_extra_guest_fee < 0:
        host_extra_guest_fee = Decimal("0.00")
    units = max(1, int(pricing_units or 1))
    unit_host_price = money(tax_slab_base_amount if tax_slab_base_amount is not None else (host_price / Decimal(units)))

    charges = []
    total_charges = Decimal("0.00")
    for key in BOOKING_CHARGE_KEYS:
        charge_config = dict(config["charges"][key])
        if key == "platform_fee":
            charge_config = resolve_platform_fee_charge(config, platform_fee_context)
        if key == "platform_fee" and legacy_service_fee_percent is not None:
            charge_config["enabled"] = True
            charge_config["charge_type"] = PERCENTAGE
            charge_config["value"] = max(0.0, min(100.0, float(legacy_service_fee_percent or 0)))
        unit_amount = calculate_configured_charge(unit_host_price, charge_config)
        amount = money(unit_amount * Decimal(units))
        total_charges += amount
        charges.append({
            "key": key,
            "label": charge_config["label"],
            "enabled": bool(charge_config.get("enabled")),
            "charge_type": charge_config["charge_type"],
            "rate": charge_config["value"] if charge_config["charge_type"] == PERCENTAGE else None,
            "value": charge_config["value"],
            "context": charge_config.get("context"),
            "unit_amount": as_float(unit_amount),
            "amount": as_float(amount),
        })

    subtotal_before_discount = money(host_price + total_charges + host_extra_guest_fee)
    discount = money(coupon_discount)
    if discount < 0:
        discount = Decimal("0.00")
    if discount > subtotal_before_discount:
        discount = subtotal_before_discount

    taxable = money(subtotal_before_discount - discount)
    unit_charges_total = money(calculate_configured_charges_total(
        unit_host_price,
        config,
        legacy_service_fee_percent=legacy_service_fee_percent,
        platform_fee_context=platform_fee_context,
    ))
    final_nightly_price = money(unit_host_price + unit_charges_total)
    # GST slab selection is based on the customer-facing nightly price after
    # configured per-night charges. The GST amount is still applied to the full
    # taxable booking subtotal, so longer stays do not push the booking into a
    # higher nightly tax slab.
    slab_basis = final_nightly_price
    if slab_basis <= 0:
        slab_basis = taxable
    slab = await get_active_booking_tax_slab(db, as_float(slab_basis))
    gst_percent = money(slab.get("gst_percent"))
    gst_amount = money(taxable * gst_percent / Decimal("100"))
    total = money(taxable + gst_amount)

    amounts_by_key = {row["key"]: money(row["amount"]) for row in charges}
    platform_fee = amounts_by_key.get("platform_fee", Decimal("0.00"))
    platform_config = next((row for row in charges if row["key"] == "platform_fee"), {})

    return {
        "base_amount": as_float(host_price),
        "host_amount": as_float(host_price),
        "charges": charges,
        "service_fee": as_float(platform_fee),
        "service_fee_percent": platform_config.get("rate") or 0,
        "payment_gateway_charge": as_float(amounts_by_key.get("payment_gateway_charge", Decimal("0.00"))),
        "convenience_fee": as_float(amounts_by_key.get("convenience_fee", Decimal("0.00"))),
        "insurance_fee": as_float(amounts_by_key.get("insurance_fee", Decimal("0.00"))),
        "cleaning_fee": as_float(amounts_by_key.get("cleaning_fee", Decimal("0.00"))),
        "extra_guest_fee": as_float(host_extra_guest_fee + amounts_by_key.get("extra_guest_fee", Decimal("0.00"))),
        "host_extra_guest_fee": as_float(host_extra_guest_fee),
        "subtotal_before_discount": as_float(subtotal_before_discount),
        "final_nightly_price": as_float(final_nightly_price),
        "pricing_units": units,
        "coupon_code": coupon_code,
        "discount_amount": as_float(discount),
        "taxable_amount": as_float(taxable),
        "tax_slab_base_amount": as_float(unit_host_price),
        "tax_slab_basis_amount": as_float(slab_basis),
        "taxes": as_float(gst_amount),
        "gst_amount": as_float(gst_amount),
        "tax_percent": as_float(gst_percent),
        "gst_percent": as_float(gst_percent),
        "tax_slab_id": slab.get("slab_id"),
        "tax_slab": slab,
        "total_amount": as_float(total),
        "calculated_at": datetime.now(timezone.utc).isoformat(),
    }


async def calculate_host_payout_breakdown(
    db: Any,
    *,
    booking: Dict[str, Any],
) -> Dict[str, Any]:
    """Calculate host payout from persisted booking pricing values.

    Payout amounts are returned in paise because the payout ledger and RazorpayX
    integration use paise.
    """
    pricing_snapshot = extract_booking_pricing_snapshot(booking)
    gross_rupees = money(pricing_snapshot.get("host_actual_value") or 0)
    extra_charges = pricing_snapshot.get("extra_charges") or {}
    customer_charge_breakdown = {
        "platform_fee": int(money(extra_charges.get("platform_fee")) * 100),
        "gateway_charge": int(money(extra_charges.get("gateway_charge")) * 100),
        "convenience_fee": int(money(extra_charges.get("convenience_fee")) * 100),
        "insurance_fee": int(money(extra_charges.get("insurance_fee")) * 100),
        "cleaning_fee": int(money(extra_charges.get("cleaning_fee")) * 100),
        "extra_guest_fee": int(money(extra_charges.get("extra_guest_fee")) * 100),
        "company_charge": int(money(extra_charges.get("company_charge")) * 100),
        "customer_gst": int(money(pricing_snapshot.get("gst_amount")) * 100),
    }

    deductions = []

    host_id = (
        booking.get("host_id")
        or booking.get("owner_id")
        or booking.get("host_user_id")
        or booking.get("owner")
        or booking.get("user_id")
        or ""
    )
    booking_id = booking.get("booking_id") or booking.get("id") or booking.get("transaction_id")
    transaction_date = booking.get("created_at") or booking.get("booking_date") or booking.get("check_in") or datetime.now(timezone.utc).isoformat()
    tds_breakdown = await calculate_host_payout_tds(
        db,
        host_id=host_id,
        booking_id=booking_id,
        gross_booking_value=as_float(gross_rupees),
        transaction_date=transaction_date,
        payout_id=booking.get("payout_id"),
    )
    tds_amount = money(tds_breakdown.get("tds_amount"))
    deductions.append({
        "key": "tds",
        "label": f"TDS ({tds_breakdown.get('provision_code') or 'Section 194-O'})",
        "enabled": bool(tds_breakdown.get("enabled")),
        "charge_type": PERCENTAGE,
        "rate": tds_breakdown.get("rate_percent") or 0,
        "amount": as_float(tds_amount),
        "breakdown": tds_breakdown,
    })

    net_rupees = max(Decimal("0.00"), gross_rupees - tds_amount)

    return {
        "gross_amount": int(gross_rupees * 100),
        "host_actual_value_amount": int(gross_rupees * 100),
        "total_extra_charges_amount": int(money(pricing_snapshot.get("total_extra_charges")) * 100),
        "customer_final_payable_amount": int(money(pricing_snapshot.get("customer_final_payable")) * 100),
        "customer_charge_breakdown": customer_charge_breakdown,
        "platform_fee": customer_charge_breakdown["platform_fee"],
        "gateway_charge": customer_charge_breakdown["gateway_charge"],
        "company_charge": customer_charge_breakdown["company_charge"],
        "tds_amount": int(tds_amount * 100),
        "net_amount": int(net_rupees * 100),
        "deductions": deductions,
        "tds_breakdown": tds_breakdown,
    }
