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
    initiate_refund,
    process_payout,
    sweep_payout_eligibility,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin/account", tags=["Admin Account"])


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
                "total_tax_paise": int(round(booking_rev["amount_paise"] * (0.18 / 1.28))),
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
) -> dict:
    query: dict = {}
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
            
        query["$or"] = or_conditions
    return query


async def get_invoice_number(db: AsyncIOMotorDatabase, t: dict) -> str:
    t_type = t.get("type")
    if t_type in ("booking_payment", "refund"):
        prefix = "STRB"
        types_list = ["booking_payment", "refund"]
    else:
        prefix = "STRS"
        types_list = ["subscription", "registration_fee"]
        
    created_at = t.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at)
        except ValueError:
            created_at = datetime.now(timezone.utc)
            
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    
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
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    try:
        query = await _txn_query_async(db, type, status, start, end, q)
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
                            "sqft_range": 1,
                        },
                    )

            property_info = None
            property_id = t.get("property_id") or (subscription or {}).get("property_id")
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
                        {"_id": 0, "user_id": 1, "full_name": 1, "lg_code": 1, "rm_id": 1},
                    )
                if not broker_info and (user_info or {}).get("lg_code"):
                    broker_info = await db.users.find_one(
                        {"role": "broker", "lg_code": {"$regex": f"^{re.escape(user_info['lg_code'])}$", "$options": "i"}},
                        {"_id": 0, "user_id": 1, "full_name": 1, "lg_code": 1, "rm_id": 1},
                    )
                if (user_info or {}).get("employee_code"):
                    employee_info = await db.users.find_one(
                        {"role": "employee", "employee_code": {"$regex": f"^{re.escape(user_info['employee_code'])}$", "$options": "i"}},
                        {"_id": 0, "user_id": 1, "full_name": 1, "employee_code": 1},
                    )
                if not employee_info and rm_id:
                    employee_info = await db.users.find_one(
                        {"user_id": rm_id, "role": "employee"},
                        {"_id": 0, "user_id": 1, "full_name": 1, "employee_code": 1},
                    )
                if not employee_info and broker_info and broker_info.get("rm_id"):
                    employee_info = await db.users.find_one(
                        {"user_id": broker_info["rm_id"], "role": "employee"},
                        {"_id": 0, "user_id": 1, "full_name": 1, "employee_code": 1},
                    )
                if not broker_info and (user_info or {}).get("lg_code"):
                    broker_info = {"full_name": "NA", "lg_code": user_info.get("lg_code")}
                if not employee_info and (user_info or {}).get("employee_code"):
                    employee_info = {"full_name": "NA", "employee_code": user_info.get("employee_code")}
            t["broker"] = broker_info
            t["employee"] = employee_info
            
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
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    query = await _txn_query_async(db, type, status, start, end, q)
    cursor = db.transactions.find(query, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=10000)

    for t in items:
        t["invoice_no"] = await get_invoice_number(db, t)
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
                },
            )
        t["plan"] = plan

        property_info = None
        property_id = t.get("property_id") or (subscription or {}).get("property_id")
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
        "gross_amount",
        "platform_fee",
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
        total = round((t.get("amount") or 0) / 100, 2)
        plan = t.get("plan") or {}
        tax_percent = float(plan.get("tax_percent") or 18)
        taxable = round(total / (1 + tax_percent / 100), 2) if tax_percent else total
        tax = round(max(0, total - taxable), 2)
        platform_fee = round(float(plan.get("platform_fee") or 0), 2)
        gross = taxable
        cgst = round(tax / 2, 2)
        sgst = round(tax / 2, 2)
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
            "gross_amount": gross,
            "platform_fee": platform_fee,
            "igst": 0,
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

@router.get("/payouts")
async def list_payouts(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
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
    # enrich with host name + property title
    for p in items:
        host = await db.users.find_one(
            {"user_id": p["host_id"]}, {"_id": 0, "full_name": 1, "email": 1, "payout_preference": 1}
        )
        prop = await db.properties.find_one(
            {"property_id": p["property_id"]}, {"_id": 0, "title": 1, "city": 1}
        )
        p["host"] = host
        p["property"] = prop

    total = await db.payouts.count_documents(query)
    return {"payouts": items, "total": total}


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
    """Manually trigger a sweep that marks completed bookings payout_eligible."""
    n = await sweep_payout_eligibility(db)
    return {"message": f"Marked {n} bookings as payout eligible", "count": n}


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
    pending_eligible = await db.payouts.count_documents({"status": PayoutStatus.ELIGIBLE.value})
    processing = await db.payouts.count_documents({"status": PayoutStatus.PROCESSING.value})
    failed = await db.payouts.count_documents({"status": PayoutStatus.FAILED.value})
    return {
        "auto_payout_enabled": os.environ.get("AUTO_PAYOUT_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"},
        "interval_seconds": int(os.environ.get("PAYOUT_SWEEP_INTERVAL", "3600")),
        "batch_limit": int(os.environ.get("AUTO_PAYOUT_BATCH_LIMIT", "100")),
        "payouts_are_mock": os.environ.get("RAZORPAYX_DEMO_MODE", "true").strip().lower() in {"1", "true", "yes", "on"},
        "pending_eligible": pending_eligible,
        "processing": processing,
        "failed": failed,
        "latest_run": latest,
    }


# --------------- Refunds ----------------

@router.get("/refunds")
async def list_refunds(
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
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
    for r in items:
        guest = await db.users.find_one({"user_id": r["guest_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        host = await db.users.find_one({"user_id": r["host_id"]}, {"_id": 0, "full_name": 1, "email": 1})
        r["guest"] = guest
        r["host"] = host
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
    # Strict idempotency: if any refund row exists with status in {pending,processed}, block.
    dup = await db.refunds.find_one({
        "booking_id": booking_id,
        "status": {"$in": [RefundStatus.PROCESSED.value, RefundStatus.PENDING.value]},
    })
    if dup:
        raise HTTPException(400, detail="Refund already processed for this booking")

    rfd = await initiate_refund(
        db,
        booking=booking,
        reason=payload.reason,
        initiated_by=current_user["user_id"],
        initiated_by_role="admin",
        override_amount=payload.override_amount,
        override_percent=payload.override_percent,
    )
    return {
        "message": f"Refund {rfd.status.value}",
        "refund": _strip(rfd.model_dump()),
    }


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
