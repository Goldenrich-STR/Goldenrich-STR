import asyncio
from types import SimpleNamespace

import pytest

from services.subscription_finance import checkout_snapshot, classify_subscription, subscription_collection_totals
from routes.admin_account_routes import _subscription_invoice_breakdown


def snapshot(rate=18, tax=21.6, total=141.6):
    return checkout_snapshot({"plan_fee": 100, "platform_fee": 20,
                              "tax_percent": rate, "tax_amount": tax, "total_amount": total})


def test_reported_subscription_excludes_gst_from_revenue():
    result = classify_subscription({"amount": 14160, "financial_snapshot": snapshot()})
    assert result["gross_paise"] == 14160
    assert result["revenue_paise"] == 12000
    assert result["gst_paise"] == 2160
    assert not result["needs_review"]


def test_plan_changes_cannot_reprice_a_captured_payment_or_invoice():
    tx = {"amount": 14160, "financial_snapshot": snapshot(),
          "plan": {"tax_percent": 5, "price_monthly": 400, "platform_fee": 50}}
    result = classify_subscription(tx, plan=tx["plan"])
    invoice = _subscription_invoice_breakdown(tx)
    assert result["revenue_paise"] == 12000
    assert result["gst_paise"] == 2160
    assert invoice["tax_percent"] == 18
    assert invoice["plan_fee"] == 100
    assert invoice["platform_fee"] == 20
    assert invoice["cgst"] + invoice["sgst"] == 21.6


def test_zero_tax_is_not_replaced_with_eighteen_percent():
    result = classify_subscription({"amount": 12000}, {"financial_snapshot": snapshot(0, 0, 120)}, {"tax_percent": 18})
    assert result["revenue_paise"] == 12000
    assert result["gst_paise"] == 0


def test_checkout_response_preserves_saved_amounts_after_plan_changes():
    from routes.subscription_routes import _subscription_checkout_payload
    result = _subscription_checkout_payload(
        {"subscription_id": "test-sub", "amount": 141.6, "financial_snapshot": snapshot()},
        {"plan_name": "Changed plan"},
        {"plan_fee": 400, "platform_fee": 50, "tax_percent": 5,
         "tax_amount": 22.5, "total_amount": 472.5, "discount_amount": 0},
        None,
    )
    assert result["amount"] == 14160
    assert result["plan_fee"] == 100
    assert result["platform_fee"] == 20
    assert result["tax_percent"] == 18
    assert result["tax_amount"] == 21.6


def test_legacy_plan_rate_is_explicit_and_flagged():
    result = classify_subscription({"amount": 14160}, {}, {"tax_percent": 18})
    assert result["revenue_paise"] == 12000
    assert result["gst_paise"] == 2160
    assert result["needs_review"]
    zero = classify_subscription({"amount": 12000}, {}, {"tax_percent": 0})
    assert zero["gst_paise"] == 0


def test_missing_legacy_rate_is_unclassified_instead_of_fabricated():
    result = classify_subscription({"amount": 14160}, {}, {})
    assert result["unclassified_paise"] == 14160
    assert result["revenue_paise"] == result["gst_paise"] == 0
    assert result["needs_review"]


@pytest.mark.parametrize("amount", [-1, float("nan"), float("inf"), "bad"])
def test_invalid_financial_values_are_rejected(amount):
    with pytest.raises(ValueError):
        classify_subscription({"amount": amount})


def test_invalid_snapshot_does_not_override_an_explicit_legacy_rate():
    invalid = {**snapshot(), "gst_paise": 99999}
    result = classify_subscription({"amount": 14160, "financial_snapshot": invalid}, {}, {"tax_percent": 18})
    assert result["source"] == "legacy_current_plan"
    assert result["needs_review"]


def test_checkout_cannot_store_an_inconsistent_gst_snapshot():
    with pytest.raises(ValueError):
        checkout_snapshot({"plan_fee": 100, "platform_fee": 20, "tax_percent": 18,
                           "tax_amount": 12, "discounted_taxable_amount": 120, "total_amount": 141.6})


def test_legacy_capture_only_accepts_explicitly_verified_invoice():
    from tools.capture_uat_subscription_snapshot import verified_snapshot
    subscription = {"amount": 141.6, "billing_cycle": "monthly"}
    plan = {"price_monthly": 100, "platform_fee": 20, "tax_percent": 18}
    expected = {"plan_fee_paise": 100, "platform_fee_paise": 20, "gst_paise": 21.6, "total_paise": 141.6}
    result = verified_snapshot(subscription, plan, expected)
    assert result["gst_paise"] == 2160
    with pytest.raises(ValueError):
        verified_snapshot(subscription, {**plan, "tax_percent": 5}, expected)
    with pytest.raises(ValueError):
        verified_snapshot({**subscription, "amount": 1000}, plan, expected)


def test_rollup_preserves_paise_and_reads_without_updating_data():
    class Cursor:
        async def to_list(self, length=None):
            assert length is None
            return [
                {"amount": 14160, "financial_snapshot": snapshot()},
                {"amount": 12600, "financial_snapshot": snapshot(5, 6, 126)},
                {"amount": 12000, "financial_snapshot": snapshot(0, 0, 120)},
            ]

    class Transactions:
        def find(self, query, projection):
            assert query == {"type": "subscription", "status": "success"}
            return Cursor()

    totals = asyncio.run(subscription_collection_totals(SimpleNamespace(transactions=Transactions())))
    assert totals["revenue_paise"] == 36000
    assert totals["gst_paise"] == 2760
    assert totals["gross_paise"] == 38760
    assert totals["review_count"] == 0


def test_subscription_ledger_retains_snapshot_and_is_idempotent():
    from models.transaction import TransactionType
    from services.account_service import record_transaction

    class Transactions:
        def __init__(self):
            self.rows = []

        async def find_one(self, query):
            return self.rows[0] if self.rows else None

        async def insert_one(self, row):
            self.rows.append(row)

    store = Transactions()
    db = SimpleNamespace(transactions=store)

    async def payments():
        await record_transaction(db, type=TransactionType.SUBSCRIPTION, amount=14160,
                                 subscription_id="test-sub", razorpay_payment_id="test-paid",
                                 financial_snapshot=snapshot())
        await record_transaction(db, type=TransactionType.SUBSCRIPTION, amount=14160,
                                 subscription_id="test-sub", razorpay_payment_id="test-paid",
                                 financial_snapshot=snapshot(5, 6, 126))

    asyncio.run(payments())
    assert len(store.rows) == 1
    assert store.rows[0]["financial_snapshot"]["gst_paise"] == 2160


def test_subscription_confirmation_copies_checkout_snapshot_to_ledger():
    from routes.subscription_routes import _record_subscription_transaction

    class Transactions:
        async def find_one(self, query):
            return None

        async def insert_one(self, row):
            self.inserted = row

    store = Transactions()
    sub = {"subscription_id": "test-sub", "amount": 141.6,
           "financial_snapshot": snapshot(), "user_id": "test-host"}
    assert asyncio.run(_record_subscription_transaction(SimpleNamespace(transactions=store), sub, payment_id="test-payment"))
    assert store.inserted["amount"] == 14160
    assert store.inserted["financial_snapshot"] == sub["financial_snapshot"]


def test_tax_workspace_uses_same_gst_and_correct_paise_units(monkeypatch):
    from routes import admin_core_routes as core

    class Cursor:
        def __init__(self, rows):
            self.rows = rows

        def sort(self, *args):
            return self

        def limit(self, *args):
            return self

        async def to_list(self, length=None):
            return self.rows

    class Collection:
        def __init__(self, rows=None):
            self.rows = rows or []

        def find(self, query, projection=None):
            rows = self.rows
            if "type" in query:
                rows = [row for row in rows if row.get("type") == query["type"] and row.get("status") == query.get("status")]
            return Cursor(rows)

        async def find_one(self, *args):
            return None

    class DB:
        payouts = Collection([{"gross_amount": 800000, "tds_amount": 0, "platform_fee": 80000}])
        bookings = Collection([{"booking_id": "b", "host_amount": 8000,
                                "extra_charges": {"platform_fee": 800},
                                "gst_amount": 1584, "total_amount": 10384}])
        transactions = Collection([{"type": "subscription", "status": "success", "amount": 14160,
                                    "financial_snapshot": snapshot()}])

        def __getattr__(self, name):
            return Collection()

    async def config(*args, **kwargs):
        return {"commission_rules": {}}

    monkeypatch.setattr(core, "get_booking_payment_config", config)
    monkeypatch.setattr(core, "get_active_tds_config", config)
    result = asyncio.run(core.finance_tax_commission(current_user={"role": "admin"}, db=DB()))["data"]
    assert result["summary"]["booking_gst"] == 1584
    assert result["summary"]["subscription_gst"] == 21.6
    assert result["summary"]["tds_hold"] == 0
    assert result["summary"]["platform_commission"] == 800
    assert result["tax_ledger"][1]["tax_amount"] == 21.6
    assert result["tax_ledger"][1]["taxable_amount"] == 120
