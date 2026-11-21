"""Subscription revenue/GST classification; all report amounts are integer paise.

New payments use the immutable checkout snapshot. Legacy records may use an
explicit plan rate for display, but are always flagged for historical review.
There is deliberately no default tax percentage here.
"""
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP


def decimal_amount(value):
    try:
        result = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("Invalid financial amount") from None
    if not result.is_finite() or result < 0:
        raise ValueError("Financial amount must be finite and nonnegative")
    return result


def to_paise(value):
    return int((decimal_amount(value) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def checkout_snapshot(breakdown):
    """Freeze configured checkout values, including explicit zero tax/fees."""
    total = to_paise(breakdown["total_amount"])
    tax = to_paise(breakdown["tax_amount"])
    taxable = to_paise(breakdown.get("discounted_taxable_amount", breakdown.get("taxable_amount", Decimal(total - tax) / 100)))
    if tax > total or taxable + tax != total:
        raise ValueError("Subscription taxable amount + GST must equal total")
    rate = decimal_amount(breakdown["tax_percent"])
    expected_tax = int((Decimal(taxable) * rate / 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if abs(expected_tax - tax) > 1:
        raise ValueError("Subscription GST does not match configured checkout rate")
    return {
        "schema_version": 1, "unit": "paise", "total_paise": total,
        "taxable_paise": taxable, "gst_paise": tax, "tax_percent": float(rate),
        "plan_fee_paise": to_paise(breakdown.get("plan_fee", 0)),
        "platform_fee_paise": to_paise(breakdown.get("platform_fee", 0)),
        "discount_paise": to_paise(breakdown.get("discount_amount", 0)),
    }


def classify_subscription(transaction, subscription=None, plan=None):
    subscription, plan = subscription or {}, plan or {}
    gross_value = decimal_amount(transaction.get("amount", 0))
    if gross_value != gross_value.to_integral_value():
        raise ValueError("Transaction amount must be integer paise")
    gross = int(gross_value)
    for candidate in (transaction.get("financial_snapshot"), subscription.get("financial_snapshot")):
        if not isinstance(candidate, dict):
            continue
        try:
            values = [decimal_amount(candidate[key]) for key in ("total_paise", "taxable_paise", "gst_paise")]
            if any(value != value.to_integral_value() for value in values):
                continue
            total, revenue, gst = map(int, values)
            if candidate.get("schema_version") != 1 or candidate.get("unit") != "paise" or total != gross or revenue + gst != total:
                continue
            rate = decimal_amount(candidate["tax_percent"])
            expected_tax = int((Decimal(revenue) * rate / 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
            if abs(expected_tax - gst) > 1:
                continue
        except (KeyError, ValueError):
            continue
        return {"gross_paise": gross, "revenue_paise": revenue, "gst_paise": gst,
                "unclassified_paise": 0, "source": "checkout_snapshot", "needs_review": False,
                "snapshot": candidate}

    # A saved invoice/rate on the subscription is historical evidence; a live
    # plan rate is an estimate only. Never backfill it silently on page reads.
    for source, data in (("stored_invoice", transaction.get("invoice_breakdown")),
                         ("stored_invoice", subscription.get("invoice_breakdown")),
                         ("stored_checkout", subscription.get("pricing_snapshot")),
                         ("stored_checkout", subscription.get("amount_breakdown"))):
        if not isinstance(data, dict):
            continue
        try:
            snapshot = checkout_snapshot(data)
        except (ValueError, KeyError, TypeError):
            continue
        if snapshot["total_paise"] == gross:
            return {"gross_paise": gross, "revenue_paise": snapshot["taxable_paise"],
                    "gst_paise": snapshot["gst_paise"], "unclassified_paise": 0,
                    "source": source, "needs_review": False}

    for source, data in (("stored_tax_rate", subscription), ("legacy_current_plan", plan)):
        if data.get("tax_percent") is None:
            continue
        try:
            rate = decimal_amount(data["tax_percent"])
        except ValueError:
            continue
        revenue = int((Decimal(gross) / (1 + rate / 100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
        return {"gross_paise": gross, "revenue_paise": revenue, "gst_paise": gross - revenue,
                "unclassified_paise": 0, "source": source,
                "needs_review": source == "legacy_current_plan"}
    return {"gross_paise": gross, "revenue_paise": 0, "gst_paise": 0,
            "unclassified_paise": gross, "source": "missing_tax_snapshot", "needs_review": True}


async def subscription_collection_totals(db):
    rows = await db.transactions.find({"type": "subscription", "status": "success"}, {"_id": 0}).to_list(length=None)
    totals = {"gross_paise": 0, "revenue_paise": 0, "gst_paise": 0,
              "unclassified_paise": 0, "review_count": 0, "count": 0}
    subscriptions, plans = {}, {}
    for transaction in rows:
        subscription_id = transaction.get("subscription_id")
        if subscription_id and subscription_id not in subscriptions:
            subscriptions[subscription_id] = await db.subscriptions.find_one({"subscription_id": subscription_id}, {"_id": 0}) or {}
        subscription = subscriptions.get(subscription_id, {})
        # Resolve a live plan only for legacy classification, never overwrite
        # or reprice an existing checkout snapshot.
        result = classify_subscription(transaction, subscription)
        if result["unclassified_paise"]:
            plan_id = subscription.get("plan_id")
            if plan_id and plan_id not in plans:
                plans[plan_id] = await db.subscription_plans.find_one({"plan_id": plan_id}, {"_id": 0}) or {}
            result = classify_subscription(transaction, subscription, plans.get(plan_id, {}))
        for key in ("gross_paise", "revenue_paise", "gst_paise", "unclassified_paise"):
            totals[key] += result[key]
        totals["review_count"] += int(result["needs_review"])
        totals["count"] += 1
    return totals
