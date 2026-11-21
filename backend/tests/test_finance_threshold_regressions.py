import asyncio
from types import SimpleNamespace
from decimal import Decimal

from routes import admin_account_routes as finance
from services import booking_calculation_service as pricing
from services import tds_service as tds
from services.subscription_finance import checkout_snapshot


def run(coroutine):
    return asyncio.run(coroutine)


class Cursor:
    def __init__(self, rows):
        self.rows = rows

    async def to_list(self, length=None):
        return self.rows


def booking():
    return {
        "booking_id": "test-booking", "host_id": "test-host",
        "created_at": "2026-11-17T00:00:00+00:00",
        "base_amount": 8000, "host_amount": 8000,
        "platform_fee": 800, "gst_amount": 1584, "total_amount": 10384,
        "extra_charges": {"platform_fee": 800},
    }


def configure_tds(monkeypatch, prior=0, entity="individual", enabled=True):
    async def config(*args, **kwargs):
        return {
            "is_enabled": enabled, "standard_rate": 0.1, "missing_pan_rate": 20,
            "pan_aadhaar_required": True, "rounding_method": "NEAREST_RUPEE",
            "thresholds": {"individual_huf": 500000, "other_entity": 0},
        }

    async def profile(db, host_id):
        assert host_id == "test-host"
        return {"legal_entity_type": entity, "residential_status": "resident", "pan_status": "missing"}

    async def previous(*args, **kwargs):
        return Decimal(str(prior))

    monkeypatch.setattr(tds, "get_active_tds_config", config)
    monkeypatch.setattr(tds, "get_host_tax_profile", profile)
    monkeypatch.setattr(tds, "_fy_gross_before", previous)


def test_missing_pan_does_not_override_configured_unreached_threshold(monkeypatch):
    configure_tds(monkeypatch)
    result = run(pricing.calculate_host_payout_breakdown(object(), booking=booking()))
    assert result["gross_amount"] == 800000
    assert result["platform_fee"] == 80000
    assert result["tds_amount"] == 0
    assert result["net_amount"] == 800000
    assert result["tds_breakdown"]["threshold_amount"] == 500000
    assert not result["tds_breakdown"]["threshold_crossed"]


def test_crossed_threshold_preserves_configured_missing_pan_rate(monkeypatch):
    configure_tds(monkeypatch, prior=499000)
    result = run(pricing.calculate_host_payout_breakdown(object(), booking=booking()))
    assert result["tds_amount"] == 160000
    assert result["net_amount"] == 640000


def test_legacy_booking_uses_payout_host_for_real_threshold_check(monkeypatch):
    configure_tds(monkeypatch)
    row = booking()
    del row["host_id"]
    context = finance._payout_booking_context(row, {"host_id": "test-host", "payout_id": "current-payout"})
    assert "host_id" not in row
    assert context["payout_id"] == "current-payout"
    result = run(pricing.calculate_host_payout_breakdown(object(), booking=context))
    assert result["tds_breakdown"]["host_id"] == "test-host"
    assert result["tds_amount"] == 0
    assert result["net_amount"] == 800000


def test_other_entity_keeps_its_separate_threshold(monkeypatch):
    configure_tds(monkeypatch, entity="company")
    result = run(pricing.calculate_host_payout_breakdown(object(), booking=booking()))
    assert result["tds_breakdown"]["threshold_key"] == "other_entity"
    assert result["tds_amount"] == 160000


def test_discounted_host_supply_and_zero_fee_are_preserved(monkeypatch):
    configure_tds(monkeypatch)
    row = {**booking(), "host_amount": 58000, "base_amount": 58000,
           "discount_amount": 57420, "gst_amount": 104.4, "total_amount": 684.4,
           "platform_fee": 0, "charges": [{"key": "platform_fee", "enabled": False, "amount": 0}]}
    result = run(pricing.calculate_host_payout_breakdown(object(), booking=row))
    assert result["gross_amount"] == 58000
    assert result["platform_fee"] == 0
    assert result["net_amount"] == 58000


def test_actual_snapshot_is_not_discounted_twice_and_zero_beats_stale_fee():
    row = {**booking(), "host_actual_value": 580, "discount_amount": 57420,
           "pricing_snapshot": {"host_actual_value": 580, "extra_charges": {"platform_fee": 0}}}
    snapshot = pricing.extract_booking_pricing_snapshot(row)
    assert snapshot["host_actual_value"] == 580
    assert snapshot["extra_charges"]["platform_fee"] == 0


def test_explicit_zero_actual_value_does_not_fall_back_to_listed_price():
    row = {**booking(), "host_actual_value": 0}
    assert pricing.extract_booking_pricing_snapshot(row)["host_actual_value"] == 0


def test_overview_uses_fee_snapshot_and_includes_pending_obligations(monkeypatch):
    class Transactions:
        def find(self, query, projection):
            assert query == {"type": "subscription", "status": "success"}
            return Cursor([{"amount": 14160, "financial_snapshot": checkout_snapshot({
                "plan_fee": 100, "platform_fee": 20, "tax_percent": 18,
                "tax_amount": 21.6, "total_amount": 141.6,
            })}])

        def aggregate(self, pipeline):
            return Cursor([
                {"_id": "booking_payment", "total_paise": 1038400, "count": 1},
                {"_id": "subscription", "total_paise": 14160, "count": 1},
            ])

    class Bookings:
        def find(self, query, projection):
            assert "paid" in query["payment_status"]["$in"]
            return Cursor([booking()])

        def aggregate(self, pipeline):
            assert "paid" in pipeline[0]["$match"]["payment_status"]["$in"]
            return Cursor([{"total": 1584}])

    class Payouts:
        async def count_documents(self, query):
            assert "pending" in query["status"]["$in"]
            assert "paid" not in query["status"]["$in"]
            return 1

        def aggregate(self, pipeline):
            assert "pending" in pipeline[0]["$match"]["status"]["$in"]
            return Cursor([{"total": 800000}])

    async def mrr(db):
        return 0

    monkeypatch.setattr(finance, "_compute_mrr", mrr)
    db = SimpleNamespace(transactions=Transactions(), bookings=Bookings(), payouts=Payouts())
    result = run(finance.overview(current_user={"role": "admin"}, db=db))
    revenue = result["revenue"]
    assert revenue["booking_payments_paise"] == 1038400
    assert revenue["platform_take_paise"] == 92000
    assert revenue["platform_revenue_breakdown"] == {
        "booking_platform_fees_paise": 80000,
        "subscription_revenue_paise": 12000,
        "subscription_receipts_paise": 14160,
        "subscription_gst_paise": 2160,
        "unclassified_subscription_receipts_paise": 0,
        "subscriptions_requiring_review": 0,
        "total_paise": 92000,
        "basis": "booking_fees_plus_subscription_revenue_excluding_gst",
    }
    assert revenue["booking_gst_paise"] == 158400
    assert revenue["subscription_gst_paise"] == 2160
    assert revenue["total_tax_paise"] == 160560
    assert result["pending_payouts"] == {"count": 1, "amount_paise": 800000}
    assert (
        revenue["platform_take_paise"] + result["pending_payouts"]["amount_paise"] + revenue["total_tax_paise"]
        == revenue["booking_payments_paise"] + revenue["subscriptions_paise"]
    )
