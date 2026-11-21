from datetime import datetime, timedelta, timezone
import pytest
from services.refund_policy_timing import evaluate_refund_timing

UTC = timezone.utc


def decision(lead_hours, after_minutes, **kwargs):
    booked = datetime(2026, 10, 1, 4, 30, tzinfo=UTC)  # 10:00 IST
    return evaluate_refund_timing(booked_at=booked, check_in_at=booked + timedelta(hours=lead_hours),
                                  requested_at=booked + timedelta(minutes=after_minutes), **kwargs)


def test_document_tomorrow_example_15_minutes_full_60_minutes_zero():
    assert decision(24, 15).percent == 100
    assert decision(24, 15).cooling_off_minutes == 30
    assert decision(24, 60).percent == 0


@pytest.mark.parametrize('lead,minutes', [(168, 1440), (169, 1440), (167, 120), (72, 120), (71, 30), (24, 30)])
def test_lead_based_cooling_off(lead, minutes):
    result = decision(lead, 1)
    assert result.cooling_off_minutes == minutes
    assert result.percent == 100


@pytest.mark.parametrize('remaining,expected', [(169, 100), (168, 50), (167, 50), (73, 50), (72, 0), (71, 0)])
def test_final_matrix_exact_boundaries_after_cooling_off(remaining, expected):
    result = decision(remaining + 48, 48 * 60)
    assert result.percent == expected
    assert result.tier != 'cooling_off'


def test_cooling_deadline_inclusive_then_expires():
    assert decision(24, 30).percent == 100
    assert decision(24, 30.01).percent == 0


@pytest.mark.parametrize('option,tier', [('non_refundable', 'non_refundable'), ('no_show', 'no_show'), ('verified_fraud', 'verified_fraud')])
def test_no_automatic_refund_for_excluded_cases(option, tier):
    result = decision(200, 1, **{option: True})
    assert result.percent == 0
    assert result.tier == tier


def test_no_cooling_off_on_check_in_day_even_before_check_in_time():
    assert decision(2, 1).percent == 0


def test_property_local_date_not_utc_controls_check_in_day():
    booked = datetime(2026, 10, 1, 18, 31, tzinfo=UTC)  # Oct 2 00:01 IST
    result = evaluate_refund_timing(booked_at=booked, check_in_at=datetime(2026, 10, 2, 6, 30, tzinfo=UTC),
                                    requested_at=booked + timedelta(minutes=5))
    assert result.percent == 0


@pytest.mark.parametrize('kind', ['host', 'property_unavailable'])
def test_host_or_unavailable_full_eligibility_is_independent_of_guest_timeline(kind):
    assert decision(24, 60, cancellation_type=kind).percent == 100


@pytest.mark.parametrize('kind', ['early_checkout', 'force_majeure'])
def test_exception_requests_require_review(kind):
    result = decision(24, 60, cancellation_type=kind)
    assert result.manual_review
    assert result.percent == 0


def test_unknown_source_is_rejected():
    with pytest.raises(ValueError):
        decision(200, 1, cancellation_type='made_up')


def test_naive_dates_cannot_be_mistaken_for_utc():
    with pytest.raises(ValueError):
        evaluate_refund_timing(booked_at=datetime(2026, 10, 1), check_in_at=datetime(2026, 10, 3), requested_at=datetime(2026, 10, 1, 1))


def test_request_cannot_predate_booking():
    with pytest.raises(ValueError):
        decision(200, -1)
