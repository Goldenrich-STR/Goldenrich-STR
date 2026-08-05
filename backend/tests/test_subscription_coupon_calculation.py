import sys
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from routes.subscription_routes import _subscription_coupon_breakdown


def test_final_taxable_subscription_coupon_sets_taxable_amount_before_gst():
    plan = {
        "price_monthly": 2000,
        "platform_fee": 299,
        "tax_percent": 18,
    }
    coupon = {
        "discount_type": "target_taxable",
        "discount_value": 10,
    }

    breakdown = _subscription_coupon_breakdown(plan, coupon)

    assert breakdown["taxable_amount"] == 2299
    assert breakdown["discount_amount"] == 2289
    assert breakdown["discounted_taxable_amount"] == 10
    assert breakdown["tax_amount"] == 1.8
    assert breakdown["total_amount"] == 11.8


def test_percentage_subscription_coupon_discounts_gross_before_gst():
    plan = {
        "price_monthly": 2000,
        "platform_fee": 299,
        "tax_percent": 18,
    }
    coupon = {
        "discount_type": "percentage",
        "discount_value": 50,
    }

    breakdown = _subscription_coupon_breakdown(plan, coupon)

    assert breakdown["taxable_amount"] == 2299
    assert breakdown["discount_amount"] == 1149.5
    assert breakdown["discounted_taxable_amount"] == 1149.5
    assert breakdown["tax_amount"] == 206.91
    assert breakdown["total_amount"] == 1356.41
