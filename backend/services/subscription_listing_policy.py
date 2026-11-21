"""Listing checkout policy; never rewrites subscriptions, plans or payments."""
from datetime import date, datetime, timezone
from fastapi import HTTPException
from services.booking_calculation_service import ensure_platform_settings_table

POLICY_KEY = "subscription_listing_policy"


async def get_listing_policy(db):
    await ensure_platform_settings_table(db)
    row = await db.platform_settings.find_one({"key": POLICY_KEY}, {"_id": 0}) or {}
    # Missing/malformed settings must never silently waive payment.
    return {"enabled": row.get("enabled") is not False}


def valid_subscription(subscription):
    if not subscription or subscription.get("status") != "active":
        return False
    end = subscription.get("end_date")
    if end:
        try:
            return date.fromisoformat(str(end)[:10]) >= datetime.now(timezone.utc).date()
        except ValueError:
            return False
    return True  # Preserve legacy active records without an end date.


async def listing_submission_fields(db, property_row, user):
    if property_row.get("subscription_listing_exempt") is True:
        return {}
    policy = await get_listing_policy(db)
    if not policy["enabled"]:
        # Only mark unpaid listings. Existing paid contracts keep their lifecycle.
        existing = await db.subscriptions.find_one({"property_id": property_row["property_id"], "status": "active"})
        if valid_subscription(existing):
            return {}
        if property_row.get("subscription_id"):
            linked = await db.subscriptions.find_one({"subscription_id": property_row["subscription_id"]})
            if linked:
                return {}  # Never change an existing subscription-linked property's entitlement.
        return {"subscription_listing_exempt": True,
                "subscription_listing_exempt_at": datetime.now(timezone.utc),
                "subscription_listing_exempt_reason": "listing_payments_disabled"}
    existing = await db.subscriptions.find_one({
        "property_id": property_row["property_id"], "user_id": user["user_id"], "status": "active",
    })
    if not valid_subscription(existing):
        raise HTTPException(status_code=402, detail="An active paid subscription is required before submitting this property. Refresh the listing and select a plan.")
    return {}
