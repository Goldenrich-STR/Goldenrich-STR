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
from services.booking_calculation_service import calculate_host_payout_breakdown
from services.tds_service import record_host_payout_tds_ledger

logger = logging.getLogger(__name__)


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

def compute_refund_tier(check_in_date: str | date) -> tuple[float, str]:
    """Return (percent, tier_label) based on days until check-in."""
    if isinstance(check_in_date, str):
        check_in = date.fromisoformat(check_in_date)
    else:
        check_in = check_in_date
    days = (check_in - date.today()).days

    if days >= 7:
        return 100.0, "full"
    if days >= 2:
        return 50.0, "partial_50"
    return 0.0, "no_refund"


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
    original = int(booking.get("total_amount", 0))
    # booking.total_amount is stored in rupees; convert to paise for Razorpay
    original_paise = original * 100

    if override_amount is not None:
        refund_paise = max(0, min(original_paise, int(override_amount)))
        percent = round(100.0 * refund_paise / original_paise, 2) if original_paise else 0.0
        tier = "admin_override"
    elif override_percent is not None:
        percent = max(0.0, min(100.0, float(override_percent)))
        refund_paise = int(round(original_paise * percent / 100.0))
        tier = "admin_override"
    else:
        percent, tier = compute_refund_tier(booking["check_in_date"])
        refund_paise = int(round(original_paise * percent / 100.0))

    rfd = Refund(
        booking_id=booking["booking_id"],
        guest_id=booking["guest_id"],
        host_id=booking["host_id"],
        original_amount=original_paise,
        refund_amount=refund_paise,
        refund_percent=percent,
        policy_tier=tier,
        reason=reason,
        initiated_by=initiated_by,
        initiated_by_role=initiated_by_role,
        razorpay_payment_id=booking.get("payment_id") or booking.get("razorpay_payment_id"),
        is_mock=razorpay_service.is_mock,
    )

    # Zero-value refund — just record it
    if refund_paise == 0 or not rfd.razorpay_payment_id:
        rfd.status = RefundStatus.PROCESSED
        rfd.processed_at = datetime.now(timezone.utc)
        await db.refunds.insert_one(rfd.model_dump())
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
            asyncio.create_task(notify_guest_refund_processed(db, rfd.model_dump()))
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

    await db.refunds.insert_one(rfd.model_dump())
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
            asyncio.create_task(notify_guest_refund_processed(db, rfd.model_dump()))
        except Exception as err:
            logger.warning(f"Failed to start refund notification task: {err}")
    return rfd


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
            await db.payouts.update_one(
                {"payout_id": payout.get("payout_id")},
                {"$set": {
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
