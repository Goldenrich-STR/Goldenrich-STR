import asyncio

import services.booking_calculation_service as pricing_service
from services.booking_calculation_service import normalize_booking_payment_config


def test_platform_fee_is_disabled_without_admin_configuration(monkeypatch):
    monkeypatch.setenv("BOOKING_PLATFORM_FEE_PERCENT", "10")
    config = normalize_booking_payment_config({})
    assert config["charges"]["platform_fee"]["enabled"] is False


def test_legacy_admin_platform_fee_remains_enabled():
    config = normalize_booking_payment_config({"platform_fee_percent": 10})
    assert config["charges"]["platform_fee"]["enabled"] is True
    assert config["charges"]["platform_fee"]["value"] == 10.0


def test_event_fee_uses_venue_only_and_gst_uses_venue_plus_food(monkeypatch):
    async def fake_config(_db):
        return normalize_booking_payment_config({"platform_fee_percent": 10})

    async def fake_tax_slab(_db, _amount):
        return {"slab_id": "gst_18", "gst_percent": 18}

    monkeypatch.setattr(pricing_service, "get_booking_payment_config", fake_config)
    monkeypatch.setattr(pricing_service, "get_active_booking_tax_slab", fake_tax_slab)

    result = asyncio.run(pricing_service.calculate_booking_breakdown(
        None,
        58_000,
        tax_slab_base_amount=58_000,
        charge_base_amount=10_000,
        pricing_units=1,
    ))

    assert result["service_fee"] == 1_000
    assert result["subtotal_before_discount"] == 59_000
    assert result["taxes"] == 10_620
    assert result["total_amount"] == 69_620


def test_event_fee_uses_dynamic_broker_override(monkeypatch):
    async def fake_config(_db):
        return normalize_booking_payment_config({
            "platform_fee_percent": 10,
            "platform_fee_overrides": {
                "broker_mapped": {"enabled": True, "value": 15},
                "rm_mapped": {"enabled": True, "value": 10},
            },
        })

    async def fake_tax_slab(_db, _amount):
        return {"slab_id": "gst_18", "gst_percent": 18}

    monkeypatch.setattr(pricing_service, "get_booking_payment_config", fake_config)
    monkeypatch.setattr(pricing_service, "get_active_booking_tax_slab", fake_tax_slab)

    result = asyncio.run(pricing_service.calculate_booking_breakdown(
        None,
        58_000,
        tax_slab_base_amount=58_000,
        charge_base_amount=10_000,
        pricing_units=1,
        platform_fee_context="broker_mapped",
    ))

    assert result["service_fee_percent"] == 15
    assert result["service_fee"] == 1_500
    assert result["subtotal_before_discount"] == 59_500
