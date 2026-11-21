from routes.admin_account_routes import _booking_invoice_breakdown
from services.booking_calculation_service import extract_booking_pricing_snapshot


def callisto():
    return {"base_amount": 58000, "discount_amount": 57420, "total_amount": 684.4, "paid_amount": 684.4,
            "taxes": 104.4, "service_fee": 0,
            "pricing_breakdown": {"host_amount": 58000, "base_amount": 58000, "discount_amount": 57420,
                "taxable_amount": 580, "total_amount": 684.4, "gst_amount": 104.4,
                "charges": [{"key": key, "amount": 0, "enabled": key == "platform_fee"} for key in
                    ["platform_fee", "payment_gateway_charge", "cleaning_fee", "insurance_fee", "convenience_fee", "extra_guest_fee"]]}}


def test_saved_discounted_checkout_is_not_discounted_twice():
    row = _booking_invoice_breakdown({"booking": callisto(), "amount": 68440})
    assert row["base_amount"] == 58000
    assert row["discount_amount"] == 57420
    assert row["taxable_amount"] == 580
    assert row["extra_charges_total"] == 0
    assert row["platform_fee"] == 0
    assert row["cgst"] == 52.2 and row["sgst"] == 52.2
    assert row["total_amount"] == 684.4
    assert row["base_amount"] + row["extra_charges_total"] - row["discount_amount"] == row["taxable_amount"]


def test_host_actual_is_separate_from_original_invoice_base():
    saved = callisto()
    snapshot = extract_booking_pricing_snapshot(saved)
    assert snapshot["host_actual_value"] == 580
    assert snapshot["host_listed_value"] == 58000
    assert snapshot["total_extra_charges"] == 0
    assert saved["base_amount"] == 58000
