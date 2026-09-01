"""Phase 15 — Super Admin Account section: ledger, payouts, refunds, analytics."""
from __future__ import annotations
import csv
import io
import logging
import os
import re
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from middleware.auth_middleware import get_current_user
from models.transaction import (
    InitiateRefundRequest,
    ProcessPayoutRequest,
    PayoutStatus,
    RefundStatus,
    TransactionStatus,
    TransactionType,
)
from models.user import UserRole
from services.account_service import (
    process_auto_eligible_payouts,
    ensure_refund_for_cancelled_paid_booking,
    create_refund_request,
    approve_refund_request,
    reject_refund_request,
    process_payout,
    sweep_payout_eligibility,
)
from services.booking_calculation_service import extract_booking_pricing_snapshot
from services.booking_calculation_service import calculate_host_payout_breakdown

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/account", tags=["Admin Account"])


class RefundDecisionRequest(BaseModel):
    reason: Optional[str] = None


class PartnerSettlementDecisionRequest(BaseModel):
    settlement_id: str
    role: str
    status: str
    booking_id: Optional[str] = None
    partner_id: Optional[str] = None
    partner_code: Optional[str] = None


async def get_db():
    from server import db_instance
    return db_instance


async def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _date_only_for_csv(value) -> str:
    if not value:
        return "NA"
    if isinstance(value, datetime):
        return value.strftime("%d-%m-%Y")
    if isinstance(value, date):
        return value.strftime("%d-%m-%Y")
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return "NA"
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            return parsed.strftime("%d-%m-%Y")
        except ValueError:
            pass
        try:
            parsed_date = datetime.strptime(raw.split("T", 1)[0], "%Y-%m-%d")
            return parsed_date.strftime("%d-%m-%Y")
        except ValueError:
            return raw.split("T", 1)[0]
    return str(value)


def _excel_text(value) -> str:
    text = str(value or "NA").replace('"', '""')
    return f'="{text}"'


def _property_display_name(property_info: Optional[dict]) -> str:
    if not property_info:
        return "NA"
    return (
        property_info.get("title")
        or property_info.get("property_name")
        or property_info.get("name")
        or property_info.get("property_id")
        or "NA"
    )


def _subscription_invoice_breakdown(transaction: dict) -> dict:
    total = round((transaction.get("amount") or 0) / 100, 2)
    subscription = transaction.get("subscription") or {}
    plan = transaction.get("plan") or {}
    tax_percent = float(plan.get("tax_percent") or 18)
    tax_amount = round(total - (total / (1 + tax_percent / 100)), 2) if tax_percent else 0
    taxable_after_discount = round(total - tax_amount, 2)

    plan_fee = plan.get("price_monthly")
    if subscription.get("billing_cycle") == "annual":
        plan_fee = plan.get("price_annual", plan_fee)
    plan_fee = round(float(plan_fee or 0), 2)
    platform_fee = round(float(plan.get("platform_fee") or 0), 2)
    taxable_before_discount = round(plan_fee + platform_fee, 2)
    discount_amount = round(float(subscription.get("discount_amount") or 0), 2)
    if discount_amount <= 0 and taxable_before_discount > taxable_after_discount:
        discount_amount = round(taxable_before_discount - taxable_after_discount, 2)

    return {
        "plan_fee": plan_fee,
        "platform_fee": platform_fee,
        "tax_percent": tax_percent,
        "taxable_before_discount": taxable_before_discount,
        "discount_amount": discount_amount,
        "taxable_amount": taxable_after_discount,
        "cgst": round(tax_amount / 2, 2),
        "sgst": round(tax_amount / 2, 2),
        "igst": 0,
        "total_amount": total,
        "coupon_code": subscription.get("coupon_code") or transaction.get("coupon_code"),
    }


def _amount_rupees(value) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


def _paise_to_rupees(value) -> float:
    return _amount_rupees((value or 0) / 100)


def _booking_invoice_breakdown(transaction: dict) -> dict:
    booking = transaction.get("booking") or {}
    snapshot = extract_booking_pricing_snapshot(booking)
    host_actual = _amount_rupees(snapshot.get("host_actual_value"))
    extra_charges = snapshot.get("extra_charges") or {}
    extra_total = _amount_rupees(snapshot.get("total_extra_charges"))
    if extra_total <= 0:
        extra_total = _amount_rupees(sum(_amount_rupees(value) for value in extra_charges.values()))
    discount = _amount_rupees(snapshot.get("customer_discount_amount") or booking.get("discount_amount"))
    taxable = max(0.0, round(host_actual + extra_total - discount, 2))
    gst_amount = _amount_rupees(snapshot.get("gst_amount") or booking.get("taxes") or booking.get("tax_amount"))
    total = _amount_rupees(snapshot.get("customer_final_payable") or booking.get("total_amount") or ((transaction.get("amount") or 0) / 100))
    if total <= 0:
        total = round(taxable + gst_amount, 2)
    tax_percent = _amount_rupees(booking.get("tax_percent") or booking.get("gst_percent"))
    is_interstate = bool(booking.get("is_interstate") or booking.get("igst_applicable"))
    igst = gst_amount if is_interstate else 0.0
    cgst = 0.0 if is_interstate else round(gst_amount / 2, 2)
    sgst = 0.0 if is_interstate else round(gst_amount / 2, 2)

    return {
        "plan_fee": host_actual,
        "platform_fee": _amount_rupees(extra_charges.get("platform_fee")),
        "taxable_before_discount": round(host_actual + extra_total, 2),
        "base_amount": host_actual,
        "gross": host_actual,
        "extra_charges_total": extra_total,
        "extra_charges": {key: _amount_rupees(value) for key, value in extra_charges.items()},
        "coupon_code": booking.get("coupon_code") or transaction.get("coupon_code") or "",
        "discount_amount": discount,
        "taxable_amount": taxable,
        "tax_percent": tax_percent,
        "igst": round(igst, 2),
        "cgst": cgst,
        "sgst": sgst,
        "gst_amount": gst_amount,
        "total_amount": total,
    }


BOOKING_TRANSACTION_PROJECTION = {
    "_id": 0,
    "booking_id": 1,
    "property": 1,
    "property_id": 1,
    "guest_id": 1,
    "host_id": 1,
    "broker_id": 1,
    "broker_lg_code": 1,
    "rm_id": 1,
    "employee_id": 1,
    "employee_code": 1,
    "branch_manager_id": 1,
    "branch_manager_code": 1,
    "check_in_date": 1,
    "check_out_date": 1,
    "number_of_guests": 1,
    "created_at": 1,
    "booking_status": 1,
    "payment_status": 1,
    "payment_method": 1,
    "payment_type": 1,
    "razorpay_order_id": 1,
    "razorpay_payment_id": 1,
    "upi_transaction_id": 1,
    "base_amount": 1,
    "host_amount": 1,
    "host_base_amount": 1,
    "host_actual_value": 1,
    "total_amount": 1,
    "paid_amount": 1,
    "platform_fee": 1,
    "service_fee": 1,
    "customer_charge_breakdown": 1,
    "payment_gateway_charge": 1,
    "gateway_charge": 1,
    "convenience_fee": 1,
    "insurance_fee": 1,
    "cleaning_fee": 1,
    "extra_guest_fee": 1,
    "taxes": 1,
    "tax_amount": 1,
    "gst_amount": 1,
    "tax_percent": 1,
    "gst_percent": 1,
    "coupon_code": 1,
    "discount_amount": 1,
    "customer_discount_amount": 1,
    "pricing": 1,
    "pricing_snapshot": 1,
    "pricing_breakdown": 1,
    "breakdown": 1,
    "extra_charges": 1,
    "customer_charge_breakdown": 1,
    "charge_breakdown": 1,
    "applied_charges": 1,
}


async def _find_booking_for_transaction(db: AsyncIOMotorDatabase, t: dict) -> Optional[dict]:
    """Resolve booking rows even when older ledgers stored an alternate reference."""
    exact_booking_id = t.get("booking_id")
    if exact_booking_id:
        booking = await db.bookings.find_one(
            {"booking_id": exact_booking_id},
            BOOKING_TRANSACTION_PROJECTION,
        )
        if booking:
            return booking
        booking = await db.bookings.find_one(
            {"booking_id": {"$regex": f"{re.escape(str(exact_booking_id))}$", "$options": "i"}},
            BOOKING_TRANSACTION_PROJECTION,
            sort=[("created_at", -1)],
        )
        if booking:
            return booking

    payment_refs = [
        t.get("razorpay_payment_id"),
        t.get("upi_transaction_id"),
        t.get("payment_id"),
        t.get("payment_reference"),
    ]
    order_refs = [t.get("razorpay_order_id")]
    or_conditions = []
    for ref in [value for value in payment_refs if value]:
        or_conditions.extend([
            {"razorpay_payment_id": ref},
            {"upi_transaction_id": ref},
            {"payment_id": ref},
        ])
    for ref in [value for value in order_refs if value]:
        or_conditions.append({"razorpay_order_id": ref})

    if or_conditions:
        booking = await db.bookings.find_one(
            {"$or": or_conditions},
            BOOKING_TRANSACTION_PROJECTION,
        )
        if booking:
            return booking

    amount_rupees = _amount_rupees((t.get("amount") or 0) / 100)
    if amount_rupees <= 0:
        return None

    amount_conditions = [
        {"total_amount": amount_rupees},
        {"paid_amount": amount_rupees},
    ]
    scoped_conditions = [
        {"guest_id": t.get("user_id")} if t.get("user_id") else None,
        {"host_id": t.get("host_id")} if t.get("host_id") else None,
    ]
    created_at = t.get("created_at")
    created_filter = {}
    if isinstance(created_at, datetime):
        created_filter = {
            "created_at": {
                "$gte": created_at - timedelta(days=2),
                "$lte": created_at + timedelta(days=2),
            }
        }

    for scope in [condition for condition in scoped_conditions if condition]:
        booking = await db.bookings.find_one(
            {
                **scope,
                **created_filter,
                "$or": amount_conditions,
                "payment_status": {"$in": ["paid", "partially_paid", "success", "captured", "completed"]},
            },
            BOOKING_TRANSACTION_PROJECTION,
            sort=[("created_at", -1)],
        )
        if booking:
            return booking
    return None


# --------------- Overview ----------------

@router.get("/overview")
async def overview(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """High-level revenue + payout + refund stats for admin dashboard."""
    try:
        # Revenue breakdown (all-time, all in paise)
        pipeline = [
            {"$match": {"status": TransactionStatus.SUCCESS.value}},
            {"$group": {
                "_id": "$type",
                "total_paise": {"$sum": "$amount"},
                "count": {"$sum": 1},
            }},
        ]
        rows = await db.transactions.aggregate(pipeline).to_list(length=20)
        agg = {r["_id"]: {"amount_paise": r["total_paise"], "count": r["count"]} for r in rows}

        booking_rev = agg.get(TransactionType.BOOKING_PAYMENT.value, {"amount_paise": 0, "count": 0})
        reg_rev = agg.get(TransactionType.REGISTRATION_FEE.value, {"amount_paise": 0, "count": 0})
        sub_rev = agg.get(TransactionType.SUBSCRIPTION.value, {"amount_paise": 0, "count": 0})
        refunds = agg.get(TransactionType.REFUND.value, {"amount_paise": 0, "count": 0})
        payouts = agg.get(TransactionType.PAYOUT.value, {"amount_paise": 0, "count": 0})

        # Platform take = booking GMV * 10% (our margin)
        platform_take = int(round(booking_rev["amount_paise"] * 0.10))

        total_gross = (
            booking_rev["amount_paise"] + reg_rev["amount_paise"] + sub_rev["amount_paise"]
        )
        total_net = total_gross - refunds["amount_paise"] - payouts["amount_paise"]

        # Pending payouts (eligible but not yet paid)
        pending_payouts_count = await db.payouts.count_documents(
            {"status": PayoutStatus.ELIGIBLE.value}
        )
        pending_payouts_amount_cursor = db.payouts.aggregate([
            {"$match": {"status": PayoutStatus.ELIGIBLE.value}},
            {"$group": {"_id": None, "total": {"$sum": "$net_amount"}}},
        ])
        pending_rows = await pending_payouts_amount_cursor.to_list(length=1)
        pending_payouts_amount = pending_rows[0]["total"] if pending_rows else 0
        booking_tax_cursor = db.bookings.aggregate([
            {"$match": {"booking_status": {"$nin": ["cancelled", "failed"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$taxes"}}},
        ])
        booking_tax_rows = await booking_tax_cursor.to_list(length=1)
        booking_tax_paise = int(round(float(booking_tax_rows[0]["total"] or 0) * 100)) if booking_tax_rows else 0

        # MRR — sum of monthly-equivalent from active subscriptions
        mrr = await _compute_mrr(db)

        return {
            "revenue": {
                "total_gross_paise": total_gross,
                "total_net_paise": total_net,
                "platform_take_paise": platform_take,
                "booking_payments_paise": booking_rev["amount_paise"],
                "registration_fees_paise": reg_rev["amount_paise"],
                "subscriptions_paise": sub_rev["amount_paise"],
                "refunds_paise": refunds["amount_paise"],
                "payouts_paid_paise": payouts["amount_paise"],
                "total_tax_paise": booking_tax_paise,
            },
            "counts": {
                "booking_payments": booking_rev["count"],
                "registration_fees": reg_rev["count"],
                "subscriptions": sub_rev["count"],
                "refunds": refunds["count"],
                "payouts_paid": payouts["count"],
            },
            "pending_payouts": {
                "count": pending_payouts_count,
                "amount_paise": pending_payouts_amount,
            },
            "mrr_paise": mrr,
            "currency": "INR",
        }
    except Exception as e:
        logger.exception("overview failed")
        raise HTTPException(500, detail=f"Failed to load overview: {e}")


async def _compute_mrr(db: AsyncIOMotorDatabase) -> int:
    """Sum of monthly-equivalent price of active subscriptions, in paise."""
    cursor = db.subscriptions.find(
        {"status": {"$in": ["active", "trial"]}}, {"_id": 0}
    )
    plans = {p["plan_id"]: p async for p in db.subscription_plans.find({}, {"_id": 0})}
    mrr_paise = 0
    async for sub in cursor:
        plan = plans.get(sub.get("plan_id"))
        if not plan:
            continue
        price = plan.get("price", 0)  # stored in rupees
        duration_months = plan.get("duration_months", 1) or 1
        mrr_paise += int(round((price * 100) / duration_months))
    return mrr_paise


# --------------- MRR chart (last N months) ----------------

@router.get("/mrr-chart")
async def mrr_chart(
    months: int = Query(6, ge=1, le=24),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Monthly revenue trend for the last N months (all-in: bookings+reg+subs minus refunds)."""
    today = date.today()
    # Build month buckets newest→oldest
    buckets = []
    cur_year, cur_month = today.year, today.month
    for _ in range(months):
        start = date(cur_year, cur_month, 1)
        # next month
        if cur_month == 12:
            nxt = date(cur_year + 1, 1, 1)
        else:
            nxt = date(cur_year, cur_month + 1, 1)
        buckets.append({"label": start.strftime("%b %Y"), "start": start, "end": nxt})
        # step back one month
        if cur_month == 1:
            cur_year, cur_month = cur_year - 1, 12
        else:
            cur_month -= 1
    buckets.reverse()

    out = []
    for b in buckets:
        q = {
            "status": TransactionStatus.SUCCESS.value,
            "created_at": {
                "$gte": datetime.combine(b["start"], datetime.min.time()),
                "$lt": datetime.combine(b["end"], datetime.min.time()),
            },
        }
        # inflows
        in_cursor = db.transactions.aggregate([
            {"$match": {**q, "type": {"$in": [
                TransactionType.BOOKING_PAYMENT.value,
                TransactionType.REGISTRATION_FEE.value,
                TransactionType.SUBSCRIPTION.value,
            ]}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ])
        in_rows = await in_cursor.to_list(length=1)
        inflow = in_rows[0]["total"] if in_rows else 0

        out_cursor = db.transactions.aggregate([
            {"$match": {**q, "type": TransactionType.REFUND.value}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ])
        out_rows = await out_cursor.to_list(length=1)
        outflow = out_rows[0]["total"] if out_rows else 0

        out.append({
            "label": b["label"],
            "inflow_paise": inflow,
            "refund_paise": outflow,
            "net_paise": inflow - outflow,
        })
    return {"months": out}


# --------------- Top-earning hosts ----------------

@router.get("/top-hosts")
async def top_hosts(
    limit: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Hosts ranked by total booking payment (gross) associated with their listings."""
    pipeline = [
        {"$match": {
            "type": TransactionType.BOOKING_PAYMENT.value,
            "status": TransactionStatus.SUCCESS.value,
            "host_id": {"$ne": None},
        }},
        {"$group": {
            "_id": "$host_id",
            "gross_paise": {"$sum": "$amount"},
            "bookings": {"$sum": 1},
        }},
        {"$sort": {"gross_paise": -1}},
        {"$limit": limit},
    ]
    rows = await db.transactions.aggregate(pipeline).to_list(length=limit)

    out = []
    for r in rows:
        host = await db.users.find_one(
            {"user_id": r["_id"]}, {"_id": 0, "full_name": 1, "email": 1, "city": 1}
        )
        if not host:
            continue
        out.append({
            "host_id": r["_id"],
            "full_name": host.get("full_name"),
            "email": host.get("email"),
            "city": host.get("city"),
            "gross_paise": r["gross_paise"],
            "bookings": r["bookings"],
            "platform_take_paise": int(round(r["gross_paise"] * 0.10)),
        })
    return {"hosts": out, "total": len(out)}


# --------------- Transactions ledger ----------------

async def _txn_query_async(
    db: AsyncIOMotorDatabase,
    type: Optional[str],
    status: Optional[str],
    start: Optional[str],
    end: Optional[str],
    q: Optional[str],
    customer_name: Optional[str] = None,
    employee_name: Optional[str] = None,
    mobile_no: Optional[str] = None,
    booking_id: Optional[str] = None,
    payment_id: Optional[str] = None,
    broker_name: Optional[str] = None,
    property_type: Optional[str] = None,
) -> dict:
    query: dict = {}
    and_conditions = []
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    if start or end:
        created = {}
        if start:
            created["$gte"] = datetime.fromisoformat(start)
        if end:
            created["$lt"] = datetime.fromisoformat(end) + timedelta(days=1)
        query["created_at"] = created
    if q:
        # Search the users table for full_name, email, or phone matching query
        user_ids = []
        user_cursor = db.users.find({
            "$or": [
                {"full_name": {"$regex": q, "$options": "i"}},
                {"email": {"$regex": q, "$options": "i"}},
                {"phone": {"$regex": q, "$options": "i"}},
            ]
        }, {"user_id": 1, "_id": 0})
        async for u in user_cursor:
            user_ids.append(u["user_id"])
            
        or_conditions = [
            {"booking_id": {"$regex": q, "$options": "i"}},
            {"razorpay_payment_id": {"$regex": q, "$options": "i"}},
            {"upi_transaction_id": {"$regex": q, "$options": "i"}},
            {"razorpay_payout_id": {"$regex": q, "$options": "i"}},
            {"razorpay_refund_id": {"$regex": q, "$options": "i"}},
            {"transaction_id": {"$regex": q, "$options": "i"}},
        ]
        
        if user_ids:
            or_conditions.append({"user_id": {"$in": user_ids}})
            or_conditions.append({"host_id": {"$in": user_ids}})
            
        and_conditions.append({"$or": or_conditions})

    if customer_name:
        customer_ids = []
        user_cursor = db.users.find(
            {"full_name": {"$regex": customer_name, "$options": "i"}},
            {"user_id": 1, "_id": 0},
        )
        async for u in user_cursor:
            customer_ids.append(u["user_id"])
        and_conditions.append({"$or": [{"user_id": {"$in": customer_ids}}, {"host_id": {"$in": customer_ids}}]})

    if mobile_no:
        mobile_user_ids = []
        user_cursor = db.users.find(
            {"phone": {"$regex": mobile_no, "$options": "i"}},
            {"user_id": 1, "_id": 0},
        )
        async for u in user_cursor:
            mobile_user_ids.append(u["user_id"])
        and_conditions.append({"$or": [{"user_id": {"$in": mobile_user_ids}}, {"host_id": {"$in": mobile_user_ids}}]})

    if booking_id:
        and_conditions.append({"booking_id": {"$regex": booking_id, "$options": "i"}})

    if payment_id:
        and_conditions.append({"$or": [
            {"razorpay_payment_id": {"$regex": payment_id, "$options": "i"}},
            {"upi_transaction_id": {"$regex": payment_id, "$options": "i"}},
            {"razorpay_order_id": {"$regex": payment_id, "$options": "i"}},
            {"razorpay_payout_id": {"$regex": payment_id, "$options": "i"}},
            {"razorpay_refund_id": {"$regex": payment_id, "$options": "i"}},
            {"transaction_id": {"$regex": payment_id, "$options": "i"}},
        ]})

    if broker_name:
        broker_ids = []
        broker_cursor = db.users.find(
            {"role": "broker", "full_name": {"$regex": broker_name, "$options": "i"}},
            {"user_id": 1, "_id": 0},
        )
        async for b in broker_cursor:
            broker_ids.append(b["user_id"])
        host_ids = []
        if broker_ids:
            host_cursor = db.users.find(
                {"broker_id": {"$in": broker_ids}},
                {"user_id": 1, "_id": 0},
            )
            async for h in host_cursor:
                host_ids.append(h["user_id"])
        property_ids = []
        property_cursor = db.properties.find(
            {"broker_id": {"$in": broker_ids}},
            {"property_id": 1, "_id": 0},
        )
        async for p in property_cursor:
            property_ids.append(p["property_id"])
        and_conditions.append({"$or": [
            {"user_id": {"$in": host_ids}},
            {"host_id": {"$in": host_ids}},
            {"property_id": {"$in": property_ids}},
        ]})

    if employee_name:
        employee_ids = []
        employee_codes = []
        employee_cursor = db.users.find(
            {"role": "employee", "full_name": {"$regex": employee_name, "$options": "i"}},
            {"user_id": 1, "employee_code": 1, "_id": 0},
        )
        async for emp in employee_cursor:
            employee_ids.append(emp["user_id"])
            if emp.get("employee_code"):
                employee_codes.append(emp["employee_code"])
        broker_ids = []
        if employee_ids:
            broker_cursor = db.users.find(
                {"role": "broker", "rm_id": {"$in": employee_ids}},
                {"user_id": 1, "_id": 0},
            )
            async for b in broker_cursor:
                broker_ids.append(b["user_id"])
        host_or = []
        if employee_ids:
            host_or.append({"rm_id": {"$in": employee_ids}})
        if employee_codes:
            host_or.append({"employee_code": {"$in": employee_codes}})
        if broker_ids:
            host_or.append({"broker_id": {"$in": broker_ids}})
        host_ids = []
        if host_or:
            host_cursor = db.users.find({"$or": host_or}, {"user_id": 1, "_id": 0})
            async for h in host_cursor:
                host_ids.append(h["user_id"])
        property_or = []
        if employee_ids:
            property_or.append({"rm_id": {"$in": employee_ids}})
        if broker_ids:
            property_or.append({"broker_id": {"$in": broker_ids}})
        property_ids = []
        if property_or:
            property_cursor = db.properties.find({"$or": property_or}, {"property_id": 1, "_id": 0})
            async for p in property_cursor:
                property_ids.append(p["property_id"])
        and_conditions.append({"$or": [
            {"user_id": {"$in": host_ids}},
            {"host_id": {"$in": host_ids}},
            {"property_id": {"$in": property_ids}},
        ]})

    if property_type:
        property_ids = []
        property_cursor = db.properties.find(
            {"$or": [
                {"property_type": {"$regex": property_type, "$options": "i"}},
                {"bhk_type": {"$regex": property_type, "$options": "i"}},
                {"category": {"$regex": property_type, "$options": "i"}},
            ]},
            {"property_id": 1, "_id": 0},
        )
        async for p in property_cursor:
            property_ids.append(p["property_id"])
        subscription_ids = []
        sub_cursor = db.subscriptions.find(
            {"$or": [
                {"property_type": {"$regex": property_type, "$options": "i"}},
                {"plan_type": {"$regex": property_type, "$options": "i"}},
            ]},
            {"subscription_id": 1, "_id": 0},
        )
        async for s in sub_cursor:
            subscription_ids.append(s["subscription_id"])
        plan_ids = []
        plan_cursor = db.subscription_plans.find(
            {"$or": [
                {"property_type": {"$regex": property_type, "$options": "i"}},
                {"bhk_type": {"$regex": property_type, "$options": "i"}},
                {"plan_type": {"$regex": property_type, "$options": "i"}},
                {"plan_name": {"$regex": property_type, "$options": "i"}},
            ]},
            {"plan_id": 1, "_id": 0},
        )
        async for p in plan_cursor:
            plan_ids.append(p["plan_id"])
        if plan_ids:
            sub_cursor = db.subscriptions.find(
                {"plan_id": {"$in": plan_ids}},
                {"subscription_id": 1, "_id": 0},
            )
            async for s in sub_cursor:
                subscription_ids.append(s["subscription_id"])
        and_conditions.append({"$or": [
            {"property_id": {"$in": property_ids}},
            {"subscription_id": {"$in": list(set(subscription_ids))}},
        ]})

    if and_conditions:
        query["$and"] = and_conditions
    return query


def _coerce_datetime(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day, tzinfo=timezone.utc)
    if isinstance(value, str):
        raw = value.strip()
        if raw:
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
            except ValueError:
                try:
                    return datetime.strptime(raw.split("T", 1)[0], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                except ValueError:
                    pass
    return datetime.now(timezone.utc)


def _financial_year_label(value=None) -> str:
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    dt = _coerce_datetime(value).astimezone(ist_tz)
    start_year = dt.year if dt.month >= 4 else dt.year - 1
    return f"{str(start_year)[-2:]}-{str(start_year + 1)[-2:]}"


def _useful_text(*values) -> Optional[str]:
    for value in values:
        if value in (None, ""):
            continue
        text = str(value).strip()
        if text and text.upper() not in {"NA", "N/A", "-"}:
            return text
    return None


def _booking_invoice_suffix(*values) -> Optional[str]:
    value = _useful_text(*values)
    if not value:
        return None
    compact = re.sub(r"[^A-Za-z0-9]", "", str(value)).upper()
    return compact[-5:] if compact else None


def _customer_booking_invoice_no(record: Optional[dict] = None, fallback_date=None) -> Optional[str]:
    record = record or {}
    explicit = _useful_text(
        record.get("customer_invoice_no"),
        record.get("tax_invoice_no"),
        record.get("booking_invoice_no"),
        record.get("invoice_no"),
        record.get("invoice_number"),
    )
    if explicit and explicit.upper().startswith("STRC/"):
        return explicit

    if explicit and explicit.upper().startswith("STRB/"):
        return f"STRC/{explicit.split('/', 1)[1]}"
    return explicit


async def get_invoice_number(db: AsyncIOMotorDatabase, t: dict) -> str:
    t_type = t.get("type")
    if t_type in ("booking_payment", "refund"):
        invoice_no = _customer_booking_invoice_no(t, t.get("created_at"))
        if invoice_no:
            return invoice_no
        prefix = "STRC"
        types_list = ["booking_payment", "refund"]
    else:
        prefix = "STRS"
        types_list = ["subscription", "registration_fee"]
        
    created_at = _coerce_datetime(t.get("created_at"))
    
    # IST is UTC + 5:30
    ist_tz = timezone(timedelta(hours=5, minutes=30))
    created_at_ist = created_at.astimezone(ist_tz)
    
    year = created_at_ist.year
    month = created_at_ist.month
    
    if month >= 4:
        start_year = year
        end_year = year + 1
    else:
        start_year = year - 1
        end_year = year
        
    fy_str = f"{str(start_year)[-2:]}-{str(end_year)[-2:]}"
    
    fy_start_ist = datetime(start_year, 4, 1, 0, 0, 0, tzinfo=ist_tz)
    fy_start_utc = fy_start_ist.astimezone(timezone.utc)
    
    older_count = await db.transactions.count_documents({
        "type": {"$in": types_list},
        "created_at": {"$gte": fy_start_utc, "$lt": created_at}
    })
    
    same_count = await db.transactions.count_documents({
        "type": {"$in": types_list},
        "created_at": created_at,
        "transaction_id": {"$lte": t.get("transaction_id", "")}
    })
    
    count = older_count + same_count
    return f"{prefix}/{fy_str}/{count:05d}"


@router.get("/transactions")
async def list_transactions(
    type: Optional[str] = None,
    status: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    q: Optional[str] = None,
    customer_name: Optional[str] = None,
    employee_name: Optional[str] = None,
    mobile_no: Optional[str] = None,
    booking_id: Optional[str] = None,
    payment_id: Optional[str] = None,
    broker_name: Optional[str] = None,
    property_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        query = await _txn_query_async(
            db, type, status, start, end, q,
            customer_name, employee_name, mobile_no, booking_id, payment_id, broker_name, property_type,
        )
        cursor = (
            db.transactions.find(query, {"_id": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        items = await cursor.to_list(length=limit)
        total = await db.transactions.count_documents(query)
        
        # Enrich transactions with invoice, customer, broker, RM and subscription details.
        for t in items:
            t["invoice_no"] = await get_invoice_number(db, t)
            booking = await _find_booking_for_transaction(db, t)
            payout = None
            t["booking"] = booking
            if booking:
                t["booking_id"] = booking.get("booking_id") or t.get("booking_id")
                t["user_id"] = t.get("user_id") or booking.get("guest_id")
                t["host_id"] = t.get("host_id") or booking.get("host_id")
                t["property_id"] = t.get("property_id") or booking.get("property_id")
                t["booking_invoice_breakdown"] = _booking_invoice_breakdown({**t, "booking": booking})
                t["invoice_breakdown"] = t["booking_invoice_breakdown"]
            elif t.get("booking_id"):
                payout = await db.payouts.find_one(
                    {"booking_id": t["booking_id"]},
                    {
                        "_id": 0,
                        "booking_id": 1,
                        "property_id": 1,
                        "host_id": 1,
                        "guest_id": 1,
                        "user_id": 1,
                        "gross_amount": 1,
                        "net_amount": 1,
                        "platform_fee": 1,
                        "gateway_charge": 1,
                        "company_charge": 1,
                        "insurance_fee": 1,
                        "total_extra_charges_amount": 1,
                        "customer_final_payable_amount": 1,
                        "customer_charge_breakdown": 1,
                        "created_at": 1,
                    },
                )
                if payout:
                    t["payout"] = payout
                    total_amount = _paise_to_rupees(payout.get("customer_final_payable_amount") or t.get("amount"))
                    host_actual = _paise_to_rupees(payout.get("gross_amount")) or total_amount
                    total_extra = _paise_to_rupees(payout.get("total_extra_charges_amount"))
                    charge_breakdown = {
                        key: _paise_to_rupees(value)
                        for key, value in (payout.get("customer_charge_breakdown") or {}).items()
                    }
                    if total_extra <= 0 and charge_breakdown:
                        total_extra = _amount_rupees(sum(charge_breakdown.values()))
                    booking = {
                        "booking_id": t.get("booking_id"),
                        "property_id": payout.get("property_id"),
                        "guest_id": payout.get("guest_id") or payout.get("user_id") or t.get("user_id"),
                        "host_id": payout.get("host_id") or t.get("host_id"),
                        "created_at": t.get("created_at") or payout.get("created_at"),
                        "booking_status": "Booking Confirmed",
                        "payment_status": "Paid" if t.get("status") == TransactionStatus.SUCCESS.value else t.get("status"),
                        "payment_method": "Online Payment",
                        "razorpay_payment_id": t.get("razorpay_payment_id"),
                        "upi_transaction_id": t.get("upi_transaction_id"),
                        "host_actual_value": host_actual,
                        "total_extra_charges": total_extra,
                        "customer_charge_breakdown": charge_breakdown,
                        "total_amount": total_amount,
                        "paid_amount": total_amount,
                    }
                    t["booking"] = booking
                    t["user_id"] = t.get("user_id") or booking.get("guest_id")
                    t["host_id"] = t.get("host_id") or booking.get("host_id")
                    t["property_id"] = t.get("property_id") or booking.get("property_id")
                    t["booking_invoice_breakdown"] = _booking_invoice_breakdown({**t, "booking": booking})
                    t["invoice_breakdown"] = t["booking_invoice_breakdown"]

            subscription = None
            if t.get("subscription_id"):
                subscription = await db.subscriptions.find_one(
                    {"subscription_id": t["subscription_id"]},
                    {"_id": 0},
                )
                t["subscription"] = subscription
                if subscription:
                    t["plan"] = await db.subscription_plans.find_one(
                        {"plan_id": subscription.get("plan_id")},
                        {
                            "_id": 0,
                            "plan_id": 1,
                            "plan_name": 1,
                            "plan_type": 1,
                            "property_category": 1,
                            "property_type": 1,
                            "bhk_type": 1,
                            "platform_fee": 1,
                            "tax_percent": 1,
                            "price_monthly": 1,
                            "price_annual": 1,
                            "sqft_range": 1,
                        },
                    )
                    t["invoice_breakdown"] = _subscription_invoice_breakdown(t)

            property_info = None
            property_id = t.get("property_id") or (booking or {}).get("property_id") or (subscription or {}).get("property_id")
            if booking and isinstance(booking.get("property"), dict):
                property_info = booking["property"]
            if property_id:
                property_info = await db.properties.find_one(
                    {"property_id": property_id},
                    {
                        "_id": 0,
                        "property_id": 1,
                        "title": 1,
                        "property_name": 1,
                        "name": 1,
                        "owner_id": 1,
                        "broker_id": 1,
                        "assigned_broker_id": 1,
                        "broker_code": 1,
                        "lg_code": 1,
                        "rm_id": 1,
                        "employee_id": 1,
                        "assigned_employee_id": 1,
                        "employee_code": 1,
                        "branch_manager_id": 1,
                        "branch_manager_code": 1,
                        "address": 1,
                        "city": 1,
                        "state": 1,
                        "pin_code": 1,
                        "amenities": 1,
                        "top_amenities": 1,
                        "check_in_time": 1,
                        "check_out_time": 1,
                        "property_type": 1,
                        "bhk_type": 1,
                        "room_type": 1,
                    },
                ) or property_info
            t["property"] = property_info

            uid = t.get("user_id") or (booking or {}).get("guest_id") or t.get("host_id") or (subscription or {}).get("user_id")
            user_info = None
            if uid:
                user_info = await db.users.find_one(
                    {"user_id": uid},
                    {
                        "_id": 0,
                        "user_id": 1,
                        "role": 1,
                        "full_name": 1,
                        "email": 1,
                        "phone": 1,
                        "lg_code": 1,
                        "employee_code": 1,
                        "broker_id": 1,
                        "rm_id": 1,
                        "branch_manager_id": 1,
                        "branch_manager_code": 1,
                        "gst_number": 1,
                        "gst_no": 1,
                    },
                )
            host_info = None
            host_id = t.get("host_id") or (booking or {}).get("host_id") or (property_info or {}).get("owner_id")
            if host_id:
                host_info = await db.users.find_one(
                    {"user_id": host_id},
                    {
                        "_id": 0,
                        "user_id": 1,
                        "role": 1,
                        "full_name": 1,
                        "email": 1,
                        "phone": 1,
                        "lg_code": 1,
                        "employee_code": 1,
                        "broker_id": 1,
                        "rm_id": 1,
                        "branch_manager_id": 1,
                        "branch_manager_code": 1,
                        "gst_number": 1,
                        "gst_no": 1,
                    },
                )
            if not user_info and property_info and property_info.get("owner_id"):
                user_info = await db.users.find_one(
                    {"user_id": property_info["owner_id"]},
                    {
                        "_id": 0,
                        "user_id": 1,
                        "role": 1,
                        "full_name": 1,
                        "email": 1,
                        "phone": 1,
                        "lg_code": 1,
                        "employee_code": 1,
                        "broker_id": 1,
                        "rm_id": 1,
                        "branch_manager_id": 1,
                        "branch_manager_code": 1,
                        "gst_number": 1,
                        "gst_no": 1,
                    },
                )
            t["user"] = user_info
            t["host"] = host_info or (user_info if (user_info or {}).get("user_id") == host_id else None)
            broker_info = None
            employee_info = None
            branch_manager_info = None
            if user_info or host_info or property_info or booking:
                assignment_host = host_info or (user_info if (user_info or {}).get("role") == "host" else None)
                broker_id = _first_present(
                    (booking or {}).get("broker_id"),
                    (assignment_host or {}).get("broker_id"),
                    None if assignment_host else (property_info or {}).get("broker_id"),
                    None if assignment_host else (property_info or {}).get("assigned_broker_id"),
                    None if assignment_host else (user_info or {}).get("broker_id"),
                )
                explicit_broker_code = _first_present(
                    (booking or {}).get("broker_lg_code"),
                    None if assignment_host else (property_info or {}).get("broker_code"),
                    None if assignment_host else (property_info or {}).get("lg_code"),
                )
                host_broker_code = _first_present(
                    (assignment_host or {}).get("lg_code"),
                )
                broker_code = explicit_broker_code or (host_broker_code if broker_id else None)
                rm_id = _first_present(
                    (booking or {}).get("rm_id"),
                    (booking or {}).get("employee_id"),
                    (assignment_host or {}).get("rm_id"),
                    None if assignment_host else (property_info or {}).get("rm_id"),
                    None if assignment_host else (property_info or {}).get("employee_id"),
                    None if assignment_host else (property_info or {}).get("assigned_employee_id"),
                    None if assignment_host else (user_info or {}).get("rm_id"),
                )
                rm_code = _first_present(
                    (booking or {}).get("rm_code"),
                    (booking or {}).get("employee_code"),
                    (assignment_host or {}).get("employee_code"),
                    None if assignment_host else (property_info or {}).get("rm_code"),
                    None if assignment_host else (property_info or {}).get("employee_code"),
                    None if assignment_host else (user_info or {}).get("employee_code"),
                    host_broker_code if not broker_id else None,
                )
                employee_code = _first_present(
                    rm_code,
                )
                branch_manager_ref = _first_present(
                    (booking or {}).get("branch_manager_id"),
                    (booking or {}).get("branch_manager_code"),
                    (assignment_host or {}).get("branch_manager_id"),
                    (assignment_host or {}).get("branch_manager_code"),
                    None if assignment_host else (property_info or {}).get("branch_manager_id"),
                    None if assignment_host else (property_info or {}).get("branch_manager_code"),
                    None if assignment_host else (user_info or {}).get("branch_manager_id"),
                    None if assignment_host else (user_info or {}).get("branch_manager_code"),
                )
                if broker_id:
                    broker_info = await db.users.find_one(
                        {"user_id": broker_id, "role": "broker"},
                        {"_id": 0, "user_id": 1, "uid": 1, "full_name": 1, "lg_code": 1, "employee_code": 1, "rm_id": 1, "pan_number": 1, "pan": 1, "gst_number": 1, "gst_no": 1, "gstin": 1},
                    )
                if not broker_info and broker_code:
                    broker_info = await db.users.find_one(
                        {
                            "role": "broker",
                            "$or": [
                                {"lg_code": {"$regex": f"^{re.escape(str(broker_code))}$", "$options": "i"}},
                                {"employee_code": {"$regex": f"^{re.escape(str(broker_code))}$", "$options": "i"}},
                                {"uid": {"$regex": f"^{re.escape(str(broker_code))}$", "$options": "i"}},
                                {"user_id": {"$regex": f"^{re.escape(str(broker_code))}$", "$options": "i"}},
                            ],
                        },
                        {"_id": 0, "user_id": 1, "uid": 1, "full_name": 1, "lg_code": 1, "employee_code": 1, "rm_id": 1, "pan_number": 1, "pan": 1, "gst_number": 1, "gst_no": 1, "gstin": 1},
                    )
                if rm_id:
                    employee_info = await db.users.find_one(
                        {"user_id": rm_id, "role": "employee"},
                        {"_id": 0, "user_id": 1, "full_name": 1, "employee_code": 1},
                    )
                if not employee_info and employee_code:
                    employee_info = await db.users.find_one(
                        {
                            "role": "employee",
                            "admin_role_key": {"$in": ["rm", "relationship_manager"]},
                            "employee_code": {"$regex": f"^{re.escape(str(employee_code))}$", "$options": "i"},
                        },
                        {"_id": 0, "user_id": 1, "full_name": 1, "employee_code": 1},
                    )
                if not employee_info and broker_info and broker_info.get("rm_id"):
                    employee_info = await db.users.find_one(
                        {"user_id": broker_info["rm_id"], "role": "employee"},
                        {"_id": 0, "user_id": 1, "full_name": 1, "employee_code": 1},
                    )
                branch_manager_info = await _lookup_finance_user_ref(db, branch_manager_ref)
                if not broker_info and broker_code:
                    broker_info = {"full_name": "NA", "lg_code": broker_code}
                if not employee_info and employee_code:
                    employee_info = {"full_name": "NA", "employee_code": employee_code}
            t["broker"] = broker_info
            t["employee"] = employee_info
            t["branch_manager"] = branch_manager_info
            
        return {"transactions": items, "total": total, "limit": limit, "skip": skip}
    except Exception as e:
        logger.exception("list_transactions failed")
        raise HTTPException(500, detail=f"Failed to load transactions: {e}")


@router.get("/transactions/export-csv")
async def export_transactions_csv(
    type: Optional[str] = None,
    status: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    q: Optional[str] = None,
    customer_name: Optional[str] = None,
    employee_name: Optional[str] = None,
    mobile_no: Optional[str] = None,
    booking_id: Optional[str] = None,
    payment_id: Optional[str] = None,
    broker_name: Optional[str] = None,
    property_type: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = await _txn_query_async(
        db, type, status, start, end, q,
        customer_name, employee_name, mobile_no, booking_id, payment_id, broker_name, property_type,
    )
    cursor = db.transactions.find(query, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=10000)

    for t in items:
        t["invoice_no"] = await get_invoice_number(db, t)
        booking = await _find_booking_for_transaction(db, t)
        t["booking"] = booking
        if booking:
            t["booking_id"] = booking.get("booking_id") or t.get("booking_id")
            t["user_id"] = t.get("user_id") or booking.get("guest_id")
            t["host_id"] = t.get("host_id") or booking.get("host_id")
            t["booking_invoice_breakdown"] = _booking_invoice_breakdown({**t, "booking": booking})
            t["invoice_breakdown"] = t["booking_invoice_breakdown"]

        subscription = None
        if t.get("subscription_id"):
            subscription = await db.subscriptions.find_one(
                {"subscription_id": t["subscription_id"]},
                {"_id": 0},
            )
        t["subscription"] = subscription

        plan = None
        if subscription and subscription.get("plan_id"):
            plan = await db.subscription_plans.find_one(
                {"plan_id": subscription["plan_id"]},
                {
                    "_id": 0,
                    "plan_name": 1,
                    "plan_type": 1,
                    "property_type": 1,
                    "bhk_type": 1,
                    "platform_fee": 1,
                    "tax_percent": 1,
                    "price_monthly": 1,
                    "price_annual": 1,
                },
            )
        t["plan"] = plan
        if subscription:
            t["invoice_breakdown"] = _subscription_invoice_breakdown(t)

        property_info = None
        property_id = t.get("property_id") or (booking or {}).get("property_id") or (subscription or {}).get("property_id")
        if property_id:
            property_info = await db.properties.find_one(
                {"property_id": property_id},
                {
                    "_id": 0,
                    "property_id": 1,
                    "title": 1,
                    "property_name": 1,
                    "name": 1,
                    "owner_id": 1,
                    "broker_id": 1,
                    "rm_id": 1,
                    "address": 1,
                    "city": 1,
                    "state": 1,
                    "pin_code": 1,
                    "amenities": 1,
                    "top_amenities": 1,
                    "check_in_time": 1,
                    "check_out_time": 1,
                    "property_type": 1,
                    "bhk_type": 1,
                    "room_type": 1,
                },
            )
        t["property"] = property_info

        uid = t.get("user_id") or t.get("host_id") or (subscription or {}).get("user_id")
        user_info = None
        if uid:
            user_info = await db.users.find_one(
                {"user_id": uid},
                {
                    "_id": 0,
                    "user_id": 1,
                    "full_name": 1,
                    "email": 1,
                    "phone": 1,
                    "lg_code": 1,
                    "employee_code": 1,
                    "broker_id": 1,
                    "rm_id": 1,
                    "branch_manager_id": 1,
                    "branch_manager_code": 1,
                    "gst_number": 1,
                    "gst_no": 1,
                },
            )
        if not user_info and property_info and property_info.get("owner_id"):
            user_info = await db.users.find_one(
                {"user_id": property_info["owner_id"]},
                {
                    "_id": 0,
                    "user_id": 1,
                    "full_name": 1,
                    "email": 1,
                    "phone": 1,
                    "lg_code": 1,
                    "employee_code": 1,
                    "broker_id": 1,
                    "rm_id": 1,
                    "branch_manager_id": 1,
                    "branch_manager_code": 1,
                    "gst_number": 1,
                    "gst_no": 1,
                },
            )
        t["user"] = user_info

        broker_info = None
        employee_info = None
        if user_info or property_info:
            broker_id = (user_info or {}).get("broker_id") or (property_info or {}).get("broker_id")
            rm_id = (user_info or {}).get("rm_id") or (property_info or {}).get("rm_id")
            if broker_id:
                broker_info = await db.users.find_one(
                    {"user_id": broker_id, "role": "broker"},
                    {"_id": 0, "full_name": 1, "lg_code": 1, "rm_id": 1},
                )
            if not broker_info and (user_info or {}).get("lg_code"):
                broker_info = await db.users.find_one(
                    {"role": "broker", "lg_code": {"$regex": f"^{re.escape(user_info['lg_code'])}$", "$options": "i"}},
                    {"_id": 0, "full_name": 1, "lg_code": 1, "rm_id": 1},
                )
            if (user_info or {}).get("employee_code"):
                employee_info = await db.users.find_one(
                    {"role": "employee", "employee_code": {"$regex": f"^{re.escape(user_info['employee_code'])}$", "$options": "i"}},
                    {"_id": 0, "full_name": 1, "employee_code": 1},
                )
            if not employee_info and rm_id:
                employee_info = await db.users.find_one(
                    {"user_id": rm_id, "role": "employee"},
                    {"_id": 0, "full_name": 1, "employee_code": 1},
                )
            if not employee_info and broker_info and broker_info.get("rm_id"):
                employee_info = await db.users.find_one(
                    {"user_id": broker_info["rm_id"], "role": "employee"},
                    {"_id": 0, "full_name": 1, "employee_code": 1},
                )
            if not broker_info and (user_info or {}).get("lg_code"):
                broker_info = {"full_name": "NA", "lg_code": user_info.get("lg_code")}
            if not employee_info and (user_info or {}).get("employee_code"):
                employee_info = {"full_name": "NA", "employee_code": user_info.get("employee_code")}
        t["broker"] = broker_info
        t["employee"] = employee_info

    buf = io.StringIO()
    fields = [
        "invoice_date",
        "invoice_no",
        "transaction_id",
        "subscription_id",
        "broker_name",
        "broker_lg_code",
        "employee_rm_name",
        "employee_code",
        "host_name",
        "property_name",
        "host_phone",
        "host_email",
        "gst_no",
        "property_type",
        "plan_fee",
        "gross_amount",
        "platform_fee",
        "coupon_code",
        "coupon_discount",
        "taxable_amount_after_discount",
        "igst",
        "cgst",
        "sgst",
        "total_amount",
        "plan_start_date",
        "plan_end_date",
        "refund",
        "payment_status",
        "select_service",
        "payment_utr_id",
        "razorpay_order_id",
        "razorpay_payment_id",
        "booking_id",
        "payout_id",
        "refund_id",
        "currency",
        "is_mock",
        "created_at",
    ]
    writer = csv.DictWriter(buf, fieldnames=fields)
    writer.writeheader()
    for t in items:
        plan = t.get("plan") or {}
        if t.get("invoice_breakdown"):
            breakdown = t["invoice_breakdown"]
        elif t.get("booking"):
            breakdown = _booking_invoice_breakdown(t)
        else:
            breakdown = _subscription_invoice_breakdown(t)
        total = breakdown["total_amount"]
        gross = breakdown["plan_fee"] or breakdown["taxable_before_discount"] or breakdown["taxable_amount"]
        platform_fee = breakdown["platform_fee"]
        cgst = breakdown["cgst"]
        sgst = breakdown["sgst"]
        user = t.get("user") or {}
        broker = t.get("broker") or {}
        employee = t.get("employee") or {}
        property_info = t.get("property") or {}
        subscription = t.get("subscription") or {}
        created_at = t.get("created_at")
        writer.writerow({
            "invoice_date": _excel_text(_date_only_for_csv(created_at)),
            "invoice_no": t.get("invoice_no"),
            "transaction_id": t.get("transaction_id"),
            "subscription_id": t.get("subscription_id"),
            "broker_name": broker.get("full_name") or "NA",
            "broker_lg_code": broker.get("lg_code") or "NA",
            "employee_rm_name": employee.get("full_name") or "NA",
            "employee_code": employee.get("employee_code") or "NA",
            "host_name": user.get("full_name") or "NA",
            "property_name": _property_display_name(property_info),
            "host_phone": user.get("phone") or "NA",
            "host_email": user.get("email") or "NA",
            "gst_no": user.get("gst_number") or user.get("gst_no") or "NA",
            "property_type": plan.get("bhk_type") or plan.get("plan_type") or subscription.get("plan_type") or t.get("type"),
            "plan_fee": breakdown["plan_fee"],
            "gross_amount": gross,
            "platform_fee": platform_fee,
            "coupon_code": breakdown.get("coupon_code") or "NA",
            "coupon_discount": breakdown["discount_amount"],
            "taxable_amount_after_discount": breakdown["taxable_amount"],
            "igst": breakdown["igst"],
            "cgst": cgst,
            "sgst": sgst,
            "total_amount": total,
            "plan_start_date": subscription.get("start_date") or "NA",
            "plan_end_date": subscription.get("end_date") or "NA",
            "refund": total if t.get("type") == "refund" else "NA",
            "payment_status": "paid" if t.get("status") == "success" else t.get("status"),
            "select_service": "subscription" if t.get("type") == "subscription" else t.get("type"),
            "payment_utr_id": t.get("upi_transaction_id") or t.get("razorpay_payment_id") or t.get("razorpay_payout_id") or t.get("razorpay_refund_id") or "NA",
            "razorpay_order_id": t.get("razorpay_order_id"),
            "razorpay_payment_id": t.get("razorpay_payment_id"),
            "booking_id": t.get("booking_id"),
            "payout_id": t.get("payout_id"),
            "refund_id": t.get("refund_id"),
            "currency": t.get("currency"),
            "is_mock": t.get("is_mock"),
            "created_at": (
                created_at.isoformat()
                if isinstance(created_at, datetime)
                else created_at
            ),
        })
    buf.seek(0)
    filename = f"transactions_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter(["\ufeff" + buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------- Invoice Sharing ----------------

class ShareInvoiceRequest(BaseModel):
    channel: str # whatsapp or email


@router.post("/transactions/{transaction_id}/share-invoice")
async def share_transaction_invoice(
    transaction_id: str,
    payload: ShareInvoiceRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        # Fetch transaction
        txn = await db.transactions.find_one({"transaction_id": transaction_id}, {"_id": 0})
        if not txn:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Transaction not found")
        
        # Get customer user details
        uid = txn.get("user_id") or txn.get("host_id")
        user_info = None
        if uid:
            user_info = await db.users.find_one(
                {"user_id": uid},
                {"_id": 0, "full_name": 1, "email": 1, "phone": 1}
            )
        
        if not user_info:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Customer not found for this transaction")
        
        channel_name = payload.channel.lower()
        amount_inr = round((txn.get("amount") or 0) / 100, 2)
        
        title = f"Invoice {invoice_no} for Transaction {transaction_id}"
        message = (
            f"Dear {user_info.get('full_name', 'Valued Customer')},\n\n"
            f"Your invoice {invoice_no} of INR {amount_inr} for transaction ID {transaction_id} is generated and ready.\n"
            f"Type: {txn.get('type').replace('_', ' ').title()}\n"
            f"Status: SUCCESS\n\n"
            f"Thank you for choosing X-Space360!"
        )
        
        from services.notification_service import send_multi_channel_notification
        from models.notification import NotificationChannel, NotificationType
        
        chosen_channels = []
        if channel_name == "whatsapp":
            chosen_channels = [NotificationChannel.WHATSAPP]
        elif channel_name == "email":
            chosen_channels = [NotificationChannel.EMAIL]
        else:
            raise HTTPException(400, detail="Invalid share channel. Choose 'whatsapp' or 'email'")
        
        # Trigger sending via notification helper
        if channel_name == "email":
            from services.email_service import email_service
            email_service.send_template(
                user_info.get("email"),
                "invoice_sent",
                {
                    "name": user_info.get("full_name"),
                    "subject": title,
                    "payment_id": txn.get("razorpay_payment_id") or txn.get("razorpay_order_id") or transaction_id,
                    "invoice_number": invoice_no,
                    "total_amount": amount_inr,
                    "reason": (txn.get("type") or "transaction").replace("_", " ").title(),
                    "action_url": os.getenv("PUBLIC_FRONTEND_URL", "https://uat.x-space360.in").rstrip("/") + "/admin/account",
                },
            )
        else:
            await send_multi_channel_notification(
                db=db,
                user_id=uid,
                notification_type=NotificationType.BOOKING_CONFIRMED,
                title=title,
                message=message,
                channels=chosen_channels,
                data={
                    "amount": amount_inr,
                    "transaction_id": transaction_id,
                    "invoice_no": invoice_no,
                    "created_at": str(txn.get("created_at")),
                    "full_name": user_info.get("full_name")
                }
            )
        
        return {
            "success": True,
            "message": f"Invoice successfully shared via {channel_name.upper()} with {user_info.get('full_name')}",
            "recipient": user_info.get("email") if channel_name == "email" else user_info.get("phone")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("share_transaction_invoice failed")
        raise HTTPException(500, detail=f"Failed to share invoice: {e}")


# --------------- Payouts ----------------

def _first_present(*values):
    for value in values:
        if value not in (None, "", "-", "NA", "N/A"):
            return value
    return None


async def _lookup_finance_user_ref(db: AsyncIOMotorDatabase, reference):
    reference = _first_present(reference)
    if not reference:
        return None
    projection = {
        "_id": 0,
        "user_id": 1,
        "uid": 1,
        "full_name": 1,
        "email": 1,
        "phone": 1,
        "role": 1,
        "lg_code": 1,
        "employee_code": 1,
    }
    for key in ("user_id", "uid", "lg_code", "employee_code", "email"):
        user = await db.users.find_one({key: reference}, projection)
        if user:
            return user
    return {"user_id": reference, "uid": reference, "full_name": str(reference)}


async def _lookup_broker_for_finance(db: AsyncIOMotorDatabase, reference):
    reference = _first_present(reference)
    if not reference:
        return None
    projection = {
        "_id": 0,
        "user_id": 1,
        "uid": 1,
        "full_name": 1,
        "email": 1,
        "phone": 1,
        "mobile": 1,
        "contact": 1,
        "contact_number": 1,
        "address": 1,
        "city": 1,
        "state": 1,
        "pin_code": 1,
        "pincode": 1,
        "gstin": 1,
        "gst_number": 1,
        "gst_no": 1,
        "gstin_number": 1,
        "pan_number": 1,
        "pan": 1,
        "kyc": 1,
        "role": 1,
        "lg_code": 1,
        "employee_code": 1,
        "rm_id": 1,
    }
    broker = await db.users.find_one(
        {
            "role": "broker",
            "$or": [
                {"user_id": reference},
                {"uid": reference},
                {"lg_code": reference},
                {"employee_code": reference},
            ],
        },
        projection,
    )
    if broker:
        return broker
    return None


def _finance_user_role(user: Optional[dict]) -> str:
    if not user:
        return ""
    return str(user.get("role") or user.get("admin_role_key") or "").strip().lower()


def _is_finance_broker_user(user: Optional[dict]) -> bool:
    role = _finance_user_role(user)
    return role == "broker" or "broker" in role


def _is_finance_employee_user(user: Optional[dict]) -> bool:
    if not user:
        return False
    role = _finance_user_role(user)
    code = str(user.get("employee_code") or user.get("user_id") or user.get("uid") or "").strip().lower()
    return (
        role in {"employee", "rm", "relationship_manager", "relationship manager", "branch_manager", "branch manager"}
        or "employee" in role
        or "rm" == role
        or "-emp" in code
    )


async def _lookup_finance_user_ref_for_role(db: AsyncIOMotorDatabase, reference, role_check):
    reference = _first_present(reference)
    if not reference:
        return None
    projection = {
        "_id": 0,
        "user_id": 1,
        "uid": 1,
        "full_name": 1,
        "email": 1,
        "phone": 1,
        "mobile": 1,
        "contact": 1,
        "contact_number": 1,
        "address": 1,
        "city": 1,
        "state": 1,
        "pin_code": 1,
        "pincode": 1,
        "gstin": 1,
        "gst_number": 1,
        "gst_no": 1,
        "gstin_number": 1,
        "pan_number": 1,
        "pan": 1,
        "kyc": 1,
        "role": 1,
        "admin_role_key": 1,
        "lg_code": 1,
        "employee_code": 1,
    }
    for key in ("user_id", "uid", "lg_code", "employee_code", "email"):
        user = await db.users.find_one({key: reference}, projection)
        if user and role_check(user):
            return user
    return None


@router.get("/payouts")
async def list_payouts(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        await sweep_payout_eligibility(db)
    except Exception as sweep_err:
        logger.warning("Could not sweep payout eligibility before listing payouts: %s", sweep_err)

    query: dict = {}
    if status:
        query["status"] = status

    cursor = (
        db.payouts.find(query, {"_id": 0})
        .sort("eligible_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    # enrich settlement ledger rows for finance review without changing payouts
    visible_items = []
    for p in items:
        host = await db.users.find_one(
            {"user_id": p["host_id"]},
            {
                "_id": 0,
                "full_name": 1,
                "email": 1,
                "phone": 1,
                "payout_preference": 1,
                "broker_id": 1,
                "assigned_broker_id": 1,
                "managed_by_broker_id": 1,
                "broker_code": 1,
                "managed_by_broker_code": 1,
                "lg_code": 1,
                "rm_id": 1,
                "employee_id": 1,
                "assigned_employee_id": 1,
                "employee_code": 1,
            },
        )
        prop = await db.properties.find_one(
            {"property_id": p["property_id"]},
            {
                "_id": 0,
                "title": 1,
                "city": 1,
                "broker_id": 1,
                "assigned_broker_id": 1,
                "managed_by_broker_id": 1,
                "broker_code": 1,
                "managed_by_broker_code": 1,
                "lg_code": 1,
                "rm_id": 1,
                "employee_id": 1,
                "assigned_employee_id": 1,
                "employee_code": 1,
                "platform_fee_context": 1,
                "first_verification_role": 1,
                "primary_verification_role": 1,
                "verification_role": 1,
            },
        )
        booking = await db.bookings.find_one(
            {"booking_id": p.get("booking_id")},
            {
                "_id": 0,
                "booking_id": 1,
                "booking_status": 1,
                "status": 1,
                "payment_status": 1,
                "refund_status": 1,
                "broker_id": 1,
                "assigned_broker_id": 1,
                "managed_by_broker_id": 1,
                "broker_code": 1,
                "broker_lg_code": 1,
                "managed_by_broker_code": 1,
                "rm_id": 1,
                "employee_id": 1,
                "employee_code": 1,
                "rm_code": 1,
                "cancelled_at": 1,
                "canceled_at": 1,
                "cancellation_date": 1,
                "refund_initiated_at": 1,
                "refunded_at": 1,
                "check_in_date": 1,
                "check_out_date": 1,
                "created_at": 1,
                "nights": 1,
                "number_of_nights": 1,
                "host_base_amount": 1,
                "base_amount": 1,
                "price_per_night": 1,
                "subtotal_amount": 1,
                "total_amount": 1,
                "platform_fee": 1,
                "platform_fee_amount": 1,
                "payment_gateway_charge": 1,
                "gateway_charge": 1,
                "convenience_fee": 1,
                "insurance_fee": 1,
                "cleaning_fee": 1,
                "extra_guest_fee": 1,
                "gst_amount": 1,
                "tax_amount": 1,
                "pricing": 1,
                "pricing_snapshot": 1,
                "pricing_breakdown": 1,
                "breakdown": 1,
                "extra_charges": 1,
                "customer_charge_breakdown": 1,
                "charge_breakdown": 1,
                "applied_charges": 1,
                "host_actual_value": 1,
                "host_amount": 1,
                "unit_host_price": 1,
                "host_price_per_night": 1,
                "pricing_units": 1,
                "discount_amount": 1,
                "customer_discount_amount": 1,
                "total_extra_charges": 1,
                "total_extra_charges_amount": 1,
                "customer_final_payable": 1,
                "gateway_charge_amount": 1,
                "payment_gateway_charge_amount": 1,
                "convenience_fee_amount": 1,
                "insurance_fee_amount": 1,
                "cleaning_fee_amount": 1,
                "extra_guest_fee_amount": 1,
                "company_charge_amount": 1,
                "service_fee_amount": 1,
                "platform_fee_context": 1,
                "first_verification_role": 1,
                "primary_verification_role": 1,
                "verification_role": 1,
            },
        )
        booking_status_text = " ".join(str(value or "").strip().lower() for value in (
            (booking or {}).get("status"),
            (booking or {}).get("booking_status"),
            (booking or {}).get("payment_status"),
            (booking or {}).get("refund_status"),
            p.get("status"),
            p.get("booking_status"),
            p.get("payment_status"),
            p.get("refund_status"),
        ))
        cancelled_at = _first_present(
            (booking or {}).get("cancelled_at"),
            (booking or {}).get("canceled_at"),
            (booking or {}).get("cancellation_date"),
            (booking or {}).get("refund_initiated_at"),
            (booking or {}).get("refunded_at"),
            p.get("cancelled_at"),
            p.get("canceled_at"),
            p.get("cancellation_date"),
            p.get("refund_initiated_at"),
            p.get("refunded_at"),
        )
        if cancelled_at or any(word in booking_status_text for word in ("cancelled", "canceled", "refund_initiated", "refunded")):
            continue

        p["host"] = host
        p["property"] = prop
        p["booking"] = booking

        platform_fee_context = str(_first_present(
            (booking or {}).get("platform_fee_context"),
            (prop or {}).get("platform_fee_context"),
            p.get("platform_fee_context"),
        ) or "").strip().lower()
        broker_like_ref = _first_present(
            (prop or {}).get("broker_id"),
            (prop or {}).get("assigned_broker_id"),
            (prop or {}).get("broker_code"),
            (prop or {}).get("lg_code"),
            (host or {}).get("broker_id"),
            (host or {}).get("assigned_broker_id"),
            (host or {}).get("broker_code"),
            (host or {}).get("lg_code"),
        )
        employee_ref = _first_present(
            (prop or {}).get("rm_id"),
            (prop or {}).get("employee_id"),
            (prop or {}).get("assigned_employee_id"),
            (prop or {}).get("employee_code"),
            (host or {}).get("rm_id"),
            (host or {}).get("employee_id"),
            (host or {}).get("assigned_employee_id"),
            (host or {}).get("employee_code"),
        )
        if "rm" in platform_fee_context:
            employee_ref = _first_present(employee_ref, broker_like_ref)
            broker_ref = None
        else:
            broker_ref = broker_like_ref
        p["platform_fee_context"] = platform_fee_context or p.get("platform_fee_context")
        p["broker"] = await _lookup_broker_for_finance(db, broker_ref)
        p["employee"] = await _lookup_finance_user_ref(db, employee_ref)
        p["settlement_due_at"] = _first_present(p.get("eligible_at"), p.get("created_at"))

        def _rupees_to_paise(value) -> int:
            try:
                return int(round(float(value or 0) * 100))
            except (TypeError, ValueError):
                return 0

        def _paise(value) -> int:
            try:
                return int(value or 0)
            except (TypeError, ValueError):
                return 0

        def _first_paise(*values) -> int:
            for value in values:
                amount = _paise(value)
                if amount:
                    return amount
            return 0

        pricing_snapshot = extract_booking_pricing_snapshot(booking or {})
        extra_charges = pricing_snapshot.get("extra_charges") or {}
        existing_charge_breakdown = p.get("customer_charge_breakdown") or {}
        snapshot_charge_breakdown = {
            "platform_fee": _rupees_to_paise(extra_charges.get("platform_fee")),
            "gateway_charge": _rupees_to_paise(extra_charges.get("payment_gateway_charge") or extra_charges.get("gateway_charge")),
            "convenience_fee": _rupees_to_paise(extra_charges.get("convenience_fee")),
            "insurance_fee": _rupees_to_paise(extra_charges.get("insurance_fee")),
            "cleaning_fee": _rupees_to_paise(extra_charges.get("cleaning_fee")),
            "extra_guest_fee": _rupees_to_paise(extra_charges.get("extra_guest_fee")),
            "customer_gst": _rupees_to_paise(pricing_snapshot.get("gst_amount")),
        }
        p["customer_charge_breakdown"] = {
            "platform_fee": _first_paise(snapshot_charge_breakdown.get("platform_fee"), existing_charge_breakdown.get("platform_fee"), p.get("platform_fee")),
            "gateway_charge": _first_paise(snapshot_charge_breakdown.get("gateway_charge"), existing_charge_breakdown.get("gateway_charge"), existing_charge_breakdown.get("payment_gateway_charge"), p.get("gateway_charge")),
            "convenience_fee": _first_paise(snapshot_charge_breakdown.get("convenience_fee"), existing_charge_breakdown.get("convenience_fee")),
            "insurance_fee": _first_paise(snapshot_charge_breakdown.get("insurance_fee"), existing_charge_breakdown.get("insurance_fee")),
            "cleaning_fee": _first_paise(snapshot_charge_breakdown.get("cleaning_fee"), existing_charge_breakdown.get("cleaning_fee")),
            "extra_guest_fee": _first_paise(snapshot_charge_breakdown.get("extra_guest_fee"), existing_charge_breakdown.get("extra_guest_fee")),
            "customer_gst": _first_paise(snapshot_charge_breakdown.get("customer_gst"), existing_charge_breakdown.get("customer_gst")),
        }
        host_actual_amount = _first_paise(
            p.get("host_actual_value_amount"),
            _rupees_to_paise(pricing_snapshot.get("host_actual_value")),
            p.get("gross_amount"),
        )
        p["host_actual_value_amount"] = host_actual_amount
        p["gross_amount"] = host_actual_amount
        p["total_extra_charges_amount"] = _first_paise(
            p.get("total_extra_charges_amount"),
            _rupees_to_paise(pricing_snapshot.get("total_extra_charges")),
            sum(p["customer_charge_breakdown"].get(k, 0) for k in (
                "platform_fee",
                "gateway_charge",
                "convenience_fee",
                "insurance_fee",
                "cleaning_fee",
                "extra_guest_fee",
            )),
        )
        p["customer_final_payable_amount"] = _first_paise(
            p.get("customer_final_payable_amount"),
            _rupees_to_paise(pricing_snapshot.get("customer_final_payable")),
        )
        p["platform_fee"] = p["customer_charge_breakdown"].get("platform_fee") or p.get("platform_fee") or 0
        p["gateway_charge"] = p["customer_charge_breakdown"].get("gateway_charge") or p.get("gateway_charge") or 0
        p.pop("company_charge", None)

        if booking and p.get("status") not in {"paid", "processed", "completed"}:
            try:
                payout_breakdown = await calculate_host_payout_breakdown(db, booking=booking)
                refreshed_tds = payout_breakdown.get("tds_breakdown") or {}
                p["tds_amount"] = payout_breakdown.get("tds_amount", p.get("tds_amount", 0))
                p["net_amount"] = payout_breakdown.get("net_amount", p.get("net_amount", 0))
                p["deductions"] = payout_breakdown.get("deductions") or p.get("deductions") or []
                p["tds_breakdown"] = refreshed_tds
                p["tds_base_amount"] = _rupees_to_paise(refreshed_tds.get("tds_base_amount"))
                p["tds_rate_percent"] = float(refreshed_tds.get("rate_percent") or 0)
                p["tds_threshold_amount"] = _rupees_to_paise(refreshed_tds.get("threshold_amount"))
                p["tds_fy_gross_before"] = _rupees_to_paise(refreshed_tds.get("prior_fy_gross"))
                p["tds_fy_gross_after"] = _rupees_to_paise(refreshed_tds.get("projected_fy_gross"))
                p["tds_threshold_crossed"] = bool(refreshed_tds.get("threshold_crossed"))
                p["tds_financial_year"] = refreshed_tds.get("financial_year")
                await db.payouts.update_one(
                    {"payout_id": p.get("payout_id")},
                    {"$set": {
                        "tds_amount": p["tds_amount"],
                        "net_amount": p["net_amount"],
                        "deductions": p["deductions"],
                        "tds_breakdown": p["tds_breakdown"],
                        "tds_base_amount": p["tds_base_amount"],
                        "tds_rate_percent": p["tds_rate_percent"],
                        "tds_threshold_amount": p["tds_threshold_amount"],
                        "tds_fy_gross_before": p["tds_fy_gross_before"],
                        "tds_fy_gross_after": p["tds_fy_gross_after"],
                        "tds_threshold_crossed": p["tds_threshold_crossed"],
                        "tds_financial_year": p["tds_financial_year"],
                        "updated_at": datetime.now(timezone.utc),
                    }},
                )
            except Exception as exc:
                logger.warning("Could not refresh payout TDS for %s: %s", p.get("payout_id"), exc)

        tds_breakdown = p.get("tds_breakdown") or {}
        if not tds_breakdown:
            for deduction in p.get("deductions") or []:
                if deduction.get("key") == "tds":
                    tds_breakdown = deduction.get("breakdown") or {}
                    break
        p["tds_breakdown"] = tds_breakdown

        if not p.get("tds_base_amount"):
            p["tds_base_amount"] = _rupees_to_paise(tds_breakdown.get("tds_base_amount")) or host_actual_amount
        if not p.get("tds_rate_percent"):
            p["tds_rate_percent"] = float(tds_breakdown.get("rate_percent") or 0)
        if not p.get("tds_threshold_amount"):
            p["tds_threshold_amount"] = _rupees_to_paise(tds_breakdown.get("threshold_amount"))
        if not p.get("tds_fy_gross_before"):
            p["tds_fy_gross_before"] = _rupees_to_paise(tds_breakdown.get("prior_fy_gross"))
        if not p.get("tds_fy_gross_after"):
            p["tds_fy_gross_after"] = _rupees_to_paise(tds_breakdown.get("projected_fy_gross"))
        p["tds_threshold_crossed"] = bool(p.get("tds_threshold_crossed") or tds_breakdown.get("threshold_crossed"))
        p["tds_financial_year"] = p.get("tds_financial_year") or tds_breakdown.get("financial_year")
        visible_items.append(p)

    items = visible_items
    total = len(items)
    return {"payouts": items, "total": total}


@router.post("/partner-settlement-decisions")
async def save_partner_settlement_decision(
    payload: PartnerSettlementDecisionRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    status_value = str(payload.status or "").strip().lower()
    if status_value not in {"approved", "rejected", "pending"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid settlement status")
    settlement_id = str(payload.settlement_id or "").strip()
    if not settlement_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Settlement ID is required")
    now = datetime.now(timezone.utc)
    doc = {
        "settlement_id": settlement_id,
        "role": str(payload.role or "").strip().lower(),
        "status": status_value,
        "booking_id": payload.booking_id,
        "partner_id": payload.partner_id,
        "partner_code": payload.partner_code,
        "updated_by": current_user.get("user_id"),
        "updated_at": now,
    }
    await db.partner_settlement_decisions.update_one(
        {"settlement_id": settlement_id},
        {"$set": doc, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    booking_id = str(payload.booking_id or "").strip()
    if not booking_id:
        suffix = settlement_id.rsplit("-", 1)[-1]
        if suffix:
            booking = await db.bookings.find_one(
                {"booking_id": {"$regex": f"{re.escape(suffix)}$", "$options": "i"}},
                {"_id": 0, "booking_id": 1},
            )
            booking_id = (booking or {}).get("booking_id") or ""
    role = doc["role"]
    if booking_id and role in {"broker", "employee", "branch_manager"}:
        status_field = f"{role}_commission_status"
        update_doc = {
            status_field: status_value,
            "updated_at": now,
        }
        await db.payouts.update_many({"booking_id": booking_id}, {"$set": update_doc})
        await db.commissions.update_many(
            {"booking_id": booking_id, "$or": [{"broker_id": payload.partner_id}, {"broker_code": payload.partner_code}]},
            {"$set": {"payment_status": status_value, "updated_at": now}},
        )
    return {"message": "Settlement decision saved", "decision": {**doc, "updated_at": now.isoformat()}}


@router.post("/payouts/{payout_id}/process")
async def process_one_payout(
    payout_id: str,
    payload: Optional[ProcessPayoutRequest] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        payout = await process_payout(db, payout_id, admin_id=current_user["user_id"])
        return {
            "message": f"Payout {payout.status.value}",
            "payout": _strip(payout.model_dump()),
        }
    except ValueError as e:
        raise HTTPException(404, detail=str(e))
    except Exception as e:
        logger.exception("process_payout failed")
        raise HTTPException(500, detail=f"Failed to process payout: {e}")


@router.post("/payouts/sweep-eligibility")
async def sweep_eligibility(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually trigger a sweep that creates or promotes booking payout ledger rows."""
    n = await sweep_payout_eligibility(db)
    return {"message": f"Created or updated {n} payout ledger rows", "count": n}


@router.post("/payouts/process-eligible")
async def process_eligible(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Process all ELIGIBLE payouts in one shot (batch mode)."""
    cursor = db.payouts.find({"status": PayoutStatus.ELIGIBLE.value}, {"_id": 0})
    payouts = await cursor.to_list(length=500)
    processed, failed = 0, 0
    for p in payouts:
        try:
            payout = await process_payout(db, p["payout_id"], admin_id=current_user["user_id"])
            if payout.status == PayoutStatus.PAID:
                processed += 1
            else:
                failed += 1
        except Exception:
            logger.exception(f"process_payout failed for {p.get('payout_id')}")
            failed += 1
    return {"processed": processed, "failed": failed, "total": len(payouts)}


@router.post("/payouts/run-auto")
async def run_auto_payout_now(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run the same automatic payout engine immediately: sweep + process eligible."""
    marked = await sweep_payout_eligibility(db)
    summary = await process_auto_eligible_payouts(
        db,
        admin_id=current_user["user_id"],
        limit=int(os.environ.get("AUTO_PAYOUT_BATCH_LIMIT", "100")),
    )
    try:
        await db.payout_job_runs.insert_one({
            "job": "auto_payout_manual_run",
            "marked_eligible": marked,
            "auto_payout_enabled": True,
            "processed": summary.get("processed", 0),
            "failed": summary.get("failed", 0),
            "skipped": summary.get("skipped", 0),
            "total": summary.get("total", 0),
            "ran_at": datetime.utcnow(),
            "ran_by": current_user["user_id"],
        })
    except Exception:
        logger.warning("failed to write manual payout job run log")
    return {"marked_eligible": marked, **summary}


@router.get("/payouts/auto-status")
async def auto_payout_status(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Show whether automatic payout is enabled and the latest run result."""
    latest = await db.payout_job_runs.find_one({}, {"_id": 0}, sort=[("ran_at", -1)])
    pending = await db.payouts.count_documents({"status": PayoutStatus.PENDING.value})
    pending_eligible = await db.payouts.count_documents({"status": PayoutStatus.ELIGIBLE.value})
    processing = await db.payouts.count_documents({"status": PayoutStatus.PROCESSING.value})
    failed = await db.payouts.count_documents({"status": PayoutStatus.FAILED.value})
    return {
        "auto_payout_enabled": os.environ.get("AUTO_PAYOUT_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"},
        "interval_seconds": int(os.environ.get("PAYOUT_SWEEP_INTERVAL", "3600")),
        "batch_limit": int(os.environ.get("AUTO_PAYOUT_BATCH_LIMIT", "100")),
        "payouts_are_mock": os.environ.get("RAZORPAYX_DEMO_MODE", "true").strip().lower() in {"1", "true", "yes", "on"},
        "pending": pending,
        "pending_eligible": pending_eligible,
        "processing": processing,
        "failed": failed,
        "latest_run": latest,
    }


# --------------- Refunds ----------------

async def _reconcile_missing_cancelled_refunds(db: AsyncIOMotorDatabase, limit: int = 100) -> None:
    bookings = await (
        db.bookings.find(
            {
                "booking_status": {"$in": ["cancelled", "canceled"]},
            },
            {"_id": 0},
        )
        .sort("cancelled_at", -1)
        .limit(limit)
        .to_list(length=limit)
    )
    for booking in bookings:
        booking_id = booking.get("booking_id")
        if not booking_id:
            continue
        if await db.refunds.find_one({"booking_id": booking_id}, {"_id": 1}):
            continue
        try:
            await ensure_refund_for_cancelled_paid_booking(
                db,
                booking,
                reason=booking.get("cancellation_reason") or "Guest cancellation",
                initiated_by=booking.get("cancelled_by") or "system",
                initiated_by_role=booking.get("cancelled_by_role") or "system",
            )
        except Exception as err:
            logger.warning(f"Refund reconciliation failed for booking {booking_id}: {err}")


async def _enrich_refund_for_credit_note(db: AsyncIOMotorDatabase, refund: dict) -> dict:
    booking = await db.bookings.find_one({"booking_id": refund.get("booking_id")}, {"_id": 0}) or {}
    property_doc = await db.properties.find_one({"property_id": booking.get("property_id") or refund.get("property_id")}, {"_id": 0}) or {}
    guest = await db.users.find_one({"user_id": refund.get("guest_id") or booking.get("guest_id")}, {"_id": 0}) or {}
    host = await db.users.find_one({"user_id": refund.get("host_id") or booking.get("host_id")}, {"_id": 0}) or {}
    txns = await (
        db.transactions.find(
            {"booking_id": refund.get("booking_id"), "type": TransactionType.BOOKING_PAYMENT.value},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .limit(1)
        .to_list(length=1)
    )
    txn = txns[0] if txns else {}

    broker_ref = _first_present(
        refund.get("broker_id"),
        refund.get("broker_code"),
        refund.get("broker_lg_code"),
        booking.get("broker_id"),
        booking.get("assigned_broker_id"),
        booking.get("broker_code"),
        booking.get("broker_lg_code"),
        property_doc.get("broker_id"),
        property_doc.get("assigned_broker_id"),
        property_doc.get("broker_code"),
        property_doc.get("broker_lg_code"),
        txn.get("broker_id"),
        txn.get("broker_code"),
        txn.get("broker_lg_code"),
        host.get("broker_id"),
        host.get("assigned_broker_id"),
        host.get("broker_code"),
    )
    employee_ref = _first_present(
        refund.get("rm_id"),
        refund.get("employee_id"),
        refund.get("rm_code"),
        refund.get("employee_code"),
        booking.get("rm_id"),
        booking.get("employee_id"),
        booking.get("assigned_employee_id"),
        booking.get("rm_code"),
        booking.get("employee_code"),
        property_doc.get("rm_id"),
        property_doc.get("employee_id"),
        property_doc.get("assigned_employee_id"),
        property_doc.get("rm_code"),
        property_doc.get("employee_code"),
        txn.get("rm_id"),
        txn.get("employee_id"),
        txn.get("rm_code"),
        txn.get("employee_code"),
        host.get("rm_id"),
        host.get("employee_id"),
        host.get("assigned_employee_id"),
        host.get("employee_code"),
    )
    broker_info = await _lookup_finance_user_ref_for_role(db, broker_ref, _is_finance_broker_user)
    employee_info = await _lookup_finance_user_ref_for_role(db, employee_ref, _is_finance_employee_user)

    def first(*values):
        for value in values:
            if value not in (None, "") and str(value).strip().upper() not in {"NA", "N/A", "-"}:
                return value
        return None

    def rupees_to_paise(value) -> int:
        try:
            return max(0, int(round(float(value or 0) * 100)))
        except (TypeError, ValueError):
            return 0

    def amount_to_paise(value, gross_reference: int = 0) -> int:
        try:
            amount = float(value or 0)
        except (TypeError, ValueError):
            return 0
        if amount <= 0:
            return 0
        gross_rupees = (gross_reference or 0) / 100
        if gross_rupees and amount <= max(gross_rupees * 2, 10000):
            return int(round(amount * 100))
        return int(round(amount))

    pricing = extract_booking_pricing_snapshot(booking) if booking else {}
    extra_charges = pricing.get("extra_charges") or {}
    host_actual_paise = rupees_to_paise(pricing.get("host_actual_value"))
    host_extra_guest_paise = rupees_to_paise(first(
        pricing.get("host_extra_guest_fee"),
        extra_charges.get("host_extra_guest_fee"),
        booking.get("host_extra_guest_fee"),
        booking.get("host_extra_guest_charge"),
        booking.get("extra_guest_host_amount"),
        booking.get("extra_person_amount"),
        booking.get("extra_person_total"),
        booking.get("extra_guest_amount"),
        booking.get("extra_guest_fee_host_amount"),
    ))
    gross_receipt = int(refund.get("gross_receipt_amount") or refund.get("original_amount") or (float(booking.get("total_amount") or 0) * 100) or 0)
    stored_refundable_base = int(refund.get("refundable_base_amount") or refund.get("refund_base_amount") or 0)
    computed_refundable_base = host_actual_paise + host_extra_guest_paise
    refundable_base = max(stored_refundable_base, computed_refundable_base, host_actual_paise)
    refund_total = int(refund.get("refund_amount") or 0)
    cancellation = int(refund.get("cancellation_charges") or max(0, refundable_base - refund_total))
    taxable = int(refund.get("net_taxable_value_credited") or refund_total)
    gst_total = 0
    cgst = 0
    sgst = 0

    raw_extra_guest_fee_paise = rupees_to_paise(extra_charges.get("extra_guest_fee"))
    customer_charge_breakdown = {
        "platform_fee": rupees_to_paise(extra_charges.get("platform_fee")),
        "gateway_charge": rupees_to_paise(first(extra_charges.get("payment_gateway_charge"), extra_charges.get("gateway_charge"))),
        "convenience_fee": rupees_to_paise(first(extra_charges.get("convenience_fee"), extra_charges.get("platform_convenience_fee"))),
        "insurance_fee": rupees_to_paise(first(extra_charges.get("insurance_fee"), extra_charges.get("protection_fee"))),
        "cleaning_fee": rupees_to_paise(extra_charges.get("cleaning_fee")),
        "extra_guest_fee": max(0, raw_extra_guest_fee_paise - host_extra_guest_paise),
        "customer_gst": rupees_to_paise(pricing.get("gst_amount")),
    }
    existing_breakdown = refund.get("customer_charge_breakdown") or {}
    for key in list(customer_charge_breakdown):
        if not customer_charge_breakdown[key]:
            customer_charge_breakdown[key] = amount_to_paise(existing_breakdown.get(key), gross_receipt)
    non_refundable_difference = max(0, gross_receipt - refundable_base)
    original_invoice_date = first(
        refund.get("original_invoice_date"),
        booking.get("invoice_date"),
        txn.get("invoice_date"),
        booking.get("created_at"),
        txn.get("created_at"),
        refund.get("created_at"),
    )
    original_invoice_no = _customer_booking_invoice_no(
        {
            "customer_invoice_no": first(refund.get("original_invoice_no"), booking.get("customer_invoice_no")),
            "tax_invoice_no": first(refund.get("tax_invoice_no"), booking.get("tax_invoice_no"), txn.get("tax_invoice_no")),
            "booking_invoice_no": first(booking.get("booking_invoice_no"), refund.get("booking_invoice_no")),
            "invoice_no": first(refund.get("invoice_no"), booking.get("invoice_no"), txn.get("invoice_no")),
            "invoice_number": first(booking.get("invoice_number"), txn.get("invoice_number")),
            "booking_id": first(refund.get("booking_id"), booking.get("booking_id"), txn.get("booking_id")),
            "id": first(booking.get("id"), txn.get("booking_id")),
            "created_at": original_invoice_date,
            "invoice_date": original_invoice_date,
        },
        original_invoice_date,
    )

    enriched = {
        **refund,
        "booking": booking,
        "property": property_doc,
        "guest": {
            "full_name": first(guest.get("full_name"), booking.get("guest_name"), booking.get("customer_name")),
            "email": first(guest.get("email"), booking.get("guest_email"), booking.get("customer_email")),
            "phone": first(guest.get("phone"), booking.get("guest_phone"), booking.get("customer_phone")),
            "gstin": first(guest.get("gstin"), guest.get("gst_number"), booking.get("customer_gstin")),
        },
        "host": {"full_name": host.get("full_name"), "email": host.get("email"), "phone": host.get("phone")},
        "transaction": txn,
        "broker": broker_info,
        "employee": employee_info,
        "rm": employee_info,
        "broker_name": first((broker_info or {}).get("full_name")),
        "broker_code": first((broker_info or {}).get("lg_code"), (broker_info or {}).get("employee_code"), (broker_info or {}).get("user_id")),
        "rm_name": first((employee_info or {}).get("full_name")),
        "employee_name": first((employee_info or {}).get("full_name")),
        "rm_code": first((employee_info or {}).get("employee_code"), (employee_info or {}).get("user_id")),
        "employee_code": first((employee_info or {}).get("employee_code"), (employee_info or {}).get("user_id")),
        "customer_name": first(refund.get("customer_name"), guest.get("full_name"), booking.get("guest_name"), booking.get("customer_name")),
        "customer_email": first(refund.get("customer_email"), guest.get("email"), booking.get("guest_email"), booking.get("customer_email")),
        "customer_phone": first(refund.get("customer_phone"), guest.get("phone"), booking.get("guest_phone"), booking.get("customer_phone")),
        "customer_gstin": first(refund.get("customer_gstin"), booking.get("customer_gstin"), guest.get("gstin"), guest.get("gst_number")),
        "property_name": first(refund.get("property_name"), booking.get("property_name"), property_doc.get("title"), property_doc.get("property_name"), property_doc.get("name")),
        "property_type": first(refund.get("property_type"), property_doc.get("property_type"), property_doc.get("type")),
        "room_type": first(refund.get("room_type"), booking.get("room_type"), property_doc.get("configuration"), property_doc.get("bhk")),
        "property_address": first(refund.get("property_address"), property_doc.get("address"), property_doc.get("location"), booking.get("property_address")),
        "property_owner_name": first(refund.get("property_owner_name"), host.get("full_name"), property_doc.get("owner_name")),
        "property_owner_contact": first(refund.get("property_owner_contact"), host.get("phone"), property_doc.get("owner_contact")),
        "original_invoice_no": original_invoice_no,
        "original_invoice_date": original_invoice_date,
        "payment_ref": first(refund.get("payment_ref"), refund.get("razorpay_payment_id"), booking.get("payment_id"), booking.get("razorpay_payment_id")),
        "booking_date": first(refund.get("booking_date"), booking.get("created_at"), booking.get("booking_date")),
        "check_in_date": first(refund.get("check_in_date"), booking.get("check_in_date")),
        "check_out_date": first(refund.get("check_out_date"), booking.get("check_out_date")),
        "stay_nights": first(refund.get("stay_nights"), booking.get("nights"), booking.get("stay_nights"), booking.get("number_of_nights")),
        "guest_count": first(refund.get("guest_count"), booking.get("number_of_guests"), booking.get("guests"), booking.get("guest_count")),
        "payment_mode": first(refund.get("payment_mode"), booking.get("payment_method"), "Online Payment"),
        "payment_status": first(refund.get("payment_status"), booking.get("payment_status"), "Paid"),
        "original_amount": gross_receipt,
        "gross_receipt_amount": gross_receipt,
        "gross_amount": int(refund.get("gross_amount") or refundable_base),
        "refund_base_amount": refundable_base,
        "refundable_base_amount": refundable_base,
        "cancellation_charges": cancellation,
        "net_taxable_value_credited": taxable,
        "cgst_refund_amount": cgst,
        "sgst_refund_amount": sgst,
        "igst_refund_amount": 0,
        "gst_refund_amount": gst_total,
        "customer_charge_breakdown": customer_charge_breakdown,
        "non_refundable_difference_amount": non_refundable_difference,
    }
    return enriched

@router.get("/refunds")
async def list_refunds(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    await _reconcile_missing_cancelled_refunds(db)
    query: dict = {}
    if status:
        query["status"] = status
    cursor = (
        db.refunds.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    items = [await _enrich_refund_for_credit_note(db, r) for r in items]
    total = await db.refunds.count_documents(query)
    return {"refunds": items, "total": total}


@router.post("/refunds/{booking_id}")
async def create_refund(
    booking_id: str,
    payload: InitiateRefundRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, detail="Booking not found")
    # Strict idempotency: if any active refund row exists, block duplicate requests.
    dup = await db.refunds.find_one({
        "booking_id": booking_id,
        "status": {"$in": [RefundStatus.PROCESSED.value, RefundStatus.PENDING.value, "initiated", "processing"]},
    })
    if dup:
        raise HTTPException(400, detail="Refund request already exists for this booking")

    refund_doc = await create_refund_request(
        db,
        booking=booking,
        reason=payload.reason,
        initiated_by=current_user["user_id"],
        initiated_by_role="admin",
        override_amount=payload.override_amount,
        override_percent=payload.override_percent,
    )
    return {
        "message": "Refund request created for admin approval",
        "refund": _strip(refund_doc),
    }


@router.post("/refunds/{refund_id}/approve")
async def approve_refund(
    refund_id: str,
    payload: RefundDecisionRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        refund_doc = await approve_refund_request(
            db,
            refund_id=refund_id,
            approved_by=current_user["user_id"],
            reason=payload.reason,
        )
    except ValueError as err:
        raise HTTPException(400, detail=str(err))
    return {"message": "Refund approved and processed", "refund": _strip(refund_doc or {})}


@router.post("/refunds/{refund_id}/reject")
async def reject_refund(
    refund_id: str,
    payload: RefundDecisionRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    reason = (payload.reason or "").strip()
    if not reason:
        raise HTTPException(400, detail="Rejection reason is required")
    try:
        refund_doc = await reject_refund_request(
            db,
            refund_id=refund_id,
            rejected_by=current_user["user_id"],
            reason=reason,
        )
    except ValueError as err:
        raise HTTPException(400, detail=str(err))
    return {"message": "Refund request rejected", "refund": _strip(refund_doc or {})}


# --------------- Refund policy preview ----------------

@router.get("/refunds/policy-preview")
async def refund_policy_preview(
    check_in_date: str,
    total_amount: float,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    from services.account_service import compute_refund_tier
    pct, tier = compute_refund_tier(check_in_date)
    refund_paise = int(round(float(total_amount) * 100 * pct / 100))
    return {
        "check_in_date": check_in_date,
        "percent": pct,
        "tier": tier,
        "refund_paise": refund_paise,
        "refund_inr": round(refund_paise / 100, 2),
    }
