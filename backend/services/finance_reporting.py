"""Shared snapshot-based booking totals for finance screens."""
from services.booking_calculation_service import extract_booking_pricing_snapshot
from services.subscription_finance import to_paise


async def paid_booking_totals(db, host_id=None):
    query = {
        "payment_status": {"$in": ["paid", "partially_paid", "success", "captured", "completed"]},
        "booking_status": {"$nin": ["failed", "refunded"]},
    }
    if host_id:
        query["host_id"] = host_id
    rows = await db.bookings.find(query, {"_id": 0}).to_list(length=None)
    totals = {"platform_fee_paise": 0, "gst_paise": 0, "taxable_paise": 0}
    for row in rows:
        if row.get('booking_status') in {'cancelled', 'canceled'} and (row.get('cancellation_quote') or {}).get('refund_policy_version') != 'management_refund_20261120':
            continue
        # New-policy cancellations retain non-refundable fees/GST. Do not make
        # their collected revenue/tax disappear when the booking is cancelled.
        snapshot = extract_booking_pricing_snapshot(row)
        totals["platform_fee_paise"] += to_paise((snapshot.get("extra_charges") or {}).get("platform_fee") or 0)
        totals["gst_paise"] += to_paise(snapshot.get("gst_amount") or 0)
        totals["taxable_paise"] += to_paise(snapshot.get("host_actual_value") or 0) + to_paise(snapshot.get("total_extra_charges") or 0)
    return totals
