"""Phase 15 — ledger + refund + payout business logic.

Every money movement in PropNest funnels through `record_transaction` so the
admin ledger has a complete audit trail.

Refund policy (tier):
  - >= 7 days before check-in → 100% refund  (tier: full)
  - 2–7 days                  →  50% refund  (tier: partial_50)
  - <  2 days (48h)           →   0% refund  (tier: no_refund)
Admin can override the tier with an explicit amount or percent.

Payout eligibility: booking is confirmed AND check_out_date <= today - 1 day.
Platform fee = 10% of total_amount. Host receives the remaining 90%.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.transaction import (
    Payout,
    PayoutStatus,
    Refund,
    RefundStatus,
    Transaction,
    TransactionStatus,
    TransactionType,
)
from services.razorpay_service import razorpay_service

logger = logging.getLogger(__name__)


PLATFORM_FEE_PCT = 0.10  # 10% platform take; net 90% to host


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

    txn = Transaction(
        type=type,
        amount=amount,
        status=status,
        currency=currency,
        razorpay_order_id=razorpay_order_id,
        razorpay_payment_id=razorpay_payment_id,
        razorpay_refund_id=razorpay_refund_id,
        razorpay_payout_id=razorpay_payout_id,
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
        razorpay_payment_id=booking.get("payment_id"),
        is_mock=razorpay_service.is_mock,
    )

    # Zero-value refund — just record it
    if refund_paise == 0 or not rfd.razorpay_payment_id:
        rfd.status = RefundStatus.PROCESSED
        rfd.processed_at = datetime.utcnow()
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
        return rfd

    result = razorpay_service.create_refund(
        payment_id=rfd.razorpay_payment_id,
        amount=refund_paise,
        notes={"booking_id": rfd.booking_id, "reason": reason[:200]},
    )

    if result.get("success"):
        rfd.razorpay_refund_id = result["refund"]["id"]
        rfd.status = RefundStatus.PROCESSED
        rfd.processed_at = datetime.utcnow()
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
    db: AsyncIOMotorDatabase, booking: dict
) -> Optional[Payout]:
    """Create a Payout row in ELIGIBLE state for a completed booking.
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

    total_rupees = int(booking.get("total_amount", 0))
    gross_paise = total_rupees * 100
    fee_paise = int(round(gross_paise * PLATFORM_FEE_PCT))
    net_paise = gross_paise - fee_paise

    payout = Payout(
        host_id=booking["host_id"],
        booking_id=booking["booking_id"],
        property_id=booking["property_id"],
        gross_amount=gross_paise,
        platform_fee=fee_paise,
        net_amount=net_paise,
        destination_type=dest_type,
        destination_ref=_mask_account(dest_ref),
        destination_holder=pref.get("bank_account_holder"),
        destination_ifsc=pref.get("bank_ifsc"),
        status=PayoutStatus.ELIGIBLE,
    )
    await db.payouts.insert_one(payout.model_dump())
    await db.bookings.update_one(
        {"booking_id": booking["booking_id"]},
        {"$set": {"payout_status": "eligible", "payout_id": payout.payout_id}},
    )
    return payout


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
    dest_type = pref.get("preferred", payout.destination_type)
    dest_ref = pref.get("upi_vpa") if dest_type == "upi" else pref.get("bank_account_number")
    if not dest_ref:
        payout.status = PayoutStatus.FAILED
        payout.failure_reason = "Host has not configured payout destination"
        payout.updated_at = datetime.utcnow()
        await db.payouts.update_one(
            {"payout_id": payout_id}, {"$set": payout.model_dump()}
        )
        return payout

    # Mark processing
    await db.payouts.update_one(
        {"payout_id": payout_id},
        {"$set": {"status": PayoutStatus.PROCESSING.value, "updated_at": datetime.utcnow()}},
    )

    result = razorpay_service.create_payout(
        destination_type=dest_type,
        destination_ref=dest_ref,
        amount=payout.net_amount,
        purpose="booking_payout",
        notes={"booking_id": payout.booking_id, "admin_id": admin_id},
        account_holder=pref.get("bank_account_holder"),
        ifsc=pref.get("bank_ifsc"),
    )

    if result.get("success"):
        payout.razorpay_payout_id = result["payout"]["id"]
        payout.status = PayoutStatus.PAID
        payout.processed_at = datetime.utcnow()
        payout.is_mock = razorpay_service.is_mock
        payout.destination_ref = _mask_account(dest_ref)
        payout.destination_type = dest_type
    else:
        payout.status = PayoutStatus.FAILED
        payout.failure_reason = result.get("error", "unknown")

    payout.updated_at = datetime.utcnow()
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
    """Find confirmed bookings whose check-out is at least 1 day past and mark them eligible."""
    today = date.today()
    threshold = (today - timedelta(days=1)).isoformat()

    # Only target bookings without an existing payout row
    existing_payout_ids = await db.payouts.distinct("booking_id")

    cursor = db.bookings.find({
        "booking_status": "confirmed",
        "payment_status": "paid",
        "check_out_date": {"$lte": threshold},
        "booking_id": {"$nin": existing_payout_ids},
    }, {"_id": 0})

    count = 0
    async for booking in cursor:
        try:
            await mark_booking_payout_eligible(db, booking)
            count += 1
        except Exception as e:
            logger.warning(f"mark_payout_eligible failed for {booking.get('booking_id')}: {e}")

    if count:
        logger.info(f"[payout-sweep] marked {count} bookings as payout_eligible")
    return count
