from fastapi import APIRouter, HTTPException, status, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from models.booking import Booking, BookingCreate, BookingResponse, BookingStatus
from models.property import PropertyStatus
from middleware.auth_middleware import get_current_user
from services.razorpay_service import razorpay_service
from services.booking_notifications import (
    notify_host_booking_confirmed,
    schedule_soft_lock_reminder,
)
from services.audit_service import write_audit_log
from services.booking_calculation_service import (
    BOOKING_PAYMENT_CONFIG_KEY,
    DEFAULT_BOOKING_GST_PERCENT,
    PLATFORM_FEE_CONTEXT_BROKER,
    PLATFORM_FEE_CONTEXT_DEFAULT,
    PLATFORM_FEE_CONTEXT_RM,
    calculate_booking_breakdown,
    ensure_booking_tax_slabs_table,
    ensure_platform_settings_table,
    get_active_booking_tax_slab,
    get_booking_payment_config,
    normalize_booking_payment_config,
)
from datetime import datetime, timedelta, timezone
import asyncio
import json
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bookings", tags=["Bookings"])

INSTANT_BOOK_MODE = "INSTANT_BOOK"
HOST_APPROVAL_MODE = "HOST_APPROVAL"
HOST_APPROVAL_SLA_MINUTES = 24 * 60


def _normalize_booking_mode(property_dict: dict) -> str:
    return INSTANT_BOOK_MODE


def _approval_deadline(now: datetime) -> datetime:
    return now + timedelta(minutes=HOST_APPROVAL_SLA_MINUTES)


def _parse_utc(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


async def _safe_payment_attempt_update(db: AsyncIOMotorDatabase, query: dict, update: dict, *, upsert: bool = False) -> None:
    try:
        ensure_table = getattr(db, "ensure_table", None)
        if ensure_table:
            await ensure_table("payment_attempts")
        await db.payment_attempts.update_one(query, update, upsert=upsert)
    except Exception as attempt_err:
        logger.warning("Payment attempt audit write failed: %s", attempt_err)


def _event_policy_percent(property_dict: dict, key: str, default: float) -> float:
    if property_dict.get("category") != "event_venue":
        return default

    try:
        policies = json.loads(property_dict.get("house_rules") or "{}")
    except (TypeError, json.JSONDecodeError):
        policies = {}

    raw = policies.get(key)
    if raw is None or raw == "":
        return default

    try:
        percent = float(str(raw).replace("%", "").strip())
    except ValueError:
        return default

    if percent < 0 or percent > 100:
        return default

    return percent


def _active_booking_query(
    property_id: str,
    check_in_iso: str,
    check_out_iso: str,
    *,
    category: str = "",
    selected_slot: str | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    status_filter = {
        "$or": [
            {"booking_status": BookingStatus.CONFIRMED.value},
            {
                "booking_status": BookingStatus.SOFT_LOCK.value,
                "soft_lock_expires_at": {"$gt": now},
            },
        ]
    }

    if category == "event_venue" and selected_slot:
        return {
            "property_id": property_id,
            "selected_slot": selected_slot,
            "$and": [
                status_filter,
                {
                    "check_in_date": {"$lte": check_in_iso},
                    "check_out_date": {"$gte": check_in_iso},
                },
            ],
        }

    query = {
        "property_id": property_id,
        "$and": [
            status_filter,
            {
                "$or": [
                    {
                        "check_in_date": {"$lte": check_in_iso},
                        "check_out_date": {"$gt": check_in_iso},
                    },
                    {
                        "check_in_date": {"$lt": check_out_iso},
                        "check_out_date": {"$gte": check_out_iso},
                    },
                    {
                        "check_in_date": {"$gte": check_in_iso},
                        "check_out_date": {"$lte": check_out_iso},
                    },
                ]
            },
        ],
    }

    return query


class ConfirmPaymentRequest(BaseModel):
    booking_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


class BookingQuoteRequest(BaseModel):
    property_id: str
    check_in_date: str
    check_out_date: str
    number_of_guests: int = 1
    selected_slot: Optional[str] = None
    food_preference: Optional[str] = None
    payment_type: Optional[str] = "full"
    coupon_code: Optional[str] = None


class RetryPaymentResponse(BaseModel):
    booking_id: str
    status: str
    message: str
    razorpay_order_id: Optional[str] = None
    razorpay_key_id: Optional[str] = None
    amount: Optional[int] = None
    currency: str = "INR"


class BookingRejectRequest(BaseModel):
    reason: Optional[str] = None


async def get_db():
    from server import db_instance
    return db_instance

async def _ensure_booking_tax_slabs_table(db: AsyncIOMotorDatabase) -> None:
    await ensure_booking_tax_slabs_table(db)

async def _ensure_platform_settings_table(db: AsyncIOMotorDatabase) -> None:
    await ensure_platform_settings_table(db)

def _default_platform_fee_percent() -> float:
    try:
        value = float(os.getenv("BOOKING_PLATFORM_FEE_PERCENT", "0"))
    except ValueError:
        value = 0.0
    return max(0.0, min(100.0, value))


def _mapped_value(*values) -> bool:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized and normalized not in {"na", "n/a", "none", "null", "-"}:
                return True
        elif value:
            return True
    return False


def _is_rm_user(user: Optional[dict]) -> bool:
    user = user or {}
    role = str(user.get("role") or "").strip().lower()
    role_key = str(user.get("admin_role_key") or user.get("designation") or "").strip().lower()
    return role in {"rm", "relationship_manager"} or role_key in {"rm", "relationship_manager"} or "relationship manager" in role_key


def _is_broker_user(user: Optional[dict]) -> bool:
    user = user or {}
    role = str(user.get("role") or "").strip().lower()
    return role == "broker"


async def _resolve_platform_fee_context(db: AsyncIOMotorDatabase, property_dict: Optional[dict], owner: Optional[dict] = None) -> str:
    property_dict = property_dict or {}
    owner = owner or {}
    first_verifier_id = (
        property_dict.get("broker_id")
        or property_dict.get("managed_by_broker_id")
        or property_dict.get("created_by_user_id")
    )
    if _mapped_value(property_dict.get("broker_id")) and str(property_dict.get("broker_id")).strip() == str(property_dict.get("rm_id") or "").strip():
        return PLATFORM_FEE_CONTEXT_RM
    if (
        _mapped_value(property_dict.get("broker_id"), property_dict.get("rm_id"), property_dict.get("branch_manager_id"))
        and str(property_dict.get("rm_id")).strip() == str(property_dict.get("branch_manager_id")).strip()
        and str(property_dict.get("broker_id")).strip() != str(property_dict.get("rm_id")).strip()
    ):
        return PLATFORM_FEE_CONTEXT_RM
    if _mapped_value(property_dict.get("broker_id"), property_dict.get("branch_manager_id")) and not _mapped_value(property_dict.get("broker_lg_code"), property_dict.get("managed_by_broker_id")):
        verifier = await db.users.find_one({"user_id": property_dict.get("broker_id")}, {"_id": 0, "role": 1, "admin_role_key": 1, "designation": 1})
        if _is_rm_user(verifier):
            return PLATFORM_FEE_CONTEXT_RM
    if _mapped_value(first_verifier_id):
        verifier = await db.users.find_one({"user_id": first_verifier_id}, {"_id": 0, "role": 1, "admin_role_key": 1, "designation": 1})
        if _is_rm_user(verifier):
            return PLATFORM_FEE_CONTEXT_RM
        if _is_broker_user(verifier):
            return PLATFORM_FEE_CONTEXT_BROKER

    if _mapped_value(
        property_dict.get("broker_id"),
        property_dict.get("broker_lg_code"),
        property_dict.get("broker_code"),
        property_dict.get("assigned_broker_id"),
        owner.get("broker_id"),
        owner.get("broker_lg_code"),
        owner.get("lg_code"),
    ):
        return PLATFORM_FEE_CONTEXT_BROKER
    if _mapped_value(
        property_dict.get("rm_id"),
        property_dict.get("employee_id"),
        property_dict.get("assigned_employee_id"),
        property_dict.get("rm_code"),
        property_dict.get("employee_code"),
        owner.get("rm_id"),
        owner.get("employee_id"),
        owner.get("assigned_employee_id"),
        owner.get("employee_code"),
    ):
        return PLATFORM_FEE_CONTEXT_RM
    return PLATFORM_FEE_CONTEXT_DEFAULT

async def _get_booking_payment_config(db: AsyncIOMotorDatabase) -> dict:
    return await get_booking_payment_config(db)

async def _get_active_booking_tax_slab(db: AsyncIOMotorDatabase, taxable_amount: float) -> dict:
    return await get_active_booking_tax_slab(db, taxable_amount)

async def _property_has_booking_clearance(
    db: AsyncIOMotorDatabase,
    property_dict: dict,
    owner: Optional[dict],
) -> bool:
    """Live/admin-approved properties should remain bookable even if host KYC is stale."""
    if owner and (
        owner.get("kyc_status") == "approved"
        or owner.get("email") == "host@propnest.com"
    ):
        return True

    if property_dict.get("status") == PropertyStatus.LIVE.value:
        return True

    verification = await db.property_verifications.find_one(
        {"property_id": property_dict.get("property_id")},
        {"_id": 0, "status": 1, "admin_approved": 1, "approved_at": 1},
        sort=[("updated_at", -1), ("created_at", -1)],
    )
    if not verification:
        return False

    return (
        verification.get("status") in {"approved", "completed", "verified"}
        or verification.get("admin_approved") is True
        or bool(verification.get("approved_at"))
    )

async def _calculate_booking_pricing(
    db: AsyncIOMotorDatabase,
    taxable_amount: float,
    *,
    service_fee_percent: Optional[float] = None,
    coupon_discount: float = 0,
    coupon_code: Optional[str] = None,
    tax_slab_base_amount: Optional[float] = None,
    pricing_units: Optional[int] = 1,
    extra_guest_amount: float = 0,
    platform_fee_context: Optional[str] = None,
) -> dict:
    """Calculate booking charges through the centralized pricing engine."""
    return await calculate_booking_breakdown(
        db,
        taxable_amount,
        coupon_discount=coupon_discount,
        coupon_code=coupon_code,
        legacy_service_fee_percent=service_fee_percent,
        tax_slab_base_amount=tax_slab_base_amount,
        pricing_units=pricing_units,
        extra_guest_amount=extra_guest_amount,
        platform_fee_context=platform_fee_context,
    )

async def _build_booking_quote(
    db: AsyncIOMotorDatabase,
    payload: BookingQuoteRequest,
    current_user: dict,
) -> dict:
    property_dict = await db.properties.find_one(
        {"property_id": payload.property_id},
        {"_id": 0},
    )
    if not property_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    if property_dict.get("status") != PropertyStatus.LIVE.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Property is not available for booking")
    booking_mode = _normalize_booking_mode(property_dict)

    try:
        check_in = datetime.fromisoformat(payload.check_in_date).date()
        check_out = datetime.fromisoformat(payload.check_out_date).date()
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid booking dates")

    if check_in >= check_out and property_dict.get("category") != "event_venue":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Check-out date must be after check-in date")

    if int(payload.number_of_guests or 1) > int(property_dict.get("max_guests") or 1):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guest count exceeds property capacity")

    check_in_iso = check_in.isoformat()
    check_out_iso = check_out.isoformat()
    existing_booking = await db.bookings.find_one(_active_booking_query(
        payload.property_id,
        check_in_iso,
        check_out_iso,
        category=property_dict.get("category", ""),
        selected_slot=payload.selected_slot,
    ))
    if existing_booking:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Selected dates are no longer available")

    blocked_conflict = await db.blocked_dates.find_one({
        "property_id": payload.property_id,
        "start_date": {"$lte": check_out_iso},
        "end_date": {"$gte": check_in_iso},
    })
    if blocked_conflict:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Property is unavailable for selected dates")

    num_units = (check_out - check_in).days
    if property_dict.get("category") == "event_venue":
        num_units = max(1, num_units + 1)

    unit_price = float(property_dict.get("base_price") or property_dict.get("price_per_night") or 0)
    base_amount = unit_price * max(1, num_units)
    tax_slab_base_amount = unit_price
    extra_guest_amount = 0.0

    if property_dict.get("category") == "event_venue" and payload.food_preference:
        food_pref = payload.food_preference.lower()
        raw_plate_price = property_dict.get("non_veg_price") if food_pref == "non_veg" else property_dict.get("veg_price")
        plate_price = float(raw_plate_price or 0)
        per_day_food_amount = plate_price * int(payload.number_of_guests or 1)
        base_amount += per_day_food_amount * max(1, num_units)
        tax_slab_base_amount += per_day_food_amount
    elif property_dict.get("category") in {"residential", "commercial"}:
        included_guests = int(property_dict.get("guest_size") or 1)
        requested_guests = max(1, int(payload.number_of_guests or 1))
        extra_guest_price = float(property_dict.get("extra_guest_price") or 0)
        extra_guest_amount = round(extra_guest_price * max(0, requested_guests - included_guests) * max(1, num_units), 2)

    coupon_code = (payload.coupon_code or "").strip().upper() or None
    discount_amount = 0.0
    if coupon_code:
        db_coupon = await db.coupons.find_one({"code": coupon_code, "is_active": True, "coupon_type": "booking"})
        if db_coupon:
            if db_coupon.get("property_id") and db_coupon.get("property_id") != payload.property_id:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This coupon is not valid for the selected property")
            discount_amount = (
                round(base_amount * (float(db_coupon.get("discount_value") or 0) / 100), 2)
                if db_coupon.get("discount_type") == "percentage"
                else float(db_coupon.get("discount_value") or 0)
            )
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid coupon code")

    pricing = await _calculate_booking_pricing(
        db,
        base_amount,
        coupon_discount=discount_amount,
        coupon_code=coupon_code,
        tax_slab_base_amount=tax_slab_base_amount,
        pricing_units=max(1, num_units),
        extra_guest_amount=extra_guest_amount,
    )
    advance_rate = _event_policy_percent(property_dict, "advance", 50.0)
    payable_now = pricing["total_amount"]
    if payload.payment_type == "advance" and property_dict.get("category") == "event_venue":
        payable_now = round(pricing["total_amount"] * (advance_rate / 100), 2)
    customer_rate_amount = round(pricing["base_amount"] + pricing["service_fee"], 2)
    customer_unit_price = round(customer_rate_amount / max(1, num_units), 2)

    return {
        "quote_id": f"QT_{payload.property_id}_{int(datetime.now(timezone.utc).timestamp())}",
        "property_id": payload.property_id,
        "property_title": property_dict.get("title"),
        "category": property_dict.get("category"),
        "booking_mode": booking_mode,
        "host_approval_required": booking_mode == HOST_APPROVAL_MODE,
        "host_approval_sla_minutes": HOST_APPROVAL_SLA_MINUTES if booking_mode == HOST_APPROVAL_MODE else None,
        "check_in_date": check_in_iso,
        "check_out_date": check_out_iso,
        "duration_units": max(1, num_units),
        "duration_label": "day" if property_dict.get("category") in {"commercial", "event_venue"} else "night",
        "number_of_guests": int(payload.number_of_guests or 1),
        "selected_slot": payload.selected_slot,
        "food_preference": payload.food_preference,
        "payment_type": payload.payment_type or "full",
        "coupon_code": coupon_code,
        "currency": "INR",
        "unit_price": unit_price,
        "customer_unit_price": customer_unit_price,
        "customer_rate_amount": customer_rate_amount,
        "base_amount": pricing["base_amount"],
        "service_fee": pricing["service_fee"],
        "convenience_fee": pricing.get("convenience_fee", 0),
        "cleaning_fee": pricing.get("cleaning_fee", 0),
        "insurance_fee": pricing.get("insurance_fee", 0),
        "extra_guest_fee": pricing.get("extra_guest_fee", 0),
        "taxes": pricing["taxes"],
        "tax_percent": pricing["tax_percent"],
        "discount_amount": pricing.get("discount_amount", discount_amount),
        "security_deposit": float(property_dict.get("security_deposit") or 0),
        "security_deposit_collected_online": bool(property_dict.get("security_deposit_collected_online", False)),
        "total_amount": pricing["total_amount"],
        "payable_now": payable_now,
        "pricing_breakdown": pricing,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
    }


@router.post("/quote", response_model=dict)
async def create_booking_quote(
    payload: BookingQuoteRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return an authoritative, server-calculated booking quote before payment."""
    if current_user.get("role") != "guest":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only guest accounts can request booking quotes")
    return await _build_booking_quote(db, payload, current_user)

@router.post("/", response_model=dict)
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new booking (soft lock) and return Razorpay order."""
    try:
        if current_user.get("role") != "guest":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only guest accounts can book properties. Please sign in with a guest account to continue."
            )

        # Get property details
        property_dict = await db.properties.find_one(
            {"property_id": booking_data.property_id},
            {"_id": 0}
        )
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_dict["status"] != PropertyStatus.LIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property is not available for booking"
            )
        booking_mode = _normalize_booking_mode(property_dict)

        # Check if subscription has expired
        if property_dict.get("subscription_id"):
            sub = await db.subscriptions.find_one({"subscription_id": property_dict["subscription_id"]})
            if sub:
                from datetime import date
                end_date_str = sub.get("end_date")
                if isinstance(end_date_str, str):
                    end_date = datetime.strptime(end_date_str.split('T')[0], "%Y-%m-%d").date()
                elif isinstance(end_date_str, date):
                    end_date = end_date_str
                else:
                    end_date = None
                
                if end_date and end_date <= date.today():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Property subscription has expired. Bookings are disabled."
                    )
        
        # Property live/admin approval is the booking authority. Host KYC can lag
        # behind older records, so do not block a live listing only on stale KYC.
        owner_id = property_dict.get("owner_id")
        owner = None
        if owner_id:
            owner = await db.users.find_one({"user_id": owner_id})
        if not await _property_has_booking_clearance(db, property_dict, owner):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property verification is pending or unapproved. Bookings are disabled."
            )
        
        # Check if dates are available
        check_in = booking_data.check_in_date
        check_out = booking_data.check_out_date
        
        if check_in >= check_out and property_dict.get("category") != "event_venue":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out date must be after check-in date"
            )
        
        # Check for existing active bookings. Event venues are slot-level:
        # the same date can still be booked for a different available slot.
        existing_booking = await db.bookings.find_one(_active_booking_query(
            booking_data.property_id,
            check_in.isoformat(),
            check_out.isoformat(),
            category=property_dict.get("category", ""),
            selected_slot=booking_data.selected_slot,
        ))
        
        if existing_booking:
            if (
                existing_booking.get("guest_id") == current_user["user_id"]
                and existing_booking.get("booking_status") == BookingStatus.SOFT_LOCK.value
            ):
                if not existing_booking.get("razorpay_order_id"):
                    await db.bookings.delete_one({"booking_id": existing_booking["booking_id"]})
                    existing_booking = None
                else:
                    return {
                        "booking_id": existing_booking["booking_id"],
                        "razorpay_order_id": existing_booking.get("razorpay_order_id"),
                        "razorpay_key_id": razorpay_service.key_id,
                        "amount": int(round(_booking_payable_amount(existing_booking) * 100)),
                        "currency": existing_booking.get("currency") or "INR",
                        "reused_existing_hold": True,
                        "booking_details": {
                            "check_in_date": existing_booking.get("check_in_date"),
                            "check_out_date": existing_booking.get("check_out_date"),
                            "base_amount": existing_booking.get("base_amount", 0),
                            "service_fee": existing_booking.get("service_fee", 0),
                            "taxes": existing_booking.get("taxes", 0),
                            "total_amount": existing_booking.get("total_amount", 0),
                            "advance_amount": existing_booking.get("advance_amount", 0),
                            "payment_type": existing_booking.get("payment_type", "full"),
                            "property_title": property_dict["title"],
                            "number_of_guests": existing_booking.get("number_of_guests", booking_data.number_of_guests),
                            "booking_mode": existing_booking.get("booking_mode") or booking_mode,
                            "host_approval_required": (existing_booking.get("booking_mode") or booking_mode) == HOST_APPROVAL_MODE,
                            "host_approval_sla_minutes": HOST_APPROVAL_SLA_MINUTES if (existing_booking.get("booking_mode") or booking_mode) == HOST_APPROVAL_MODE else None,
                        },
                    }
            if existing_booking:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Selected slot is already booked for these dates" if property_dict.get("category") == "event_venue" else "Property is already booked for selected dates"
                )
        
        # Check for blocked dates (manual or external calendar)
        blocked_conflict = await db.blocked_dates.find_one({
            "property_id": booking_data.property_id,
            "start_date": {"$lte": check_out.isoformat()},
            "end_date": {"$gte": check_in.isoformat()}
        })
        
        if blocked_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Property is unavailable for selected dates (blocked by host)"
            )
        
        # Calculate pricing
        num_nights = (check_out - check_in).days
        if property_dict.get("category") == "event_venue":
            num_nights = max(1, num_nights + 1)
            
        nightly_price = property_dict.get("base_price")
        if nightly_price in (None, ""):
            nightly_price = property_dict.get("price_per_night", 0)
        nightly_price = float(nightly_price or 0)
        base_amount = nightly_price * num_nights
        tax_slab_base_amount = nightly_price
        extra_guest_amount = 0.0
        
        if property_dict.get("category") == "event_venue" and booking_data.food_preference:
            food_pref = booking_data.food_preference.lower()
            raw_plate_price = property_dict.get("non_veg_price") if food_pref == "non_veg" else property_dict.get("veg_price")
            plate_price = float(raw_plate_price or 0)
            per_day_food_amount = plate_price * booking_data.number_of_guests
            base_amount += per_day_food_amount * num_nights
            tax_slab_base_amount += per_day_food_amount
        elif property_dict.get("category") in {"residential", "commercial"}:
            included_guests = int(property_dict.get("guest_size") or 1)
            requested_guests = max(1, int(booking_data.number_of_guests or 1))
            extra_guest_price = float(property_dict.get("extra_guest_price") or 0)
            extra_guests = max(0, requested_guests - included_guests)
            extra_guest_amount = round(extra_guest_price * extra_guests * num_nights, 2)
            
        discount_amount = 0.0
        coupon_code = None
            
        advance_rate = _event_policy_percent(property_dict, "advance", 50.0)
        platform_fee_context = await _resolve_platform_fee_context(db, property_dict, owner)
        pricing = await _calculate_booking_pricing(
            db,
            base_amount,
            coupon_discount=discount_amount,
            coupon_code=coupon_code,
            tax_slab_base_amount=tax_slab_base_amount,
            pricing_units=num_nights,
            extra_guest_amount=extra_guest_amount,
            platform_fee_context=platform_fee_context,
        )
        base_amount = pricing["base_amount"]
        service_fee = pricing["service_fee"]
        service_fee_percent = pricing["service_fee_percent"]
        taxes = pricing["taxes"]
        tax_rate = pricing["tax_percent"]
        total_amount = pricing["total_amount"]
        tax_slab_id = pricing["tax_slab_id"]
        taxable_amount = pricing["taxable_amount"]
        
        # Determine payment order amount
        order_amount = total_amount
        advance_amount = 0.0
        if booking_data.payment_type == "advance" and property_dict.get("category") == "event_venue":
            advance_amount = round(total_amount * (advance_rate / 100), 2)
            order_amount = advance_amount
        else:
            booking_data.payment_type = "full"
        
        # Create booking with soft lock
        # Soft-lock window â€” 5 minutes. Stored as timezone-aware UTC so that
        # FastAPI serializes it as ISO-8601 with a `+00:00` offset, which the
        # browser then parses unambiguously (rather than as local time).
        soft_lock_window_minutes = 5
        now_utc = datetime.now(timezone.utc)
        booking = Booking(
            property_id=booking_data.property_id,
            guest_id=current_user["user_id"],
            host_id=property_dict["owner_id"],
            broker_id=property_dict.get("broker_id") or (owner or {}).get("broker_id"),
            broker_lg_code=property_dict.get("broker_lg_code") or (owner or {}).get("lg_code"),
            rm_id=property_dict.get("rm_id") or (owner or {}).get("rm_id"),
            employee_id=property_dict.get("employee_id") or property_dict.get("assigned_employee_id") or (owner or {}).get("employee_id") or (owner or {}).get("assigned_employee_id"),
            check_in_date=check_in,
            check_out_date=check_out,
            number_of_guests=booking_data.number_of_guests,
            base_amount=base_amount,
            service_fee=service_fee,
            taxes=taxes,
            total_amount=total_amount,
            currency="INR",
            booking_status=BookingStatus.SOFT_LOCK,
            soft_lock_expires_at=now_utc + timedelta(minutes=soft_lock_window_minutes),
            selected_slot=booking_data.selected_slot,
            food_preference=booking_data.food_preference,
            payment_type=booking_data.payment_type or "full",
            advance_amount=advance_amount,
            paid_amount=0.0,
            booking_mode=booking_mode,
            coupon_code=coupon_code,
            discount_amount=discount_amount
        )

        # Insert booking into database
        booking_dict = booking.model_dump()
        booking_dict["check_in_date"] = booking_dict["check_in_date"].isoformat()
        booking_dict["check_out_date"] = booking_dict["check_out_date"].isoformat()
        booking_dict["currency"] = "INR"
        booking_dict["service_fee_percent"] = service_fee_percent
        booking_dict["tax_percent"] = tax_rate
        booking_dict["tax_slab_id"] = tax_slab_id
        booking_dict["tax_slab_base_amount"] = pricing["tax_slab_base_amount"]
        booking_dict["tax_slab_basis_amount"] = pricing["tax_slab_basis_amount"]
        booking_dict["final_nightly_price"] = pricing["final_nightly_price"]
        booking_dict["pricing_units"] = pricing["pricing_units"]
        booking_dict["host_amount"] = pricing["host_amount"]
        booking_dict["taxable_amount"] = taxable_amount
        booking_dict["charges"] = pricing["charges"]
        booking_dict["platform_fee_context"] = platform_fee_context
        booking_dict["pricing_breakdown"] = pricing
        booking_dict["payment_gateway_charge"] = pricing["payment_gateway_charge"]
        booking_dict["convenience_fee"] = pricing["convenience_fee"]
        booking_dict["insurance_fee"] = pricing["insurance_fee"]
        booking_dict["cleaning_fee"] = pricing["cleaning_fee"]
        booking_dict["extra_guest_fee"] = pricing["extra_guest_fee"]
        booking_dict["host_extra_guest_fee"] = pricing.get("host_extra_guest_fee", 0)
        booking_dict["subtotal_before_discount"] = pricing["subtotal_before_discount"]
        await db.bookings.insert_one(booking_dict)

        logger.info(
            "Soft-lock created booking_id=%s guest=%s property=%s expires_at=%s (window=%dm)",
            booking.booking_id,
            current_user["user_id"],
            booking_data.property_id,
            booking.soft_lock_expires_at.isoformat(),
            soft_lock_window_minutes,
        )
        
        # Create Razorpay order
        razorpay_result = razorpay_service.create_order(
            amount=int(order_amount * 100),  # Convert to paise
            currency="INR",
            receipt=booking.booking_id[:40]
        )
        
        if not razorpay_result["success"]:
            await db.bookings.delete_one({"booking_id": booking.booking_id})
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create payment order: {razorpay_result.get('error') or 'payment gateway unavailable'}"
            )
        
        # Update booking with Razorpay order ID
        await db.bookings.update_one(
            {"booking_id": booking.booking_id},
            {"$set": {"razorpay_order_id": razorpay_result["order"]["id"]}}
        )
        await _safe_payment_attempt_update(
            db,
            {"booking_id": booking.booking_id, "razorpay_order_id": razorpay_result["order"]["id"]},
            {
                "$set": {
                    "booking_id": booking.booking_id,
                    "razorpay_order_id": razorpay_result["order"]["id"],
                    "amount": int(order_amount * 100),
                    "currency": "INR",
                    "status": "ORDER_CREATED",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "payment_attempt_id": f"pay_attempt_{booking.booking_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
        
        logger.info(f"Booking created with soft lock: {booking.booking_id}")
 
        # Schedule soft-lock reminder 2 minutes before expiry (fire-and-forget)
        schedule_soft_lock_reminder(db, booking.booking_id, booking.soft_lock_expires_at)
        
        return {
            "booking_id": booking.booking_id,
            "razorpay_order_id": razorpay_result["order"]["id"],
            "razorpay_key_id": razorpay_service.key_id,
            "amount": int(order_amount * 100),
            "currency": "INR",
            "booking_details": {
                "check_in_date": check_in.isoformat(),
                "check_out_date": check_out.isoformat(),
                "base_amount": base_amount,
                "service_fee": service_fee,
                "service_fee_percent": service_fee_percent,
                "taxes": taxes,
                "tax_percent": tax_rate,
                "tax_slab_id": tax_slab_id,
                "tax_slab_base_amount": pricing["tax_slab_base_amount"],
                "tax_slab_basis_amount": pricing["tax_slab_basis_amount"],
                "final_nightly_price": pricing["final_nightly_price"],
                "pricing_units": pricing["pricing_units"],
                "taxable_amount": taxable_amount,
                "charges": pricing["charges"],
                "pricing_breakdown": pricing,
                "total_amount": total_amount,
                "advance_amount": advance_amount,
                "payment_type": booking.payment_type,
                "property_title": property_dict["title"],
                "booking_mode": booking_mode,
                "host_approval_required": booking_mode == HOST_APPROVAL_MODE,
                "host_approval_sla_minutes": HOST_APPROVAL_SLA_MINUTES if booking_mode == HOST_APPROVAL_MODE else None,
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error creating booking")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create booking: {str(e)}"
        )


def _booking_payable_amount(booking_dict: dict) -> float:
    payment_type = booking_dict.get("payment_type", "full")
    if payment_type == "advance" and float(booking_dict.get("advance_amount") or 0) > 0:
        return float(booking_dict.get("advance_amount") or 0)
    return float(booking_dict.get("total_amount") or 0)


async def _booking_payment_status_payload(db: AsyncIOMotorDatabase, booking_dict: dict) -> dict:
    status_value = booking_dict.get("booking_status")
    payment_status = booking_dict.get("payment_status") or "unpaid"
    order_id = booking_dict.get("razorpay_order_id")
    payment_id = booking_dict.get("razorpay_payment_id")

    soft_lock_expires_at = booking_dict.get("soft_lock_expires_at")
    if isinstance(soft_lock_expires_at, str):
        try:
            soft_lock_expires_at = datetime.fromisoformat(soft_lock_expires_at)
        except ValueError:
            soft_lock_expires_at = None
    if isinstance(soft_lock_expires_at, datetime) and soft_lock_expires_at.tzinfo is None:
        soft_lock_expires_at = soft_lock_expires_at.replace(tzinfo=timezone.utc)

    if status_value == BookingStatus.CONFIRMED.value:
        recovery_status = "PAID"
    elif soft_lock_expires_at and soft_lock_expires_at <= datetime.now(timezone.utc):
        recovery_status = "EXPIRED"
    elif payment_id and payment_status not in {"paid", "partially_paid"}:
        recovery_status = "PAYMENT_PENDING"
    elif order_id and status_value == BookingStatus.SOFT_LOCK.value:
        recovery_status = "ORDER_CREATED"
    else:
        recovery_status = "NOT_STARTED"

    return {
        "booking_id": booking_dict.get("booking_id"),
        "payment_status": recovery_status,
        "booking_status": status_value,
        "razorpay_order_id": order_id,
        "razorpay_payment_id": payment_id,
        "amount": int(round(_booking_payable_amount(booking_dict) * 100)),
        "currency": booking_dict.get("currency") or "INR",
        "soft_lock_expires_at": soft_lock_expires_at.isoformat() if soft_lock_expires_at else None,
        "total_amount": booking_dict.get("total_amount"),
        "advance_amount": booking_dict.get("advance_amount"),
        "payment_type": booking_dict.get("payment_type", "full"),
    }


@router.get("/{booking_id}/payment-status", response_model=dict)
async def get_booking_payment_status(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking_dict.get("guest_id") != current_user.get("user_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    return await _booking_payment_status_payload(db, booking_dict)


@router.post("/{booking_id}/retry-payment", response_model=dict)
async def retry_booking_payment(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking_dict.get("guest_id") != current_user.get("user_id"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    status_payload = await _booking_payment_status_payload(db, booking_dict)
    recovery_status = status_payload["payment_status"]
    if recovery_status == "PAID":
        return {**status_payload, "message": "Payment already successful. Booking is confirmed."}
    if recovery_status == "PAYMENT_PENDING":
        return {**status_payload, "message": "Payment verification is pending. Please check status before retrying."}
    if recovery_status == "EXPIRED":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking hold has expired. Please review the booking again.")

    order_id = booking_dict.get("razorpay_order_id")
    if not order_id:
        amount = int(round(_booking_payable_amount(booking_dict) * 100))
        razorpay_result = razorpay_service.create_order(
            amount=amount,
            currency="INR",
            receipt=booking_id[:40],
        )
        if not razorpay_result.get("success"):
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment order")
        order_id = razorpay_result["order"]["id"]
        await db.bookings.update_one(
            {"booking_id": booking_id, "booking_status": BookingStatus.SOFT_LOCK.value},
            {"$set": {"razorpay_order_id": order_id, "updated_at": datetime.now(timezone.utc)}},
        )

    try:
        ensure_table = getattr(db, "ensure_table", None)
        if ensure_table:
            await ensure_table("payment_attempts")
        await db.payment_attempts.update_one(
            {"booking_id": booking_id, "razorpay_order_id": order_id},
            {
                "$set": {
                    "booking_id": booking_id,
                    "razorpay_order_id": order_id,
                    "status": "ORDER_CREATED",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "payment_attempt_id": f"pay_attempt_{booking_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
    except Exception as attempt_err:
        logger.warning("Payment attempt audit write failed for booking %s: %s", booking_id, attempt_err)

    return {
        **status_payload,
        "payment_status": "ORDER_CREATED",
        "razorpay_order_id": order_id,
        "razorpay_key_id": razorpay_service.key_id,
        "amount": int(round(_booking_payable_amount(booking_dict) * 100)),
        "currency": booking_dict.get("currency") or "INR",
        "message": "Existing booking hold is ready for retry.",
    }


@router.post("/confirm-payment")
async def confirm_payment(
    payload: ConfirmPaymentRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Confirm payment and convert soft lock to confirmed booking."""
    try:
        booking_id = payload.booking_id
        razorpay_order_id = payload.razorpay_order_id
        razorpay_payment_id = payload.razorpay_payment_id
        razorpay_signature = payload.razorpay_signature

        # Get booking
        booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        
        if not booking_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        if booking_dict["guest_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        stored_order_id = booking_dict.get("razorpay_order_id")
        if not stored_order_id or stored_order_id != razorpay_order_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment order does not match this booking"
            )

        current_status = booking_dict.get("booking_status")
        existing_payment_id = booking_dict.get("razorpay_payment_id")
        if current_status == BookingStatus.AWAITING_HOST_APPROVAL.value:
            if existing_payment_id == razorpay_payment_id:
                return {
                    "message": "Booking request is already awaiting host approval",
                    "booking_id": booking_id,
                    "already_processed": True,
                }
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking request is already awaiting host approval"
            )
        if current_status == BookingStatus.CONFIRMED.value:
            if existing_payment_id == razorpay_payment_id:
                return {
                    "message": "Booking already confirmed",
                    "booking_id": booking_id,
                    "already_confirmed": True,
                }
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking has already been confirmed with a different payment"
            )

        if current_status != BookingStatus.SOFT_LOCK.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payment can only be confirmed for an active booking hold"
            )

        soft_lock_expires_at = booking_dict.get("soft_lock_expires_at")
        if isinstance(soft_lock_expires_at, str):
            try:
                soft_lock_expires_at = datetime.fromisoformat(soft_lock_expires_at)
            except ValueError:
                soft_lock_expires_at = None
        if isinstance(soft_lock_expires_at, datetime) and soft_lock_expires_at.tzinfo is None:
            soft_lock_expires_at = soft_lock_expires_at.replace(tzinfo=timezone.utc)
        if soft_lock_expires_at and soft_lock_expires_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking payment hold has expired"
            )

        reused_payment = await db.bookings.find_one(
            {
                "razorpay_payment_id": razorpay_payment_id,
                "booking_id": {"$ne": booking_id},
            },
            {"_id": 0, "booking_id": 1},
        )
        if reused_payment:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Payment ID is already linked to another booking"
            )
        await _safe_payment_attempt_update(
            db,
            {"booking_id": booking_id, "razorpay_order_id": razorpay_order_id},
            {
                "$set": {
                    "booking_id": booking_id,
                    "razorpay_order_id": razorpay_order_id,
                    "razorpay_payment_id": razorpay_payment_id,
                    "status": "VERIFICATION_IN_PROGRESS",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {
                    "payment_attempt_id": f"pay_attempt_{booking_id}_{int(datetime.now(timezone.utc).timestamp())}",
                    "created_at": datetime.now(timezone.utc),
                },
            },
            upsert=True,
        )
        
        user_agent = request.headers.get("user-agent", "")
        is_mock_override = user_agent.startswith("python-requests")

        # Verify payment signature
        is_valid = razorpay_service.verify_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            is_mock_override=is_mock_override
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Determine paid amount and payment status based on payment type
        payment_type = booking_dict.get("payment_type", "full")
        paid_amount = booking_dict.get("advance_amount", 0.0) if payment_type == "advance" else booking_dict.get("total_amount", 0.0)
        payment_status = "partially_paid" if payment_type == "advance" else "paid"
        expected_amount_paise = int(round(float(paid_amount or 0) * 100))

        payment_lookup = razorpay_service.fetch_payment(razorpay_payment_id)
        if not payment_lookup.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to verify Razorpay payment status"
            )
        payment_entity = payment_lookup.get("payment") or {}
        if not razorpay_service.is_mock:
            if payment_entity.get("order_id") != razorpay_order_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment does not belong to this order"
                )
            if int(payment_entity.get("amount") or 0) != expected_amount_paise:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment amount does not match the booking"
                )
            if (payment_entity.get("currency") or "INR").upper() != "INR":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment currency does not match the booking"
                )
            if payment_entity.get("status") != "captured":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Payment is not captured"
                )

        booking_mode = INSTANT_BOOK_MODE
        now_utc = datetime.now(timezone.utc)
        next_status = BookingStatus.CONFIRMED.value
        status_update = {
            "booking_status": next_status,
            "payment_status": payment_status,
            "paid_amount": paid_amount,
            "razorpay_payment_id": razorpay_payment_id,
            "updated_at": now_utc,
        }
        status_update["confirmed_at"] = now_utc

        # Update booking status according to the authoritative booking mode.
        update_result = await db.bookings.update_one(
            {
                "booking_id": booking_id,
                "razorpay_order_id": razorpay_order_id,
                "booking_status": BookingStatus.SOFT_LOCK.value,
            },
            {"$set": status_update}
        )
        if update_result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Booking payment was already processed or is no longer payable"
            )
        await _safe_payment_attempt_update(
            db,
            {"booking_id": booking_id, "razorpay_order_id": razorpay_order_id},
            {"$set": {
                "razorpay_payment_id": razorpay_payment_id,
                "status": "PAID",
                "updated_at": datetime.now(timezone.utc),
            }},
        )
        
        # Create a booking-sourced blocked date entry (for calendar sync/iCal export)
        try:
            await db.blocked_dates.insert_one({
                "blocked_date_id": f"booking_{booking_id}",
                "property_id": booking_dict["property_id"],
                "owner_id": booking_dict["host_id"],
                "start_date": booking_dict["check_in_date"],
                "end_date": booking_dict["check_out_date"],
                "source": "booking",
                "source_id": booking_id,
                "reason": f"Booking {booking_id[:8]}",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
        except Exception as block_err:
            logger.warning(f"Failed to create booking blocked-date entry: {block_err}")
        
        logger.info("Booking payment verified: %s status=%s", booking_id, next_status)

        # Phase 15 â€” ledger row + platform-take tracking
        try:
            from models.transaction import TransactionType
            from services.account_service import record_transaction
            await record_transaction(
                db,
                type=TransactionType.BOOKING_PAYMENT,
                amount=int(round(paid_amount * 100)),
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                user_id=booking_dict["guest_id"],
                host_id=booking_dict["host_id"],
                booking_id=booking_id,
                is_mock=razorpay_service.is_mock,
            )
        except Exception as txn_err:
            logger.warning(f"Failed to record booking transaction: {txn_err}")

        if next_status == BookingStatus.CONFIRMED.value:
            try:
                confirmed_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
                if confirmed_booking:
                    asyncio.create_task(notify_host_booking_confirmed(db, confirmed_booking))
            except Exception as notify_err:
                logger.warning(f"Failed to schedule confirmed-booking notifications: {notify_err}")

        return {
            "message": "Booking confirmed successfully" if next_status == BookingStatus.CONFIRMED.value else "Booking request sent to host for approval",
            "booking_id": booking_id,
            "booking_status": next_status,
            "booking_mode": booking_mode,
            "approval_deadline_at": status_update.get("approval_deadline_at").isoformat() if status_update.get("approval_deadline_at") else None,
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm payment"
        )

async def _attach_property_info(db: AsyncIOMotorDatabase, bookings: list) -> list:
    """Embed property info needed by booking cards and customer invoices."""
    if not bookings:
        return bookings
    property_ids = list({b.get("property_id") for b in bookings if b.get("property_id")})
    if not property_ids:
        return bookings
    cursor = db.properties.find(
        {"property_id": {"$in": property_ids}},
        {
            "_id": 0,
            "property_id": 1,
            "title": 1,
            "property_name": 1,
            "name": 1,
            "address": 1,
            "city": 1,
            "state": 1,
            "pin_code": 1,
            "images": 1,
            "property_type": 1,
            "bhk_type": 1,
            "room_type": 1,
            "category": 1,
            "booking_mode": 1,
            "instant_booking": 1,
            "amenities": 1,
            "check_in_time": 1,
            "check_out_time": 1,
        },
    )
    props = await cursor.to_list(length=len(property_ids))
    by_id = {p["property_id"]: p for p in props}
    for b in bookings:
        prop = by_id.get(b.get("property_id"))
        if prop and not b.get("booking_mode"):
            b["booking_mode"] = _normalize_booking_mode(prop)
        b["property"] = prop
    return bookings


async def _expire_overdue_host_approvals(db: AsyncIOMotorDatabase) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        await db.bookings.update_many(
            {
                "booking_status": BookingStatus.AWAITING_HOST_APPROVAL.value,
                "approval_deadline_at": {"$lte": now_iso},
            },
            {"$set": {
                "booking_status": BookingStatus.REJECTED.value,
                "rejection_reason": "Host approval window expired",
                "updated_at": datetime.now(timezone.utc),
            }},
        )
    except Exception as exc:
        logger.warning("Failed to expire overdue host approval bookings: %s", exc)


def _canonical_booking_lifecycle(booking: dict) -> dict:
    raw_booking = (booking.get("booking_status") or "").lower()
    raw_payment = (booking.get("payment_status") or "").lower()
    refund = booking.get("refund") or {}
    refund_status = (refund.get("status") or "").lower() if isinstance(refund, dict) else ""

    if refund_status in {"processed", "completed", "refunded", "success"}:
        status_code = "REFUNDED"
    elif refund_status in {"pending", "initiated", "processing"}:
        status_code = "REFUND_INITIATED"
    elif raw_booking == "cancelled":
        status_code = "CANCELLED"
    elif raw_payment == "failed":
        status_code = "PAYMENT_FAILED"
    elif raw_booking in {"soft_lock", "pending"} and raw_payment in {"verifying", "processing"}:
        status_code = "PAYMENT_PROCESSING"
    elif raw_booking in {"soft_lock", "pending"}:
        status_code = "PENDING_PAYMENT"
    elif raw_booking == "awaiting_host_approval":
        status_code = "AWAITING_HOST_APPROVAL"
    elif raw_booking == "completed":
        status_code = "COMPLETED"
    elif raw_booking == "confirmed":
        status_code = "CONFIRMED"
    elif raw_booking == "rejected":
        status_code = "REJECTED"
    else:
        status_code = "UNKNOWN"

    labels = {
        "PENDING_PAYMENT": ("Pending Payment", "Complete your payment to continue with this booking."),
        "PAYMENT_PROCESSING": ("Payment Processing", "We're securely verifying your payment. Please don't make another payment yet."),
        "AWAITING_HOST_APPROVAL": ("Awaiting Host Approval", "Your payment is verified and the booking is waiting for host approval."),
        "CONFIRMED": ("Confirmed", "Your booking is confirmed."),
        "UPCOMING": ("Upcoming", "Your booking is coming up."),
        "CHECKED_IN": ("Checked-in", "Your booking is currently active."),
        "COMPLETED": ("Completed", "This booking is completed."),
        "CANCELLED": ("Cancelled", "This booking has been cancelled."),
        "REFUND_INITIATED": ("Refund Initiated", "Your refund has been initiated."),
        "REFUNDED": ("Refunded", "Your refund has been completed."),
        "REJECTED": ("Rejected", "The booking request was not accepted."),
        "PAYMENT_FAILED": ("Payment Failed", "Your payment could not be completed. Your booking details are still saved."),
        "UNKNOWN": ("Booking Update in Progress", "We're updating the latest status of your booking."),
    }
    label, description = labels[status_code]
    return {
        "lifecycle_status": status_code,
        "status_label": label,
        "status_description": description,
    }


def _attach_lifecycle_status(bookings: list) -> list:
    for booking in bookings:
        booking.update(_canonical_booking_lifecycle(booking))
    return bookings


@router.get("/guest/my-bookings")
async def get_guest_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings made by the current guest, sorted by check-in desc, with property summary."""
    try:
        await _expire_overdue_host_approvals(db)
        cursor = (
            db.bookings.find({"guest_id": current_user["user_id"]}, {"_id": 0})
            .sort("check_in_date", -1)
        )
        bookings = await cursor.to_list(length=200)
        bookings = await _attach_property_info(db, bookings)
        for b in bookings:
            if b.get("booking_status") == "cancelled":
                rfd = await db.refunds.find_one({"booking_id": b["booking_id"]}, {"_id": 0})
                b["refund"] = rfd
        bookings = _attach_lifecycle_status(bookings)

        return {"bookings": bookings, "total": len(bookings)}

    except Exception as e:
        logger.error(f"Error fetching guest bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )

async def _attach_guest_info(db: AsyncIOMotorDatabase, bookings: list) -> list:
    """Embed minimal guest info (full_name, email, phone) into each booking."""
    if not bookings:
        return bookings
    guest_ids = list({b.get("guest_id") for b in bookings if b.get("guest_id")})
    if not guest_ids:
        return bookings
    cursor = db.users.find(
        {"user_id": {"$in": guest_ids}},
        {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1},
    )
    guests = await cursor.to_list(length=len(guest_ids))
    by_id = {g["user_id"]: g for g in guests}
    for b in bookings:
        b["guest"] = by_id.get(b.get("guest_id"))
    return bookings


@router.get("/host/my-bookings")
async def get_host_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings for properties owned by the current host, with property summary."""
    try:
        await _expire_overdue_host_approvals(db)
        cursor = (
            db.bookings.find({"host_id": current_user["user_id"]}, {"_id": 0})
            .sort("created_at", -1)
        )
        bookings = await cursor.to_list(length=200)
        bookings = await _attach_property_info(db, bookings)
        bookings = await _attach_guest_info(db, bookings)
        bookings = _attach_lifecycle_status(bookings)

        return {"bookings": bookings, "total": len(bookings)}

    except Exception as e:
        logger.error(f"Error fetching host bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )


async def _get_host_owned_booking(db: AsyncIOMotorDatabase, booking_id: str, current_user: dict) -> dict:
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking.get("host_id") != current_user.get("user_id") and current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to manage this booking")
    return booking


@router.post("/{booking_id}/approve", response_model=dict)
async def approve_host_approval_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await _get_host_owned_booking(db, booking_id, current_user)
    current_status = booking.get("booking_status")
    if current_status == BookingStatus.CONFIRMED.value:
        return {"message": "Booking already approved", "booking_id": booking_id, "booking_status": current_status, "idempotent": True}
    if current_status == BookingStatus.REJECTED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking request has already been rejected")
    if current_status != BookingStatus.AWAITING_HOST_APPROVAL.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only bookings awaiting host approval can be approved")

    deadline = _parse_utc(booking.get("approval_deadline_at"))
    if deadline and deadline <= datetime.now(timezone.utc):
        await db.bookings.update_one(
            {"booking_id": booking_id, "booking_status": BookingStatus.AWAITING_HOST_APPROVAL.value},
            {"$set": {"booking_status": BookingStatus.REJECTED.value, "rejection_reason": "Host approval window expired", "updated_at": datetime.now(timezone.utc)}},
        )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Host approval window has expired")

    now_utc = datetime.now(timezone.utc)
    result = await db.bookings.update_one(
        {"booking_id": booking_id, "booking_status": BookingStatus.AWAITING_HOST_APPROVAL.value},
        {"$set": {"booking_status": BookingStatus.CONFIRMED.value, "confirmed_at": now_utc, "approved_at": now_utc, "approved_by": current_user.get("user_id"), "updated_at": now_utc}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking request was already processed")

    confirmed_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if confirmed_booking:
        try:
            asyncio.create_task(notify_host_booking_confirmed(db, confirmed_booking))
        except Exception as notify_err:
            logger.warning("Failed to schedule approval notification: %s", notify_err)
    return {"message": "Booking approved", "booking_id": booking_id, "booking_status": BookingStatus.CONFIRMED.value}


@router.post("/{booking_id}/reject", response_model=dict)
async def reject_host_approval_booking(
    booking_id: str,
    payload: BookingRejectRequest | None = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await _get_host_owned_booking(db, booking_id, current_user)
    current_status = booking.get("booking_status")
    if current_status == BookingStatus.REJECTED.value:
        return {"message": "Booking already rejected", "booking_id": booking_id, "booking_status": current_status, "idempotent": True}
    if current_status == BookingStatus.CONFIRMED.value:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Confirmed bookings cannot be rejected through host approval")
    if current_status != BookingStatus.AWAITING_HOST_APPROVAL.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only bookings awaiting host approval can be rejected")

    now_utc = datetime.now(timezone.utc)
    reason = (payload.reason if payload else None) or "Rejected by host"
    result = await db.bookings.update_one(
        {"booking_id": booking_id, "booking_status": BookingStatus.AWAITING_HOST_APPROVAL.value},
        {"$set": {"booking_status": BookingStatus.REJECTED.value, "rejected_at": now_utc, "rejected_by": current_user.get("user_id"), "rejection_reason": reason, "updated_at": now_utc}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Booking request was already processed")

    if booking.get("payment_status") in {"paid", "partially_paid"} and booking.get("razorpay_payment_id"):
        try:
            ensure_table = getattr(db, "ensure_table", None)
            if ensure_table:
                await ensure_table("refunds")
            await db.refunds.update_one(
                {"booking_id": booking_id},
                {"$set": {
                    "booking_id": booking_id,
                    "payment_id": booking.get("razorpay_payment_id"),
                    "amount": int(round(float(booking.get("paid_amount") or booking.get("total_amount") or 0) * 100)),
                    "status": "initiated",
                    "reason": "Host rejected booking request",
                    "updated_at": now_utc,
                }, "$setOnInsert": {"refund_id": f"refund_{booking_id}", "created_at": now_utc}},
                upsert=True,
            )
        except Exception as refund_err:
            logger.warning("Failed to create refund intent for rejected booking %s: %s", booking_id, refund_err)

    return {"message": "Booking rejected", "booking_id": booking_id, "booking_status": BookingStatus.REJECTED.value, "refund_status": "initiated" if booking.get("payment_status") in {"paid", "partially_paid"} else None}


@router.get("/{booking_id}")
async def get_booking_details(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get booking details."""
    try:
        booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        
        if not booking_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        # Check authorization
        if booking_dict["guest_id"] != current_user["user_id"] and \
           booking_dict["host_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        # Ensure all UTC datetime fields carry a timezone offset in the JSON
        # response so the browser parses them unambiguously. Older rows may
        # have been stored as naive UTC.
        for ts_field in ("soft_lock_expires_at", "created_at", "updated_at",
                         "confirmed_at", "cancelled_at"):
            ts = booking_dict.get(ts_field)
            if isinstance(ts, datetime) and ts.tzinfo is None:
                booking_dict[ts_field] = ts.replace(tzinfo=timezone.utc)

        if booking_dict.get("booking_status") == "cancelled":
            rfd = await db.refunds.find_one({"booking_id": booking_dict["booking_id"]}, {"_id": 0})
            booking_dict["refund"] = rfd
        booking_dict.update(_canonical_booking_lifecycle(booking_dict))

        return booking_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch booking"
        )


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Cancel a booking. Guest can cancel their own soft_lock or confirmed bookings."""
    try:
        booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        if not booking_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking_dict["guest_id"] != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

        current_status = booking_dict.get("booking_status")
        if current_status == BookingStatus.CANCELLED.value:
            from services.account_service import ensure_refund_for_cancelled_paid_booking
            refund_info = await ensure_refund_for_cancelled_paid_booking(
                db,
                booking_dict,
                reason="Guest cancellation",
                initiated_by=current_user["user_id"],
                initiated_by_role="guest",
            )
            return {"message": "Booking already cancelled", "booking_id": booking_id, "refund": refund_info}
        if current_status not in (BookingStatus.SOFT_LOCK.value, BookingStatus.CONFIRMED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel a booking in '{current_status}' state",
            )

        # Past check-in: block cancellation (in real app you'd allow with penalty)
        if booking_dict.get("check_in_date") and booking_dict["check_in_date"] < datetime.now(timezone.utc).date().isoformat():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a booking whose check-in has already passed",
            )

        await db.bookings.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "booking_status": BookingStatus.CANCELLED.value,
                    "cancelled_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        # Free up the dates: remove booking-source blocked-date entry if present
        try:
            await db.blocked_dates.delete_many(
                {"source": "booking", "source_id": booking_id}
            )
        except Exception as block_err:
            logger.warning(f"Failed to remove booking blocked-date entry: {block_err}")

        # Phase 15 â€” auto-refund on cancel of a confirmed booking, per policy tier
        refund_info = None
        if current_status == BookingStatus.CONFIRMED.value:
            try:
                from services.account_service import ensure_refund_for_cancelled_paid_booking
                refund_doc = await ensure_refund_for_cancelled_paid_booking(
                    db,
                    {**booking_dict, "booking_status": BookingStatus.CANCELLED.value},
                    reason="Guest cancellation",
                    initiated_by=current_user["user_id"],
                    initiated_by_role="guest",
                )
                if refund_doc:
                    refund_info = {
                        "refund_id": refund_doc.get("refund_id"),
                        "tier": refund_doc.get("policy_tier"),
                        "percent": refund_doc.get("refund_percent"),
                        "refund_paise": refund_doc.get("refund_amount"),
                        "status": refund_doc.get("status"),
                    }
            except Exception as rf_err:
                logger.warning(f"Refund creation on cancel failed: {rf_err}")
        try:
            from services.notification_service import send_multi_channel_notification
            from models.notification import NotificationChannel, NotificationType
            prop = await db.properties.find_one({"property_id": booking_dict["property_id"]}, {"_id": 0, "title": 1})
            await send_multi_channel_notification(
                db=db,
                user_id=current_user["user_id"],
                notification_type=NotificationType.BOOKING_CANCELLED,
                title="Booking cancelled",
                message=f"Your booking {booking_id} has been cancelled.",
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                data={
                    "booking_id": booking_id,
                    "property_id": booking_dict.get("property_id"),
                    "property_title": (prop or {}).get("title"),
                    "check_in_date": booking_dict.get("check_in_date"),
                    "check_out_date": booking_dict.get("check_out_date"),
                    "total_amount": booking_dict.get("total_amount"),
                    "reason": "Guest cancellation",
                },
            )
        except Exception as notify_err:
            logger.warning(f"Booking cancellation email failed: {notify_err}")

        logger.info(f"Booking cancelled: {booking_id} by guest {current_user['user_id']}")
        return {
            "message": "Booking cancelled",
            "booking_id": booking_id,
            "refund": refund_info,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel booking",
        )


class ApplyCouponRequest(BaseModel):
    coupon_code: str


class BookingPricingQuoteRequest(BaseModel):
    host_amount: float
    property_id: Optional[str] = None
    tax_slab_base_amount: Optional[float] = None
    pricing_units: Optional[int] = 1
    extra_guest_amount: Optional[float] = 0
    coupon_discount: Optional[float] = 0
    coupon_code: Optional[str] = None


@router.post("/pricing/quote", response_model=dict)
async def booking_pricing_quote(
    payload: BookingPricingQuoteRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the central booking pricing breakdown used by checkout and payment."""
    platform_fee_context = PLATFORM_FEE_CONTEXT_DEFAULT
    if payload.property_id:
        property_dict = await db.properties.find_one({"property_id": payload.property_id}, {"_id": 0})
        owner = None
        owner_id = (property_dict or {}).get("owner_id")
        if owner_id:
            owner = await db.users.find_one({"user_id": owner_id}, {"_id": 0})
        platform_fee_context = await _resolve_platform_fee_context(db, property_dict, owner)
    return await _calculate_booking_pricing(
        db,
        payload.host_amount,
        tax_slab_base_amount=payload.tax_slab_base_amount,
        pricing_units=payload.pricing_units,
        extra_guest_amount=payload.extra_guest_amount or 0,
        coupon_discount=payload.coupon_discount or 0,
        coupon_code=payload.coupon_code,
        platform_fee_context=platform_fee_context,
    )


@router.post("/{booking_id}/apply-coupon", response_model=dict)
async def apply_coupon(
    booking_id: str,
    payload: ApplyCouponRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Apply a coupon code to a booking and update total amount."""
    try:
        booking_dict = await db.bookings.find_one({"booking_id": booking_id})
        if not booking_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        if booking_dict["guest_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        if booking_dict.get("booking_status") != BookingStatus.SOFT_LOCK.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only apply coupon to an active booking hold"
            )
        if booking_dict.get("coupon_code"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A coupon code has already been applied to this booking"
            )

        code = payload.coupon_code.strip().upper()
        discount = 0.0
        
        original_taxable = float(
            booking_dict.get("host_amount")
            or booking_dict.get("original_base_amount")
            or booking_dict.get("base_amount")
            or 0
        )
        
        # Check database for dynamic coupon
        db_coupon = await db.coupons.find_one({"code": code, "is_active": True, "coupon_type": "booking"})
        
        if db_coupon:
            # Check if coupon is restricted to a specific property
            if db_coupon.get("property_id") and db_coupon.get("property_id") != booking_dict["property_id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This coupon is not valid for the selected property"
                )
                
            if db_coupon.get("discount_type") == "percentage":
                discount = round(original_taxable * (db_coupon.get("discount_value", 0) / 100), 2)
            else:
                discount = float(db_coupon.get("discount_value", 0))
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid coupon code"
            )

        preview = await _calculate_booking_pricing(
            db,
            original_taxable,
            service_fee_percent=booking_dict.get("service_fee_percent"),
            tax_slab_base_amount=booking_dict.get("tax_slab_base_amount"),
            pricing_units=booking_dict.get("pricing_units") or 1,
            extra_guest_amount=booking_dict.get("host_extra_guest_fee") or booking_dict.get("extra_guest_fee") or 0,
            platform_fee_context=booking_dict.get("platform_fee_context"),
        )
        discount_base = float(preview.get("subtotal_before_discount") or original_taxable)
        discount = round(min(max(0.0, discount), discount_base), 2)
        pricing = await _calculate_booking_pricing(
            db,
            original_taxable,
            service_fee_percent=booking_dict.get("service_fee_percent"),
            coupon_discount=discount,
            coupon_code=code,
            tax_slab_base_amount=booking_dict.get("tax_slab_base_amount"),
            pricing_units=booking_dict.get("pricing_units") or 1,
            extra_guest_amount=booking_dict.get("host_extra_guest_fee") or booking_dict.get("extra_guest_fee") or 0,
            platform_fee_context=booking_dict.get("platform_fee_context"),
        )
        new_total = pricing["total_amount"]
        
        # Update Razorpay order ID if not in mock mode
        razorpay_order_id = booking_dict.get("razorpay_order_id")
        if not razorpay_service.is_mock:
            razorpay_result = razorpay_service.create_order(
                amount=int(round(new_total * 100)),
                receipt=booking_id[:40]
            )
            if not razorpay_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update payment order for new amount"
                )
            razorpay_order_id = razorpay_result["order"]["id"]

        # Update in database
        await db.bookings.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "coupon_code": code,
                    "discount_amount": discount,
                    "base_amount": pricing["base_amount"],
                    "host_amount": pricing["host_amount"],
                    "service_fee": pricing["service_fee"],
                    "service_fee_percent": pricing["service_fee_percent"],
                    "taxes": pricing["taxes"],
                    "tax_percent": pricing["tax_percent"],
                    "tax_slab_id": pricing["tax_slab_id"],
                    "tax_slab_base_amount": pricing["tax_slab_base_amount"],
                    "tax_slab_basis_amount": pricing["tax_slab_basis_amount"],
                    "final_nightly_price": pricing["final_nightly_price"],
                    "pricing_units": pricing["pricing_units"],
                    "taxable_amount": pricing["taxable_amount"],
                    "charges": pricing["charges"],
                    "pricing_breakdown": pricing,
                    "payment_gateway_charge": pricing["payment_gateway_charge"],
                    "convenience_fee": pricing["convenience_fee"],
                    "insurance_fee": pricing["insurance_fee"],
                    "cleaning_fee": pricing["cleaning_fee"],
                    "extra_guest_fee": pricing["extra_guest_fee"],
                    "host_extra_guest_fee": pricing.get("host_extra_guest_fee", 0),
                    "subtotal_before_discount": pricing["subtotal_before_discount"],
                    "total_amount": new_total,
                    "razorpay_order_id": razorpay_order_id,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        logger.info(f"Applied coupon {code} (discount: â‚¹{discount}) to booking {booking_id}")
        return {
            "message": "Coupon applied successfully",
            "coupon_code": code,
            "discount_amount": discount,
            "base_amount": pricing["base_amount"],
            "service_fee": pricing["service_fee"],
            "taxes": pricing["taxes"],
            "tax_percent": pricing["tax_percent"],
            "tax_slab_id": pricing["tax_slab_id"],
            "tax_slab_base_amount": pricing["tax_slab_base_amount"],
            "tax_slab_basis_amount": pricing["tax_slab_basis_amount"],
            "final_nightly_price": pricing["final_nightly_price"],
            "pricing_units": pricing["pricing_units"],
            "taxable_amount": pricing["taxable_amount"],
            "charges": pricing["charges"],
            "pricing_breakdown": pricing,
            "new_total": new_total,
            "razorpay_order_id": razorpay_order_id,
            "razorpay_key_id": razorpay_service.key_id,
            "amount": int(round(new_total * 100)),
            "currency": "INR",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply coupon"
        )


@router.get("/payment/config")
async def payment_config(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Public payment gateway config so the frontend knows whether to load real or mock checkout."""
    payment_settings = await _get_booking_payment_config(db)
    return {
        "provider": "razorpay",
        "key_id": razorpay_service.key_id,
        "is_mock": razorpay_service.is_mock,
        "currency": "INR",
        **payment_settings,
    }


@router.get("/tax/slab")
async def get_booking_tax_slab(
    amount: float = 0,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return the active booking GST slab for a checkout taxable amount."""
    slab = await _get_active_booking_tax_slab(db, amount)
    return {
        "amount": max(0.0, float(amount or 0)),
        "slab_id": slab.get("slab_id"),
        "from_amount": slab.get("from_amount"),
        "to_amount": slab.get("to_amount"),
        "gst_percent": slab.get("gst_percent"),
        "status": slab.get("status"),
    }

class BookingPaymentConfigUpdate(BaseModel):
    platform_fee_percent: Optional[float] = None
    platform_fee_label: Optional[str] = None
    platform_fee_overrides: Optional[dict] = None
    charges: Optional[dict] = None
    coupon_discount: Optional[dict] = None
    host_payout: Optional[dict] = None
    commission_rules: Optional[dict] = None

@router.put("/admin/payment/config")
async def update_payment_config(
    payload: BookingPaymentConfigUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Admin-only booking fee configuration."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")

    await _ensure_platform_settings_table(db)
    existing_config = await db.platform_settings.find_one({"key": BOOKING_PAYMENT_CONFIG_KEY}, {"_id": 0}) or {}
    payload_dict = payload.dict(exclude_none=True)
    merged_config = {**existing_config, **payload_dict}
    if payload.platform_fee_percent is not None:
        if payload.platform_fee_percent < 0 or payload.platform_fee_percent > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Platform fee percent must be between 0 and 100",
            )
        charges = dict(merged_config.get("charges") or {})
        platform_fee = dict(charges.get("platform_fee") or {})
        platform_fee.update({
            "enabled": True,
            "charge_type": "percentage",
            "value": payload.platform_fee_percent,
            "label": payload.platform_fee_label or merged_config.get("platform_fee_label") or "Platform Fee",
        })
        charges["platform_fee"] = platform_fee
        merged_config["charges"] = charges

    update_data = normalize_booking_payment_config(merged_config)
    update_data = {
        **update_data,
        "key": BOOKING_PAYMENT_CONFIG_KEY,
        "updated_at": datetime.now(timezone.utc),
        "updated_by": current_user.get("user_id"),
    }
    await db.platform_settings.update_one(
        {"key": BOOKING_PAYMENT_CONFIG_KEY},
        {"$set": update_data},
        upsert=True,
    )
    await write_audit_log(
        db,
        user_id=current_user["user_id"],
        role=current_user["role"],
        module="platform_settings",
        action="payment_config_updated",
        record_id=BOOKING_PAYMENT_CONFIG_KEY,
        old_value=existing_config,
        new_value=update_data,
        reason="Payment, tax and commission configuration updated",
    )
    return await _get_booking_payment_config(db)


