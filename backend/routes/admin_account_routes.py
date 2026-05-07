"""Phase 15 — Super Admin Account section: ledger, payouts, refunds, analytics."""
from __future__ import annotations

import csv
import io
import logging
from datetime import date, datetime, timedelta
from typing import Optional

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

def _txn_query(
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
            # inclusive end-of-day
            created["$lt"] = datetime.fromisoformat(end) + timedelta(days=1)
        query["created_at"] = created
    if q:
        query["$or"] = [
            {"booking_id": {"$regex": q, "$options": "i"}},
            {"razorpay_payment_id": {"$regex": q, "$options": "i"}},
            {"razorpay_payout_id": {"$regex": q, "$options": "i"}},
            {"razorpay_refund_id": {"$regex": q, "$options": "i"}},
            {"user_id": {"$regex": q, "$options": "i"}},
            {"host_id": {"$regex": q, "$options": "i"}},
            {"transaction_id": {"$regex": q, "$options": "i"}},
        ]
    return query


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
        query = _txn_query(type, status, start, end, q)
        cursor = (
            db.transactions.find(query, {"_id": 0})
            .sort("created_at", -1)
            .skip(skip)
            .limit(limit)
        )
        items = await cursor.to_list(length=limit)
        total = await db.transactions.count_documents(query)
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
    query = _txn_query(type, status, start, end, q)
    cursor = db.transactions.find(query, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(length=10000)

    buf = io.StringIO()
    fields = [
        "transaction_id", "type", "status", "amount_inr", "currency",
        "razorpay_order_id", "razorpay_payment_id", "razorpay_refund_id", "razorpay_payout_id",
        "user_id", "host_id", "booking_id", "subscription_id", "payout_id", "refund_id",
        "notes", "is_mock", "created_at",
    ]
    writer = csv.DictWriter(buf, fieldnames=fields)
    writer.writeheader()
    for t in items:
        writer.writerow({
            "transaction_id": t.get("transaction_id"),
            "type": t.get("type"),
            "status": t.get("status"),
            "amount_inr": round((t.get("amount") or 0) / 100, 2),
            "currency": t.get("currency"),
            "razorpay_order_id": t.get("razorpay_order_id"),
            "razorpay_payment_id": t.get("razorpay_payment_id"),
            "razorpay_refund_id": t.get("razorpay_refund_id"),
            "razorpay_payout_id": t.get("razorpay_payout_id"),
            "user_id": t.get("user_id"),
            "host_id": t.get("host_id"),
            "booking_id": t.get("booking_id"),
            "subscription_id": t.get("subscription_id"),
            "payout_id": t.get("payout_id"),
            "refund_id": t.get("refund_id"),
            "notes": t.get("notes"),
            "is_mock": t.get("is_mock"),
            "created_at": (
                t["created_at"].isoformat()
                if isinstance(t.get("created_at"), datetime)
                else t.get("created_at")
            ),
        })
    buf.seek(0)
    filename = f"transactions_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


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
            {"user_id": p["host_id"]}, {"_id": 0, "full_name": 1, "email": 1}
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
