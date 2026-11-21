from dataclasses import asdict
from datetime import datetime, time, timezone, timedelta
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from zoneinfo import ZoneInfo
from services.refund_policy_timing import evaluate_refund_timing, POLICY_VERSION


def paise(value):
    try:
        number = Decimal(str(value or 0))
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError('Invalid booking monetary value')
    if not number.is_finite() or number < 0:
        raise ValueError("Invalid booking monetary value")
    return int((number * 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))


def aware(value):
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    parsed = datetime.fromisoformat(str(value).replace('Z', '+00:00'))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def approved_non_refundable(booking):
    # Only explicit rate/booking flags qualify. A policy paragraph mentioning
    # non-refundable fees must not turn a refundable stay into a non-refundable rate.
    for key in ('is_non_refundable', 'non_refundable', 'non_refundable_booking', 'approved_non_refundable_rate'):
        if booking.get(key) is True or str(booking.get(key) or '').lower() in {'true', '1', 'yes'}:
            return True
    for key in ('booking_type', 'rate_type', 'rate_plan', 'cancellation_policy', 'refund_policy'):
        value = booking.get(key)
        if isinstance(value, dict):
            if value.get('is_non_refundable') is True:
                return True
            value = value.get('type') or value.get('code')
        text = str(getattr(value, 'value', value) or '').strip().lower().replace('-', '_').replace(' ', '_')
        if text in {'non_refundable', 'no_refund', 'nonrefundable'}:
            return True
    return False


def quote_refund(booking, property_row=None, *, requested_at=None, cancellation_type='guest', override_amount=None, override_percent=None):
    from services.account_service import _booking_refundable_base_to_paise
    from services.booking_calculation_service import extract_booking_pricing_snapshot
    property_row = property_row or {}
    context = booking.get('refund_policy_context') or {}
    zone_name = context.get('timezone') or property_row.get('timezone') or 'Asia/Kolkata'
    zone = ZoneInfo(zone_name)
    date_text = str(booking.get('check_in_date') or '')[:10]
    clock = context.get('check_in_time') or booking.get('check_in_time') or booking.get('start_time') or property_row.get('check_in_time') or '12:00'
    check_in = aware(context['check_in_at']) if context.get('check_in_at') else datetime.combine(datetime.fromisoformat(date_text).date(), time.fromisoformat(clock), tzinfo=zone)
    requested = aware(requested_at or datetime.now(timezone.utc))
    created = booking.get('created_at') or booking.get('booked_at') or booking.get('confirmed_at')
    missing_created = not created
    historical_clock = not context.get('check_in_at') and not context.get('check_in_time') and not booking.get('check_in_time') and not booking.get('start_time')
    # Missing historic booking time cannot grant a cooling-off exception.
    booked = aware(created) if created else min(check_in, requested) - timedelta(days=30)
    decision = evaluate_refund_timing(booked_at=booked, check_in_at=check_in, requested_at=requested,
        property_timezone=zone_name, cancellation_type=cancellation_type,
        non_refundable=approved_non_refundable(booking), no_show=booking.get('no_show') is True or booking.get('booking_status') in {'no_show', 'noshow'},
        verified_fraud=booking.get('fraud_verified') is True)
    total = paise(booking.get('total_amount'))
    try:
        pricing = extract_booking_pricing_snapshot(booking)
    except (InvalidOperation, OverflowError, TypeError):
        raise ValueError('Invalid stored booking pricing; reconcile before refund review')
    paid_value = booking.get('paid_amount') if booking.get('paid_amount') is not None else booking.get('amount_paid')
    if paid_value is None:
        paid_value = booking.get('advance_amount', 0) if booking.get('payment_status') == 'partially_paid' else (booking.get('total_amount') if booking.get('payment_status') in {'paid', 'success', 'captured', 'completed'} else 0)
    paid = min(total, paise(paid_value))
    charges = pricing.get('extra_charges') or {}
    # Aliases represent the same charge. Retain every non-refundable charge in
    # every tier, including host cancellations and admin exceptions.
    groups = [('platform_fee', 'service_fee'), ('payment_gateway_charge', 'gateway_charge'),
              ('convenience_fee', 'platform_convenience_fee'), ('insurance_fee', 'protection_fee'),
              ('cleaning_fee',), ('extra_guest_fee',)]
    charge_total = sum(paise(next((charges[k] for k in keys if charges.get(k) is not None), 0)) for keys in groups)
    charge_total = max(charge_total, paise(pricing.get('total_extra_charges')))
    tax = paise(pricing.get('gst_amount', booking.get('taxes', 0)))
    base = min(_booking_refundable_base_to_paise(booking), max(0, paid - charge_total - tax))
    percent = decision.percent
    if override_percent is not None:
        percent = float(override_percent)
        if not 0 <= percent <= 100:
            raise ValueError('Refund percentage must be between 0 and 100')
    amount = int((Decimal(base) * Decimal(str(percent)) / 100).quantize(Decimal('1'), rounding=ROUND_HALF_UP))
    if override_amount is not None:
        amount = int(override_amount)
        if not 0 <= amount <= base:
            raise ValueError('Refund cannot exceed the eligible amount excluding non-refundable charges')
        percent = round(amount * 100 / base, 2) if base else 0
    if (booking.get('fraud_verified') is True or cancellation_type == 'fraud') and amount > 0:
        raise ValueError('Verified fraudulent bookings cannot be refunded')
    return {
        **asdict(decision), 'refund_percent': percent, 'policy_tier': decision.tier,
        'refund_policy_version': POLICY_VERSION, 'cancellation_type': cancellation_type,
        'refund_amount': amount, 'gross_receipt_amount': paid, 'original_amount': paid,
        'refundable_base_amount': base, 'refund_base_amount': base,
        'non_refundable_amount': max(0, paid - base), 'cancellation_charges': max(0, base - amount),
        'net_taxable_value_credited': amount, 'cgst_refund_amount': 0, 'sgst_refund_amount': 0,
        'igst_refund_amount': 0, 'gst_refund_amount': 0,
        'refund_requested_at': requested, 'check_in_at': check_in,
        'check_in_timezone': zone_name, 'historical_time_requires_review': missing_created or historical_clock,
        'manual_review': decision.manual_review or missing_created or historical_clock,
        'override_applied': override_amount is not None or override_percent is not None,
        'calculation_basis': 'eligible_booking_value_excluding_all_non_refundable_charges',
    }
