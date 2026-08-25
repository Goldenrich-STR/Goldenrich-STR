"""Phase 15 — ledger + refund + payout business logic.

Every money movement in X-Space360 funnels through `record_transaction` so the
admin ledger has a complete audit trail.

Refund policy (tier):
  - >= 7 days before check-in → 100% refund  (tier: full)
  - 2–7 days                  →  50% refund  (tier: partial_50)
  - <  2 days (48h)           →   0% refund  (tier: no_refund)
Admin can override the tier with an explicit amount or percent.

Payout eligibility: booking is confirmed AND check_out_date <= today - 1 day.
Payout deductions are read from the booking payment configuration.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.transaction import (
    Payout,
    PayoutDestinationType,
    PayoutStatus,
    Refund,
    RefundStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from services.razorpay_service import razorpay_service
from services.booking_calculation_service import calculate_host_payout_breakdown, extract_booking_pricing_snapshot
from services.tds_service import record_host_payout_tds_ledger

logger = logging.getLogger(__name__)


PAID_PAYMENT_STATUSES = {"paid", "success", "captured", "completed", "partially_paid"}
CANCELLED_BOOKING_STATUSES = {"cancelled", "canceled"}
APPROVED_REFUND_STATUSES = {"approved", "processed", "completed", "success", "refunded"}
NON_REFUNDABLE_CHARGE_KEYS = {
    "platform_fee",
    "gateway_charge",
    "payment_gateway_charge",
    "convenience_fee",
    "platform_convenience_fee",
    "service_fee",
    "insurance_fee",
    "protection_fee",
    "cleaning_fee",
    "extra_guest_fee",
}


def _first_present(*values):
    for value in values:
        if value not in (None, ""):
            return value
    return None


def _booking_amount_to_paise(booking: dict) -> int:
    """Booking totals are stored in rupees; convert safely without dropping paise."""
    value = _first_present(
        booking.get("total_amount"),
        booking.get("paid_amount"),
        booking.get("amount_paid"),
        booking.get("customer_final_payable_amount"),
        booking.get("amount"),
    )
    try:
        return max(0, int(round(float(value or 0) * 100)))
    except (TypeError, ValueError):
        return 0


def _booking_payment_reference(booking: dict) -> Optional[str]:
    return _first_present(
        booking.get("payment_id"),
        booking.get("razorpay_payment_id"),
        booking.get("payment_confirmation"),
        booking.get("payment_reference"),
        booking.get("payment_ref"),
    )


def is_paid_booking(booking: dict) -> bool:
    return str(booking.get("payment_status") or "").strip().lower() in PAID_PAYMENT_STATUSES


def is_cancelled_booking(booking: dict) -> bool:
    return str(booking.get("booking_status") or "").strip().lower() in CANCELLED_BOOKING_STATUSES


def _parse_datetime(value) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time(), tzinfo=timezone.utc)
    text = str(value).strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.fromisoformat(text[:10])
        except ValueError:
            return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _parse_policy_date(value) -> Optional[date]:
    parsed = _parse_datetime(value)
    return parsed.date() if parsed else None


def _truthy(value) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    return str(value or "").strip().lower() in {"1", "true", "yes", "y", "on"}


def _booking_created_at(booking: dict) -> Optional[datetime]:
    return _parse_datetime(_first_present(
        booking.get("created_at"),
        booking.get("booking_date"),
        booking.get("booked_at"),
        booking.get("confirmed_at"),
        booking.get("payment_completed_at"),
    ))


def _is_non_refundable_booking(booking: dict) -> bool:
    if _truthy(_first_present(
        booking.get("is_non_refundable"),
        booking.get("non_refundable"),
        booking.get("non_refundable_booking"),
    )):
        return True
    text = " ".join(str(value or "") for value in (
        booking.get("booking_type"),
        booking.get("rate_type"),
        booking.get("rate_plan"),
        booking.get("cancellation_policy"),
        booking.get("refund_policy"),
    )).lower()
    return "non-refundable" in text or "non_refundable" in text or "no refund" in text


def _is_no_show_booking(booking: dict) -> bool:
    if _truthy(booking.get("no_show")):
        return True
    text = " ".join(str(value or "") for value in (
        booking.get("booking_status"),
        booking.get("cancellation_type"),
        booking.get("cancellation_reason"),
        booking.get("refund_policy"),
    )).lower()
    return "no_show" in text or "no show" in text


def _rupees_to_paise(value) -> int:
    try:
        return max(0, int(round(float(value or 0) * 100)))
    except (TypeError, ValueError):
        return 0


def _booking_non_refundable_charges_to_paise(booking: dict) -> int:
    snapshot = extract_booking_pricing_snapshot(booking)
    charges = snapshot.get("extra_charges") or {}
    total = 0
    for key in NON_REFUNDABLE_CHARGE_KEYS:
        total += _rupees_to_paise(charges.get(key))
    return total


def _booking_host_extra_guest_fee_to_paise(booking: dict) -> int:
    snapshot = extract_booking_pricing_snapshot(booking)
    charges = snapshot.get("extra_charges") or {}
    for value in (
        snapshot.get("host_extra_guest_fee"),
        charges.get("host_extra_guest_fee"),
        booking.get("host_extra_guest_fee"),
        booking.get("host_extra_guest_charge"),
        booking.get("extra_guest_host_amount"),
        booking.get("extra_person_amount"),
        booking.get("extra_person_total"),
        booking.get("extra_guest_amount"),
        booking.get("extra_guest_fee_host_amount"),
    ):
        paise = _rupees_to_paise(value)
        if paise > 0:
            return paise
    return 0


def _booking_refundable_base_to_paise(booking: dict) -> int:
    snapshot = extract_booking_pricing_snapshot(booking)
    host_extra_guest_paise = _booking_host_extra_guest_fee_to_paise(booking)
    for value in (
        snapshot.get("host_actual_value"),
        snapshot.get("host_base_amount"),
        snapshot.get("base_amount"),
        booking.get("host_actual_value"),
        booking.get("host_amount"),
        booking.get("host_base_amount"),
        booking.get("host_entered_amount"),
        booking.get("host_entered_price"),
        booking.get("property_base_amount"),
        booking.get("actual_amount"),
        booking.get("base_amount"),
    ):
        paise = _rupees_to_paise(value)
        if paise > 0:
            return paise + host_extra_guest_paise

    nightly_paise = _rupees_to_paise(
        _first_present(
            booking.get("price_per_night"),
            booking.get("property_price"),
            booking.get("room_price"),
            booking.get("nightly_rate"),
        )
    )
    if nightly_paise > 0:
        try:
            nights = int(float(_first_present(
                booking.get("nights"),
                booking.get("stay_nights"),
                booking.get("number_of_nights"),
                1,
            ) or 1))
        except (TypeError, ValueError):
            nights = 1
        return (nightly_paise * max(1, nights)) + host_extra_guest_paise

    return 0


def _financial_year_label(value: Optional[datetime] = None) -> str:
    current = value or datetime.now(timezone.utc)
    year = current.year
    start_year = year if current.month >= 4 else year - 1
    return f"{str(start_year)[-2:]}-{str(start_year + 1)[-2:]}"


async def _next_credit_note_number(db: AsyncIOMotorDatabase, value: Optional[datetime] = None) -> str:
    prefix = f"STRC/CN/{_financial_year_label(value)}/"
    existing = await db.refunds.find({}, {"_id": 0, "credit_note_no": 1}).to_list(length=10000)
    max_sequence = 0
    for row in existing:
        credit_note_no = str((row or {}).get("credit_note_no") or "")
        if not credit_note_no.startswith(prefix):
            continue
        try:
            max_sequence = max(max_sequence, int(credit_note_no.rsplit("/", 1)[-1]))
        except (TypeError, ValueError):
            continue
    return f"{prefix}{str(max_sequence + 1).zfill(3)}"


def _split_gst_from_total(total_paise: int, taxable_paise: int) -> tuple[int, int, int]:
    gst_paise = max(0, int(total_paise or 0) - int(taxable_paise or 0))
    cgst = int(round(gst_paise / 2))
    sgst = gst_paise - cgst
    return cgst, sgst, 0


def _customer_tax_invoice_no(*values: Any) -> Optional[str]:
    for value in values:
        if value in (None, ""):
            continue
        text = str(value).strip()
        if not text or text.upper() in {"NA", "N/A", "-"}:
            continue
        if text.upper().startswith("STRB/"):
            return f"STRC/{text.split('/', 1)[1]}"
        return text
    return None


async def build_credit_note_refund_doc(db: AsyncIOMotorDatabase, refund: Refund, booking: dict) -> dict:
    """Persist dashboard/email-ready credit note fields on a refund row."""
    now = refund.processed_at or datetime.now(timezone.utc)
    refund_doc = refund.model_dump()
    property_doc = await db.properties.find_one({"property_id": booking.get("property_id")}, {"_id": 0}) or {}
    guest = await db.users.find_one({"user_id": refund.guest_id}, {"_id": 0}) or {}
    host = await db.users.find_one({"user_id": refund.host_id}, {"_id": 0}) or {}
    invoice_txns = await (
        db.transactions.find(
            {"booking_id": refund.booking_id, "type": TransactionType.BOOKING_PAYMENT.value},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .limit(1)
        .to_list(length=1)
    )
    invoice_txn = invoice_txns[0] if invoice_txns else {}

    gross_receipt_paise = int(refund.original_amount or _booking_amount_to_paise(booking) or 0)
    refund_base_paise = int(
        refund_doc.get("refundable_base_amount")
        or refund_doc.get("refund_base_amount")
        or _booking_refundable_base_to_paise(booking)
        or 0
    )
    refund_total_paise = int(refund.refund_amount or 0)
    cancellation_paise = max(0, refund_base_paise - refund_total_paise)
    refund_taxable_paise = refund_total_paise
    cgst_paise = sgst_paise = igst_paise = 0

    property_name = (
        booking.get("property_name")
        or property_doc.get("title")
        or property_doc.get("property_name")
        or property_doc.get("name")
        or booking.get("property_id")
    )
    room_type = booking.get("room_type") or property_doc.get("configuration") or property_doc.get("bhk") or property_doc.get("room_type")
    refund_doc.update({
        "credit_note_no": await _next_credit_note_number(db, now),
        "credit_note_date": now,
        "credit_note_reason": refund.reason or "Booking cancellation refund",
        "original_invoice_no": _customer_tax_invoice_no(
            booking.get("tax_invoice_no"),
            booking.get("customer_invoice_no"),
            booking.get("booking_invoice_no"),
            booking.get("invoice_no"),
            booking.get("invoice_number"),
            invoice_txn.get("tax_invoice_no"),
            invoice_txn.get("invoice_no"),
            invoice_txn.get("invoice_number"),
        ),
        "original_invoice_date": booking.get("invoice_date") or invoice_txn.get("invoice_date") or invoice_txn.get("created_at"),
        "payment_ref": refund.razorpay_payment_id or booking.get("payment_id") or booking.get("razorpay_payment_id"),
        "booking_date": booking.get("created_at") or booking.get("booking_date"),
        "customer_name": guest.get("full_name") or booking.get("guest_name") or booking.get("customer_name"),
        "customer_email": guest.get("email") or booking.get("guest_email") or booking.get("customer_email"),
        "customer_phone": guest.get("phone") or booking.get("guest_phone") or booking.get("customer_phone"),
        "customer_gstin": booking.get("customer_gstin") or guest.get("gstin") or guest.get("gst_number"),
        "property_name": property_name,
        "property_type": property_doc.get("property_type") or property_doc.get("type"),
        "room_type": room_type,
        "property_address": property_doc.get("address") or property_doc.get("location") or booking.get("property_address"),
        "property_owner_name": host.get("full_name") or property_doc.get("owner_name"),
        "property_owner_contact": host.get("phone") or property_doc.get("owner_contact") or property_doc.get("contact_no"),
        "check_in_date": booking.get("check_in_date"),
        "check_out_date": booking.get("check_out_date"),
        "stay_nights": booking.get("nights") or booking.get("stay_nights") or booking.get("number_of_nights"),
        "guest_count": booking.get("number_of_guests") or booking.get("guests") or booking.get("guest_count"),
        "payment_mode": booking.get("payment_method") or "Online Payment",
        "payment_status": booking.get("payment_status") or "Paid",
        "gross_receipt_amount": gross_receipt_paise,
        "gross_amount": refund_base_paise,
        "refund_base_amount": refund_base_paise,
        "refundable_base_amount": refund_base_paise,
        "cancellation_charges": cancellation_paise,
        "net_taxable_value_credited": refund_taxable_paise,
        "cgst_refund_amount": cgst_paise,
        "sgst_refund_amount": sgst_paise,
        "igst_refund_amount": igst_paise,
        "gst_refund_amount": cgst_paise + sgst_paise + igst_paise,
    })
    return refund_doc


# --------------- Ledger ----------------

async def record_transaction(
    db: AsyncIOMotorDatabase,
    *,
    type: TransactionType,
    amount: int,
    status: TransactionStatus = TransactionStatus.SUCCESS,
    currency: str = "INR",
    razorpay_order_id: Optional[str] = None,
    razorpay_payment_id: Optional[str] = None,
    razorpay_refund_id: Optional[str] = None,
    razorpay_payout_id: Optional[str] = None,
    upi_transaction_id: Optional[str] = None,
    user_id: Optional[str] = None,
    host_id: Optional[str] = None,
    booking_id: Optional[str] = None,
    subscription_id: Optional[str] = None,
    payout_id: Optional[str] = None,
    refund_id: Optional[str] = None,
    notes: Optional[str] = None,
    is_mock: bool = False,
) -> Transaction:
    """Create a ledger row. Idempotent on (type, booking_id, razorpay_payment_id)
    for booking_payment to avoid double-recording on rare retries."""
    if type == TransactionType.BOOKING_PAYMENT and booking_id and razorpay_payment_id:
        existing = await db.transactions.find_one(
            {
                "type": type.value,
                "booking_id": booking_id,
                "razorpay_payment_id": razorpay_payment_id,
            }
        )
        if existing:
            existing.pop("_id", None)
            return Transaction(**existing)
    if type == TransactionType.SUBSCRIPTION and subscription_id and (upi_transaction_id or razorpay_payment_id):
        existing = await db.transactions.find_one(
            {
                "type": type.value,
                "subscription_id": subscription_id,
                **(
                    {"upi_transaction_id": upi_transaction_id}
                    if upi_transaction_id
                    else {"razorpay_payment_id": razorpay_payment_id}
                ),
            }
        )
        if existing:
            existing.pop("_id", None)
            return Transaction(**existing)
    if type == TransactionType.REGISTRATION_FEE and user_id and razorpay_payment_id:
        existing = await db.transactions.find_one(
            {
                "type": type.value,
                "user_id": user_id,
                "razorpay_payment_id": razorpay_payment_id,
            }
        )
        if existing:
            existing.pop("_id", None)
            return Transaction(**existing)

    txn = Transaction(
        type=type,
        amount=amount,
        status=status,
        currency=currency,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_refund_id=razorpay_refund_id,
        razorpay_payout_id=razorpay_payout_id,
        upi_transaction_id=upi_transaction_id,
        user_id=user_id,
        host_id=host_id,
        booking_id=booking_id,
        subscription_id=subscription_id,
        payout_id=payout_id,
        refund_id=refund_id,
        notes=notes,
        is_mock=is_mock,
    )
    await db.transactions.insert_one(txn.model_dump())
    return txn


# --------------- Refund policy ----------------

def compute_refund_tier(
    check_in_date: str | date,
    *,
    booking: Optional[dict] = None,
    cancellation_at: Optional[datetime] = None,
) -> tuple[float, str]:
    """Return (percent, tier_label) for the management refund policy."""
    booking = booking or {}
    if _is_non_refundable_booking(booking):
        return 0.0, "non_refundable"
    if _is_no_show_booking(booking):
        return 0.0, "no_show"

    check_in = _parse_policy_date(check_in_date)
    if not check_in:
        return 0.0, "no_refund"

    cancelled_at = cancellation_at or _parse_datetime(
        _first_present(booking.get("cancelled_at"), booking.get("cancellation_requested_at"))
    ) or datetime.now(timezone.utc)
    days_until_check_in = (check_in - cancelled_at.date()).days

    if days_until_check_in <= 0:
        return 0.0, "same_day_no_refund"

    created_at = _booking_created_at(booking)
    if created_at:
        hours_since_booking = (cancelled_at - created_at).total_seconds() / 3600
        if 0 <= hours_since_booking <= 24 and days_until_check_in > 7:
            return 100.0, "within_24h_full"

    if days_until_check_in >= 7:
        return 100.0, "full"
    if days_until_check_in >= 3:
        return 50.0, "partial_50"
    return 0.0, "less_than_72h_no_refund"


def _compute_refund_amounts(
    booking: dict,
    *,
    override_amount: Optional[int] = None,
    override_percent: Optional[float] = None,
) -> dict:
    """Compute refund on host-entered booking value only; customer-side fees/GST are non-refundable."""
    gross_receipt_paise = _booking_amount_to_paise(booking)
    refundable_base_paise = _booking_refundable_base_to_paise(booking)

    if override_amount is not None:
        refund_paise = max(0, min(refundable_base_paise, int(override_amount)))
        percent = round(100.0 * refund_paise / refundable_base_paise, 2) if refundable_base_paise else 0.0
        tier = "admin_override"
    elif override_percent is not None:
        percent = max(0.0, min(100.0, float(override_percent)))
        refund_paise = int(round(refundable_base_paise * percent / 100.0))
        tier = "admin_override"
    else:
        percent, tier = compute_refund_tier(
            _first_present(
                booking.get("check_in_date"),
                booking.get("checkin_date"),
                booking.get("start_date"),
            ),
            booking=booking,
        )
        refund_paise = int(round(refundable_base_paise * percent / 100.0))

    cancellation_paise = max(0, refundable_base_paise - refund_paise)
    return {
        "gross_receipt_amount": gross_receipt_paise,
        "original_amount": gross_receipt_paise,
        "refundable_base_amount": refundable_base_paise,
        "refund_base_amount": refundable_base_paise,
        "non_refundable_amount": max(0, gross_receipt_paise - refundable_base_paise),
        "refund_amount": refund_paise,
        "refund_percent": percent,
        "policy_tier": tier,
        "cancellation_charges": cancellation_paise,
        "net_taxable_value_credited": refund_paise,
        "cgst_refund_amount": 0,
        "sgst_refund_amount": 0,
        "igst_refund_amount": 0,
        "gst_refund_amount": 0,
    }


async def create_refund_request(
    db: AsyncIOMotorDatabase,
    *,
    booking: dict,
    reason: str,
    initiated_by: str,
    initiated_by_role: str,
    override_amount: Optional[int] = None,
    override_percent: Optional[float] = None,
) -> dict:
    """Create an admin-reviewable refund request without processing money movement."""
    amounts = _compute_refund_amounts(
        booking,
        override_amount=override_amount,
        override_percent=override_percent,
    )
    now = datetime.now(timezone.utc)
    rfd = Refund(
        booking_id=booking["booking_id"],
        guest_id=booking["guest_id"],
        host_id=booking["host_id"],
        original_amount=amounts["original_amount"],
        refund_amount=amounts["refund_amount"],
        refund_percent=amounts["refund_percent"],
        policy_tier=amounts["policy_tier"],
        reason=reason,
        initiated_by=initiated_by,
        initiated_by_role=initiated_by_role,
        razorpay_payment_id=_booking_payment_reference(booking),
        is_mock=razorpay_service.is_mock,
    )
    rfd.status = RefundStatus.PENDING
    refund_doc = rfd.model_dump()
    refund_doc.update({
        **amounts,
        "refund_policy_version": "management_refund_policy_2026",
        "refund_requested_at": now,
        "refund_initiated_at": None,
        "processed_at": None,
        "credit_note_no": None,
        "credit_note_date": None,
    })
    await db.refunds.insert_one(refund_doc)
    await db.bookings.update_one(
        {"booking_id": rfd.booking_id},
        {"$set": {"refund_status": "pending", "refund_amount": amounts["refund_amount"]}},
    )
    return refund_doc


async def approve_refund_request(
    db: AsyncIOMotorDatabase,
    *,
    refund_id: str,
    approved_by: str,
    reason: Optional[str] = None,
) -> dict:
    """Process a pending refund request and generate the credit note only after approval."""
    refund_doc = await db.refunds.find_one({"refund_id": refund_id}, {"_id": 0})
    if not refund_doc:
        raise ValueError("Refund request not found")
    if refund_doc.get("status") in APPROVED_REFUND_STATUSES:
        return refund_doc
    if refund_doc.get("status") not in (RefundStatus.PENDING.value, "initiated", "processing"):
        raise ValueError("Only pending refund requests can be approved")

    booking = await db.bookings.find_one({"booking_id": refund_doc.get("booking_id")}, {"_id": 0}) or {}
    if not booking:
        raise ValueError("Booking not found for refund request")

    refund_paise = int(refund_doc.get("refund_amount") or 0)
    rfd = Refund(**{
        key: value for key, value in refund_doc.items()
        if key in Refund.model_fields
    })
    rfd.status = RefundStatus.APPROVED
    rfd.processed_at = datetime.now(timezone.utc)

    if refund_paise and rfd.razorpay_payment_id:
        result = razorpay_service.create_refund(
            payment_id=rfd.razorpay_payment_id,
            amount=refund_paise,
            notes={"booking_id": rfd.booking_id, "reason": (reason or rfd.reason or "")[:200]},
        )
        if result.get("success"):
            rfd.razorpay_refund_id = result["refund"]["id"]
        else:
            await db.refunds.update_one(
                {"refund_id": refund_id},
                {"$set": {
                    "status": RefundStatus.FAILED.value,
                    "failure_reason": result.get("error", "unknown"),
                    "approved_by": approved_by,
                    "approved_at": datetime.now(timezone.utc),
                }},
            )
            await db.bookings.update_one(
                {"booking_id": rfd.booking_id},
                {"$set": {"refund_status": RefundStatus.FAILED.value, "refund_amount": refund_paise}},
            )
            return await db.refunds.find_one({"refund_id": refund_id}, {"_id": 0})

    credit_note_doc = await build_credit_note_refund_doc(db, rfd, booking)
    credit_note_doc.update({
        "approved_by": approved_by,
        "approved_at": rfd.processed_at,
        "approval_reason": reason,
        "refund_requested_at": refund_doc.get("refund_requested_at") or refund_doc.get("created_at"),
        "gross_receipt_amount": refund_doc.get("gross_receipt_amount") or credit_note_doc.get("gross_receipt_amount"),
        "original_amount": refund_doc.get("original_amount") or credit_note_doc.get("original_amount"),
        "refundable_base_amount": refund_doc.get("refundable_base_amount") or credit_note_doc.get("refundable_base_amount"),
        "refund_base_amount": refund_doc.get("refund_base_amount") or credit_note_doc.get("refund_base_amount"),
        "non_refundable_amount": refund_doc.get("non_refundable_amount") or credit_note_doc.get("non_refundable_amount"),
        "cancellation_charges": refund_doc.get("cancellation_charges") or credit_note_doc.get("cancellation_charges"),
        "net_taxable_value_credited": refund_paise,
        "cgst_refund_amount": 0,
        "sgst_refund_amount": 0,
        "igst_refund_amount": 0,
        "gst_refund_amount": 0,
    })
    await db.refunds.update_one({"refund_id": refund_id}, {"$set": credit_note_doc})
    await record_transaction(
        db,
        type=TransactionType.REFUND,
        amount=refund_paise,
        status=TransactionStatus.SUCCESS,
        razorpay_payment_id=rfd.razorpay_payment_id,
        razorpay_refund_id=rfd.razorpay_refund_id,
        user_id=rfd.guest_id,
        host_id=rfd.host_id,
        booking_id=rfd.booking_id,
        refund_id=rfd.refund_id,
        notes=f"[{rfd.policy_tier}] {reason or rfd.reason}",
        is_mock=razorpay_service.is_mock,
    )
    await db.bookings.update_one(
        {"booking_id": rfd.booking_id},
        {"$set": {"refund_status": RefundStatus.APPROVED.value, "refund_amount": refund_paise}},
    )
    try:
        import asyncio
        from services.booking_notifications import notify_guest_refund_processed
        asyncio.create_task(notify_guest_refund_processed(db, credit_note_doc))
    except Exception as err:
        logger.warning(f"Failed to start refund notification task: {err}")
    return await db.refunds.find_one({"refund_id": refund_id}, {"_id": 0})


async def reject_refund_request(
    db: AsyncIOMotorDatabase,
    *,
    refund_id: str,
    rejected_by: str,
    reason: str,
) -> dict:
    refund_doc = await db.refunds.find_one({"refund_id": refund_id}, {"_id": 0})
    if not refund_doc:
        raise ValueError("Refund request not found")
    if refund_doc.get("status") in APPROVED_REFUND_STATUSES:
        raise ValueError("Approved refunds cannot be rejected")
    now = datetime.now(timezone.utc)
    await db.refunds.update_one(
        {"refund_id": refund_id},
        {"$set": {
            "status": RefundStatus.REJECTED.value,
            "rejected_by": rejected_by,
            "rejected_at": now,
            "rejection_reason": reason,
        }},
    )
    await db.bookings.update_one(
        {"booking_id": refund_doc.get("booking_id")},
        {"$set": {"refund_status": RefundStatus.REJECTED.value, "refund_amount": refund_doc.get("refund_amount") or 0}},
    )
    return await db.refunds.find_one({"refund_id": refund_id}, {"_id": 0})


async def initiate_refund(
    db: AsyncIOMotorDatabase,
    *,
    booking: dict,
    reason: str,
    initiated_by: str,
    initiated_by_role: str,
    override_amount: Optional[int] = None,
    override_percent: Optional[float] = None,
) -> Refund:
    """Initiate a refund. Writes Refund + Transaction rows, calls Razorpay."""
    gross_receipt_paise = _booking_amount_to_paise(booking)
    refundable_base_paise = _booking_refundable_base_to_paise(booking)

    if override_amount is not None:
        refund_paise = max(0, min(refundable_base_paise, int(override_amount)))
        percent = round(100.0 * refund_paise / refundable_base_paise, 2) if refundable_base_paise else 0.0
        tier = "admin_override"
    elif override_percent is not None:
        percent = max(0.0, min(100.0, float(override_percent)))
        refund_paise = int(round(refundable_base_paise * percent / 100.0))
        tier = "admin_override"
    else:
        percent, tier = compute_refund_tier(
            _first_present(
                booking.get("check_in_date"),
                booking.get("checkin_date"),
                booking.get("start_date"),
            ),
            booking=booking,
        )
        refund_paise = int(round(refundable_base_paise * percent / 100.0))

    rfd = Refund(
        booking_id=booking["booking_id"],
        guest_id=booking["guest_id"],
        host_id=booking["host_id"],
        original_amount=gross_receipt_paise,
        refund_amount=refund_paise,
        refund_percent=percent,
        policy_tier=tier,
        reason=reason,
        initiated_by=initiated_by,
        initiated_by_role=initiated_by_role,
        razorpay_payment_id=_booking_payment_reference(booking),
        is_mock=razorpay_service.is_mock,
    )

    # Zero-value refund — just record it
    if refund_paise == 0 or not rfd.razorpay_payment_id:
        rfd.status = RefundStatus.PROCESSED
        rfd.processed_at = datetime.now(timezone.utc)
        refund_doc = await build_credit_note_refund_doc(db, rfd, booking)
        refund_doc.update({
            "refund_policy_version": "management_refund_policy_2026",
            "gross_receipt_amount": gross_receipt_paise,
            "refundable_base_amount": refundable_base_paise,
            "refund_base_amount": refundable_base_paise,
            "non_refundable_amount": max(0, gross_receipt_paise - refundable_base_paise),
        })
        await db.refunds.insert_one(refund_doc)
        await record_transaction(
            db,
            type=TransactionType.REFUND,
            amount=refund_paise,
            status=TransactionStatus.SUCCESS,
            razorpay_payment_id=rfd.razorpay_payment_id,
            user_id=rfd.guest_id,
            host_id=rfd.host_id,
            booking_id=rfd.booking_id,
            refund_id=rfd.refund_id,
            notes=f"[{tier}] {reason}",
            is_mock=razorpay_service.is_mock,
        )
        await db.bookings.update_one(
            {"booking_id": rfd.booking_id},
            {"$set": {"refund_status": "processed", "refund_amount": refund_paise}},
        )
        try:
            import asyncio
            from services.booking_notifications import notify_guest_refund_processed
            asyncio.create_task(notify_guest_refund_processed(db, refund_doc))
        except Exception as err:
            logger.warning(f"Failed to start refund notification task: {err}")
        return rfd

    result = razorpay_service.create_refund(
        payment_id=rfd.razorpay_payment_id,
        amount=refund_paise,
        notes={"booking_id": rfd.booking_id, "reason": reason[:200]},
    )

    if result.get("success"):
        rfd.razorpay_refund_id = result["refund"]["id"]
        rfd.status = RefundStatus.PROCESSED
        rfd.processed_at = datetime.now(timezone.utc)
    else:
        rfd.status = RefundStatus.FAILED
        rfd.failure_reason = result.get("error", "unknown")

    refund_doc = await build_credit_note_refund_doc(db, rfd, booking)
    refund_doc.update({
        "refund_policy_version": "management_refund_policy_2026",
        "gross_receipt_amount": gross_receipt_paise,
        "refundable_base_amount": refundable_base_paise,
        "refund_base_amount": refundable_base_paise,
        "non_refundable_amount": max(0, gross_receipt_paise - refundable_base_paise),
    })
    await db.refunds.insert_one(refund_doc)
    await record_transaction(
        db,
        type=TransactionType.REFUND,
        amount=refund_paise,
        status=(
            TransactionStatus.SUCCESS if rfd.status == RefundStatus.PROCESSED else TransactionStatus.FAILED
        ),
        razorpay_payment_id=rfd.razorpay_payment_id,
        razorpay_refund_id=rfd.razorpay_refund_id,
        user_id=rfd.guest_id,
        host_id=rfd.host_id,
        booking_id=rfd.booking_id,
        refund_id=rfd.refund_id,
        notes=f"[{tier}] {reason}",
        is_mock=razorpay_service.is_mock,
    )
    await db.bookings.update_one(
        {"booking_id": rfd.booking_id},
        {"$set": {
            "refund_status": rfd.status.value,
            "refund_amount": refund_paise,
        }},
    )
    if rfd.status == RefundStatus.PROCESSED:
        try:
            import asyncio
            from services.booking_notifications import notify_guest_refund_processed
            asyncio.create_task(notify_guest_refund_processed(db, refund_doc))
        except Exception as err:
            logger.warning(f"Failed to start refund notification task: {err}")
    return rfd


async def ensure_refund_for_cancelled_paid_booking(
    db: AsyncIOMotorDatabase,
    booking: dict,
    *,
    reason: str = "Guest cancellation",
    initiated_by: str = "system",
    initiated_by_role: str = "system",
) -> Optional[dict]:
    """Create the policy refund/credit-note row for cancelled paid bookings once."""
    if not booking or not booking.get("booking_id"):
        return None
    if not is_cancelled_booking(booking) or not is_paid_booking(booking):
        return None

    existing = await db.refunds.find_one({"booking_id": booking["booking_id"]}, {"_id": 0})
    if existing:
        return existing

    booking_for_refund = dict(booking)
    booking_for_refund["payment_id"] = _booking_payment_reference(booking_for_refund)
    refund_doc = await create_refund_request(
        db,
        booking=booking_for_refund,
        reason=reason,
        initiated_by=initiated_by,
        initiated_by_role=initiated_by_role,
    )
    return await db.refunds.find_one({"refund_id": refund_doc.get("refund_id")}, {"_id": 0}) or refund_doc


# --------------- Payout ----------------

def _mask_account(s: str) -> str:
    if not s:
        return ""
    if "@" in s:  # VPA
        return s
    if len(s) <= 4:
        return s
    return f"{'*' * (len(s) - 4)}{s[-4:]}"


async def mark_booking_payout_eligible(
    db: AsyncIOMotorDatabase,
    booking: dict,
    *,
    status: PayoutStatus = PayoutStatus.ELIGIBLE,
    eligible_at: Optional[datetime] = None,
) -> Optional[Payout]:
    """Create a Payout row for a paid booking.

    Newly paid bookings are inserted as PENDING so finance can see the payout
    ledger immediately. Once checkout + payout cycle has passed, the sweep
    promotes the row to ELIGIBLE. Idempotent on booking_id.
    Idempotent on booking_id."""
    existing = await db.payouts.find_one({"booking_id": booking["booking_id"]})
    if existing:
        existing.pop("_id", None)
        return Payout(**existing)

    host = await db.users.find_one({"user_id": booking["host_id"]})
    if not host:
        return None

    pref = host.get("payout_preference") or {}
    dest_type = pref.get("preferred", "upi")
    if dest_type == "upi":
        dest_ref = pref.get("upi_vpa") or ""
    else:
        dest_ref = pref.get("bank_account_number") or ""
    payout_status = status if dest_ref else PayoutStatus.NEEDS_DESTINATION

    payout_breakdown = await calculate_host_payout_breakdown(db, booking=booking)
    gross_paise = payout_breakdown["gross_amount"]
    fee_paise = payout_breakdown["platform_fee"]
    tds_paise = payout_breakdown["tds_amount"]
    net_paise = payout_breakdown["net_amount"]
    tds_breakdown = payout_breakdown.get("tds_breakdown") or {}

    def _rupees_to_paise(value) -> int:
        try:
            return int(round(float(value or 0) * 100))
        except (TypeError, ValueError):
            return 0

    payout = Payout(
        host_id=booking["host_id"],
        booking_id=booking["booking_id"],
        property_id=booking["property_id"],
        gross_amount=gross_paise,
        platform_fee=fee_paise,
        host_actual_value_amount=payout_breakdown.get("host_actual_value_amount", gross_paise),
        total_extra_charges_amount=payout_breakdown.get("total_extra_charges_amount", 0),
        customer_final_payable_amount=payout_breakdown.get("customer_final_payable_amount", 0),
        customer_charge_breakdown=payout_breakdown.get("customer_charge_breakdown") or {},
        tds_amount=tds_paise,
        net_amount=net_paise,
        deductions=payout_breakdown.get("deductions"),
        tds_breakdown=tds_breakdown,
        tds_base_amount=_rupees_to_paise(tds_breakdown.get("tds_base_amount")),
        tds_rate_percent=float(tds_breakdown.get("rate_percent") or 0),
        tds_threshold_amount=_rupees_to_paise(tds_breakdown.get("threshold_amount")),
        tds_fy_gross_before=_rupees_to_paise(tds_breakdown.get("prior_fy_gross")),
        tds_fy_gross_after=_rupees_to_paise(tds_breakdown.get("projected_fy_gross")),
        tds_threshold_crossed=bool(tds_breakdown.get("threshold_crossed")),
        tds_financial_year=tds_breakdown.get("financial_year"),
        gateway_charge=payout_breakdown.get("gateway_charge", 0),
        company_charge=payout_breakdown.get("company_charge", 0),
        destination_type=dest_type,
        destination_ref=_mask_account(dest_ref),
        destination_holder=pref.get("bank_account_holder"),
        destination_ifsc=pref.get("bank_ifsc"),
        status=payout_status,
        failure_reason=None if dest_ref else "Host payout destination is not configured",
        eligible_at=eligible_at or datetime.now(timezone.utc),
    )
    await db.payouts.insert_one(payout.model_dump())
    await record_host_payout_tds_ledger(
        db,
        host_id=booking["host_id"],
        booking_id=booking["booking_id"],
        payout_id=payout.payout_id,
        tds_breakdown={**tds_breakdown, "payout_id": payout.payout_id},
    )
    await db.bookings.update_one(
        {"booking_id": booking["booking_id"]},
        {"$set": {"payout_status": payout.status.value, "payout_id": payout.payout_id}},
    )
    return payout


def _parse_booking_date(value) -> Optional[date]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


async def _payout_due_for_booking(
    db: AsyncIOMotorDatabase, booking: dict, today: date
) -> tuple[PayoutStatus, datetime]:
    host = await db.users.find_one({"user_id": booking.get("host_id")})
    pref = (host or {}).get("payout_preference") or {}
    delay_days = 7

    checkout_date = _parse_booking_date(
        booking.get("check_out_date") or booking.get("checkout_date") or booking.get("end_date")
    )
    if not checkout_date:
        return PayoutStatus.PENDING, datetime.now(timezone.utc)

    due_date = checkout_date + timedelta(days=delay_days)
    due_at = datetime.combine(due_date, datetime.min.time(), tzinfo=timezone.utc)
    if today >= due_date:
        return PayoutStatus.ELIGIBLE, due_at
    return PayoutStatus.PENDING, due_at


async def process_payout(
    db: AsyncIOMotorDatabase, payout_id: str, admin_id: str
) -> Payout:
    """Push an eligible payout through Razorpay (or mock). Idempotent on PAID status."""
    doc = await db.payouts.find_one({"payout_id": payout_id})
    if not doc:
        raise ValueError("Payout not found")
    doc.pop("_id", None)
    payout = Payout(**doc)
    if payout.status == PayoutStatus.PAID:
        return payout
    if payout.status == PayoutStatus.PROCESSING:
        return payout

    # Pull fresh host preference (in case host updated UPI/bank after eligibility)
    host = await db.users.find_one({"user_id": payout.host_id})
    pref = (host or {}).get("payout_preference") or {}
    # Coerce raw-string from mongo into the PayoutDestinationType enum
    raw_pref = pref.get("preferred")
    if raw_pref:
        try:
            dest_type = PayoutDestinationType(raw_pref)
        except ValueError:
            dest_type = payout.destination_type
    else:
        dest_type = payout.destination_type
    dest_ref = pref.get("upi_vpa") if dest_type == PayoutDestinationType.UPI else pref.get("bank_account_number")
    if not dest_ref:
        payout.status = PayoutStatus.NEEDS_DESTINATION
        payout.failure_reason = "Host payout destination is not configured"
        payout.updated_at = datetime.now(timezone.utc)
        await db.payouts.update_one(
            {"payout_id": payout_id}, {"$set": payout.model_dump()}
        )
        return payout

    # Mark processing
    await db.payouts.update_one(
        {"payout_id": payout_id},
        {"$set": {
            "status": PayoutStatus.PROCESSING.value,
            "failure_reason": None,
            "updated_at": datetime.now(timezone.utc),
        }},
    )

    result = razorpay_service.create_payout(
        destination_type=dest_type.value,
        destination_ref=dest_ref,
        amount=payout.net_amount,
        purpose="booking_payout",
        notes={
            "booking_id": payout.booking_id,
            "admin_id": admin_id,
            "host_id": payout.host_id,
            "host_name": (host or {}).get("full_name"),
            "host_email": (host or {}).get("email"),
            "host_phone": (host or {}).get("phone"),
        },
        account_holder=pref.get("bank_account_holder"),
        ifsc=pref.get("bank_ifsc"),
    )

    if result.get("success"):
        payout.razorpay_payout_id = result["payout"]["id"]
        payout.status = PayoutStatus.PAID
        payout.processed_at = datetime.now(timezone.utc)
        payout.is_mock = razorpay_service.is_mock
        payout.destination_ref = _mask_account(dest_ref)
        payout.destination_type = dest_type
    else:
        payout.status = PayoutStatus.FAILED
        payout.failure_reason = result.get("error", "unknown")

    payout.updated_at = datetime.now(timezone.utc)
    await db.payouts.update_one(
        {"payout_id": payout_id}, {"$set": payout.model_dump()}
    )

    await record_transaction(
        db,
        type=TransactionType.PAYOUT,
        amount=payout.net_amount,
        status=(
            TransactionStatus.SUCCESS if payout.status == PayoutStatus.PAID else TransactionStatus.FAILED
        ),
        razorpay_payout_id=payout.razorpay_payout_id,
        host_id=payout.host_id,
        booking_id=payout.booking_id,
        payout_id=payout.payout_id,
        notes=f"{payout.destination_type.value}:{payout.destination_ref}",
        is_mock=razorpay_service.is_mock,
    )

    if payout.status == PayoutStatus.PAID:
        await db.bookings.update_one(
            {"booking_id": payout.booking_id},
            {"$set": {"payout_status": "paid"}},
        )

    return payout


async def sweep_payout_eligibility(db: AsyncIOMotorDatabase) -> int:
    """Create/update booking payout ledger rows.

    Paid bookings are visible immediately as PENDING. Rows become ELIGIBLE only
    after checkout + the host payout cycle. This makes finance/TDS exposure
    visible before the payout can actually be processed.
    """
    today = date.today()
    count = 0

    pending_cursor = db.payouts.find({"status": PayoutStatus.PENDING.value}, {"_id": 0})
    async for payout in pending_cursor:
        try:
            booking = await db.bookings.find_one({"booking_id": payout.get("booking_id")}, {"_id": 0})
            if not booking:
                continue
            status, eligible_at = await _payout_due_for_booking(db, booking, today)
            if status != PayoutStatus.ELIGIBLE:
                continue

            host = await db.users.find_one({"user_id": booking.get("host_id")})
            pref = (host or {}).get("payout_preference") or {}
            dest_type = pref.get("preferred", payout.get("destination_type") or "upi")
            dest_ref = pref.get("upi_vpa") if dest_type == "upi" else pref.get("bank_account_number")
            new_status = PayoutStatus.ELIGIBLE if dest_ref else PayoutStatus.NEEDS_DESTINATION
            payout_breakdown = await calculate_host_payout_breakdown(db, booking=booking)
            tds_breakdown = payout_breakdown.get("tds_breakdown") or {}

            def _rupees_to_paise(value) -> int:
                try:
                    return int(round(float(value or 0) * 100))
                except (TypeError, ValueError):
                    return 0

            await db.payouts.update_one(
                {"payout_id": payout.get("payout_id")},
                {"$set": {
                    "gross_amount": payout_breakdown.get("gross_amount", payout.get("gross_amount", 0)),
                    "host_actual_value_amount": payout_breakdown.get("host_actual_value_amount", payout.get("host_actual_value_amount", 0)),
                    "platform_fee": payout_breakdown.get("platform_fee", payout.get("platform_fee", 0)),
                    "gateway_charge": payout_breakdown.get("gateway_charge", payout.get("gateway_charge", 0)),
                    "company_charge": payout_breakdown.get("company_charge", payout.get("company_charge", 0)),
                    "total_extra_charges_amount": payout_breakdown.get("total_extra_charges_amount", payout.get("total_extra_charges_amount", 0)),
                    "customer_final_payable_amount": payout_breakdown.get("customer_final_payable_amount", payout.get("customer_final_payable_amount", 0)),
                    "customer_charge_breakdown": payout_breakdown.get("customer_charge_breakdown") or payout.get("customer_charge_breakdown") or {},
                    "tds_amount": payout_breakdown.get("tds_amount", payout.get("tds_amount", 0)),
                    "net_amount": payout_breakdown.get("net_amount", payout.get("net_amount", 0)),
                    "deductions": payout_breakdown.get("deductions") or payout.get("deductions") or [],
                    "tds_breakdown": tds_breakdown,
                    "tds_base_amount": _rupees_to_paise(tds_breakdown.get("tds_base_amount")),
                    "tds_rate_percent": float(tds_breakdown.get("rate_percent") or 0),
                    "tds_threshold_amount": _rupees_to_paise(tds_breakdown.get("threshold_amount")),
                    "tds_fy_gross_before": _rupees_to_paise(tds_breakdown.get("prior_fy_gross")),
                    "tds_fy_gross_after": _rupees_to_paise(tds_breakdown.get("projected_fy_gross")),
                    "tds_threshold_crossed": bool(tds_breakdown.get("threshold_crossed")),
                    "tds_financial_year": tds_breakdown.get("financial_year"),
                    "status": new_status.value,
                    "eligible_at": eligible_at,
                    "destination_type": dest_type,
                    "destination_ref": _mask_account(dest_ref or ""),
                    "destination_holder": pref.get("bank_account_holder"),
                    "destination_ifsc": pref.get("bank_ifsc"),
                    "failure_reason": None if dest_ref else "Host payout destination is not configured",
                    "updated_at": datetime.now(timezone.utc),
                }},
            )
            await db.bookings.update_one(
                {"booking_id": booking.get("booking_id")},
                {"$set": {"payout_status": new_status.value, "payout_id": payout.get("payout_id")}},
            )
            count += 1
        except Exception as e:
            logger.warning(f"pending payout promotion failed for {payout.get('booking_id')}: {e}")

    # Only target bookings without an existing payout row
    existing_payout_ids = await db.payouts.distinct("booking_id")

    cursor = db.bookings.find({
        "booking_id": {"$nin": existing_payout_ids},
        "$or": [
            {"booking_status": {"$in": ["confirmed", "completed"]}},
            {"status": {"$in": ["confirmed", "completed"]}},
        ],
        "payment_status": {"$in": ["paid", "success", "captured", "completed"]},
    }, {"_id": 0})

    async for booking in cursor:
        try:
            status, eligible_at = await _payout_due_for_booking(db, booking, today)
            await mark_booking_payout_eligible(db, booking, status=status, eligible_at=eligible_at)
            count += 1
        except Exception as e:
            logger.warning(f"create payout ledger failed for {booking.get('booking_id')}: {e}")

    if count:
        logger.info(f"[payout-sweep] created/updated {count} booking payout ledger rows")
    return count


async def process_auto_eligible_payouts(
    db: AsyncIOMotorDatabase,
    *,
    admin_id: str = "system_auto_payout",
    limit: int = 100,
) -> dict:
    """Automatically process eligible payouts.

    This is intentionally conservative:
    - only ELIGIBLE payouts are processed
    - payouts without destination stay in NEEDS_DESTINATION
    - process_payout remains idempotent for already-paid rows
    """
    cursor = (
        db.payouts.find({"status": PayoutStatus.ELIGIBLE.value}, {"_id": 0})
        .sort("eligible_at", 1)
        .limit(limit)
    )
    payouts = await cursor.to_list(length=limit)
    processed = 0
    failed = 0
    skipped = 0

    for payout_doc in payouts:
        payout_id = payout_doc.get("payout_id")
        if not payout_id:
            skipped += 1
            continue
        try:
            payout = await process_payout(db, payout_id, admin_id=admin_id)
            if payout.status == PayoutStatus.PAID:
                processed += 1
            elif payout.status in {PayoutStatus.FAILED, PayoutStatus.NEEDS_DESTINATION}:
                failed += 1
            else:
                skipped += 1
        except Exception as exc:
            failed += 1
            logger.warning(f"auto payout failed for {payout_id}: {exc}")

    summary = {
        "total": len(payouts),
        "processed": processed,
        "failed": failed,
        "skipped": skipped,
    }
    if payouts:
        logger.info(
            "[auto-payout] total=%s processed=%s failed=%s skipped=%s",
            summary["total"],
            summary["processed"],
            summary["failed"],
            summary["skipped"],
        )
    return summary
