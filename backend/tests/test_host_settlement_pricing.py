import asyncio

from services import booking_calculation_service as pricing_service
from services import tds_service


def discounted_booking():
    return {
        "booking_id": "BK5B5F82BB24D546",
        "host_id": "host_varun",
        "created_at": "2026-09-22T00:00:00+00:00",
        "base_amount": 58_000,
        "host_amount": 58_000,
        "discount_amount": 57_420,
        "gst_amount": 104.40,
        "total_amount": 684.40,
        "charges": [
            {"key": "platform_fee", "enabled": False, "amount": 0},
            {"key": "cleaning_fee", "enabled": False, "amount": 0},
        ],
    }


def test_snapshot_uses_discounted_host_value_and_preserves_zero_charges():
    snapshot = pricing_service.extract_booking_pricing_snapshot(discounted_booking())

    assert snapshot["host_listed_value"] == 58_000
    assert snapshot["host_discount_amount"] == 57_420
    assert snapshot["host_actual_value"] == 580
    assert snapshot["gst_amount"] == 104.40
    assert snapshot["customer_final_payable"] == 684.40
    assert snapshot["extra_charges"]["platform_fee"] == 0
    assert snapshot["extra_charges"]["cleaning_fee"] == 0


def test_payout_uses_discounted_host_value_and_no_tds_below_threshold(monkeypatch):
    async def no_tds_below_threshold(*args, **kwargs):
        assert kwargs["gross_booking_value"] == 580
        return {
            "enabled": True,
            "provision_code": "Section 194-O",
            "gross_booking_value": 580,
            "tds_base_amount": 580,
            "threshold_amount": 500_000,
            "threshold_crossed": False,
            "rate_percent": 0,
            "tds_amount": 0,
        }

    monkeypatch.setattr(pricing_service, "calculate_host_payout_tds", no_tds_below_threshold)
    payout = asyncio.run(pricing_service.calculate_host_payout_breakdown(object(), booking=discounted_booking()))

    assert payout["gross_amount"] == 58_000
    assert payout["host_actual_value_amount"] == 58_000
    assert payout["platform_fee"] == 0
    assert payout["tds_amount"] == 0
    assert payout["net_amount"] == 58_000


def test_missing_host_link_does_not_use_zero_other_entity_threshold(monkeypatch):
    async def config(*args, **kwargs):
        return {
            "is_enabled": True,
            "config_id": "host-rule",
            "version": 1,
            "provision_code": "Section 194-O",
            "standard_rate": 0.1,
            "missing_pan_rate": 5,
            "pan_aadhaar_required": True,
            "rounding_method": "NEAREST_RUPEE",
            "thresholds": {"individual_huf": 500_000, "other_entity": 0},
        }

    monkeypatch.setattr(tds_service, "get_active_tds_config", config)
    result = asyncio.run(tds_service.calculate_host_payout_tds(
        object(),
        host_id="",
        booking_id="BKFA212FC078B243",
        gross_booking_value=580,
        transaction_date="2026-10-17",
    ))

    assert result["threshold_key"] == "individual_huf"
    assert result["threshold_amount"] == 500_000
    assert result["threshold_crossed"] is False
    assert result["rate_percent"] == 0
    assert result["tds_amount"] == 0
