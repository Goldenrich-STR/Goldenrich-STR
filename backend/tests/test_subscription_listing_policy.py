import asyncio
from unittest.mock import AsyncMock
from types import SimpleNamespace
from datetime import datetime, timedelta, timezone
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from services.subscription_listing_policy import get_listing_policy, listing_submission_fields
from routes.subscription_routes import update_listing_policy, ListingPolicyUpdate, create_subscription
from routes.subscription_routes import _activate_property_after_subscription_payment
from models.subscription import SubscriptionCreate


def database(enabled=True, subscription=None):
    return SimpleNamespace(
        platform_settings=SimpleNamespace(find_one=AsyncMock(return_value=None if enabled is None else {"enabled": enabled}), update_one=AsyncMock()),
        subscriptions=SimpleNamespace(find_one=AsyncMock(return_value=subscription), update_one=AsyncMock()),
        subscription_plans=SimpleNamespace(find_one=AsyncMock(), update_one=AsyncMock()),
        properties=SimpleNamespace(update_one=AsyncMock()),
        audit_logs=SimpleNamespace(insert_one=AsyncMock()),
    )


def run(coro):
    return asyncio.run(coro)


def test_default_enabled_and_only_boolean_false_disables():
    for value in [None, True, 'false', 0]:
        assert run(get_listing_policy(database(value))) == {"enabled": True}
    assert run(get_listing_policy(database(False))) == {"enabled": False}


def test_disabled_allows_free_listing_without_touching_financial_records():
    db = database(False)
    fields = run(listing_submission_fields(db, {"property_id": "p"}, {"user_id": "host"}))
    assert fields["subscription_listing_exempt"] is True
    db.subscriptions.update_one.assert_not_awaited()
    db.subscription_plans.update_one.assert_not_awaited()


def test_reenabled_free_listing_has_no_retroactive_charge():
    db = database(True)
    assert run(listing_submission_fields(db, {"property_id": "p", "subscription_listing_exempt": True}, {"user_id": "host"})) == {}
    db.subscriptions.find_one.assert_not_awaited()


@pytest.mark.parametrize('enabled', [True, False])
def test_existing_active_subscription_remains_unchanged(enabled):
    end = (datetime.now(timezone.utc) + timedelta(days=30)).date().isoformat()
    db = database(enabled, {"status": "active", "end_date": end, "subscription_id": "paid"})
    assert run(listing_submission_fields(db, {"property_id": "p", "subscription_id": "paid"}, {"user_id": "host"})) == {}
    db.subscriptions.update_one.assert_not_awaited()
    db.subscription_plans.update_one.assert_not_awaited()


@pytest.mark.parametrize('subscription', [None, {"status": "trial", "payment_status": "order_created"}, {"status": "cancelled"}, {"status": "active", "end_date": "2000-01-01"}])
def test_enabled_rejects_unpaid_cancelled_expired(subscription):
    with pytest.raises(HTTPException) as exc:
        run(listing_submission_fields(database(True, subscription), {"property_id": "p"}, {"user_id": "host"}))
    assert exc.value.status_code == 402


def test_non_admin_cannot_toggle():
    db = database()
    with pytest.raises(HTTPException) as exc:
        run(update_listing_policy(ListingPolicyUpdate(enabled=False, reason='Test disable'), {"user_id": "host", "role": "host"}, db))
    assert exc.value.status_code == 403
    db.platform_settings.update_one.assert_not_awaited()


def test_toggle_updates_only_setting_and_audit():
    db = database()
    assert run(update_listing_policy(ListingPolicyUpdate(enabled=False, reason='Management request'), {"user_id": "admin", "role": "admin"}, db)) == {"enabled": False}
    db.platform_settings.update_one.assert_awaited_once()
    db.audit_logs.insert_one.assert_awaited_once()
    db.subscriptions.update_one.assert_not_awaited()
    db.subscription_plans.update_one.assert_not_awaited()
    db.properties.update_one.assert_not_awaited()


def test_disabled_checkout_cannot_create_or_charge():
    db = database(False)
    with pytest.raises(HTTPException) as exc:
        run(create_subscription(SubscriptionCreate(plan_id='plan', property_id='p'), {"user_id": "host"}, db))
    assert exc.value.status_code == 409
    db.subscription_plans.find_one.assert_not_awaited()


def test_payload_rejects_text_boolean():
    with pytest.raises(ValidationError):
        ListingPolicyUpdate(enabled='false', reason='Management request')


def test_pending_paid_confirmation_still_activates_after_disabled():
    db = database(False)
    db.properties.find_one = AsyncMock(return_value={"property_id": "p", "status": "live", "subscription_listing_exempt": True})
    assert run(_activate_property_after_subscription_payment(db, {"property_id": "p"}, "paid-sub")) == "p"
    fields = db.properties.update_one.call_args.args[1]["$set"]
    assert fields["subscription_id"] == "paid-sub"
    assert fields["subscription_status"] == "active"
    assert fields["subscription_listing_exempt"] is False
    db.platform_settings.find_one.assert_not_awaited()


def test_stale_plan_id_does_not_prevent_free_submission():
    db = database(False)
    fields = run(listing_submission_fields(db, {"property_id": "p", "subscription_id": "old-plan-id"}, {"user_id": "host"}))
    assert fields["subscription_listing_exempt"] is True


def test_free_submission_keeps_verification_workflow(monkeypatch):
    import sys
    from routes.property_routes import submit_for_verification
    workflow = AsyncMock(return_value={"verification_id": "case", "current_stage": "documents"})
    monkeypatch.setitem(sys.modules, 'services.verification_case_workflow', SimpleNamespace(upsert_verification_case=workflow))
    db = database(False)
    db.properties.find_one = AsyncMock(return_value={"property_id": "p", "owner_id": "host", "status": "draft"})
    db.users = SimpleNamespace(find_one=AsyncMock(return_value={"user_id": "host"}))
    result = run(submit_for_verification('p', {"user_id": "host"}, db))
    assert result["verification_id"] == 'case'
    fields = db.properties.update_one.call_args.args[1]["$set"]
    assert fields["status"] == 'pending_verification'
    assert fields["subscription_listing_exempt"] is True
    workflow.assert_awaited_once()
