"""Management timing rules. Times must be aware and check-in property-local."""
from dataclasses import dataclass
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

POLICY_VERSION = "management_refund_20261120"


@dataclass(frozen=True)
class TimingDecision:
    percent: int
    tier: str
    cooling_off_minutes: int = 0
    cooling_off_deadline: datetime | None = None
    cancellation_allowed: bool = True
    manual_review: bool = False


def evaluate_refund_timing(*, booked_at: datetime, check_in_at: datetime,
                           requested_at: datetime, property_timezone: str = "Asia/Kolkata",
                           cancellation_type: str = "guest", non_refundable: bool = False,
                           no_show: bool = False, verified_fraud: bool = False) -> TimingDecision:
    for value in (booked_at, check_in_at, requested_at):
        if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Timezone-aware booking, check-in and request times are required")
    if requested_at < booked_at:
        raise ValueError("Cancellation cannot precede booking")
    if check_in_at <= booked_at:
        raise ValueError("Booking must precede check-in")
    if verified_fraud:
        return TimingDecision(0, "verified_fraud", cancellation_allowed=False, manual_review=True)
    if cancellation_type in {"host", "property_unavailable"}:
        return TimingDecision(100, cancellation_type)
    if cancellation_type == "force_majeure":
        return TimingDecision(0, "force_majeure_review", manual_review=True)
    if cancellation_type == "early_checkout":
        return TimingDecision(0, "early_checkout", manual_review=True)
    if cancellation_type == "no_show":
        return TimingDecision(0, "no_show")
    if cancellation_type == 'fraud':
        return TimingDecision(0, 'verified_fraud', cancellation_allowed=False, manual_review=True)
    if cancellation_type != "guest":
        raise ValueError("Unknown cancellation type")
    if non_refundable:
        return TimingDecision(0, "non_refundable", cancellation_allowed=False, manual_review=True)
    if no_show:
        return TimingDecision(0, "no_show")
    zone = ZoneInfo(property_timezone)
    if requested_at.astimezone(zone).date() >= check_in_at.astimezone(zone).date():
        return TimingDecision(0, "check_in_day_or_later")
    lead = check_in_at - booked_at
    cooling_minutes = 1440 if lead >= timedelta(days=7) else 120 if lead >= timedelta(hours=72) else 30
    deadline = booked_at + timedelta(minutes=cooling_minutes)
    if requested_at <= deadline:
        return TimingDecision(100, "cooling_off", cooling_minutes, deadline)
    remaining = check_in_at - requested_at
    if remaining > timedelta(days=7):
        percent, tier = 100, "more_than_7_days"
    elif remaining > timedelta(hours=72):
        percent, tier = 50, "more_than_72_hours_up_to_7_days"
    else:
        percent, tier = 0, "72_hours_or_less"
    return TimingDecision(percent, tier, cooling_minutes, deadline)
