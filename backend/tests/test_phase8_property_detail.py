"""Phase 8 — Property detail page + Razorpay mock end-to-end tests."""
import os
import sys
import uuid
from datetime import date, timedelta

import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://propnest-str.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Allow importing razorpay_service for mock_complete_payment helper
sys.path.insert(0, "/app/backend")
from services.razorpay_service import razorpay_service  # noqa: E402

GUEST = {"email": "guest@propnest.com", "password": "guest123"}
HOST = {"email": "host@propnest.com", "password": "host123"}


def _free_future_window(property_id: str, nights: int = 3, max_tries: int = 30):
    """Find a `nights`-long window starting at least 1 year out that does NOT
    overlap any existing blocked dates. Walks forward in 7-day jumps so the
    suite is repeatable across runs even after dozens of prior bookings."""
    r = requests.get(f"{API}/calendar/properties/{property_id}/blocked-dates", timeout=15)
    blocked_ranges = []
    if r.status_code == 200:
        for b in (r.json().get("blocked_dates") or []):
            try:
                blocked_ranges.append(
                    (date.fromisoformat(b["start_date"]), date.fromisoformat(b["end_date"]))
                )
            except Exception:
                pass

    def _conflicts(start: date, end: date) -> bool:
        for s, e in blocked_ranges:
            if not (end <= s or start >= e):
                return True
        return False

    # Start ~13 months ahead with a per-process random offset so parallel/runs
    # rarely collide; then walk weekly until a free window is found.
    offset_days = 400 + (uuid.uuid4().int % 90)  # 400-490 days out
    start = date.today() + timedelta(days=offset_days)
    for _ in range(max_tries):
        end = start + timedelta(days=nights)
        if not _conflicts(start, end):
            return start.isoformat(), end.isoformat()
        start += timedelta(days=nights + 4)  # leave a small gap so blocks don't chain
    raise RuntimeError(f"Could not locate a free {nights}-night window for {property_id}")


# ----------------- fixtures -----------------
@pytest.fixture(scope="module")
def guest_token():
    r = requests.post(f"{API}/auth/login", json=GUEST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def host_token():
    r = requests.post(f"{API}/auth/login", json=HOST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def demo_property_id():
    r = requests.get(f"{API}/properties/search", params={"limit": 5}, timeout=15)
    assert r.status_code == 200
    props = r.json()["properties"]
    assert len(props) >= 1, "Need at least one demo property seeded"
    return props[0]["property_id"]


@pytest.fixture(scope="module")
def free_window(demo_property_id):
    """A 3-night window guaranteed to be free at fixture-setup time."""
    return _free_future_window(demo_property_id, nights=3)


# ----------------- Property detail w/ host -----------------
class TestPropertyDetail:
    def test_get_property_returns_safe_host(self, demo_property_id):
        r = requests.get(f"{API}/properties/{demo_property_id}", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["property_id"] == demo_property_id
        assert "host" in data and data["host"], "host field must be present"
        host = data["host"]
        # safe public fields present
        assert "full_name" in host
        assert "kyc_status" in host
        assert "role" in host
        # sensitive fields NOT present
        assert "email" not in host
        assert "phone" not in host
        assert "password" not in host
        assert "password_hash" not in host

    def test_unknown_property_returns_404(self):
        r = requests.get(f"{API}/properties/prop_does_not_exist_xxx", timeout=15)
        assert r.status_code == 404


# ----------------- Razorpay mock service -----------------
class TestRazorpayMockService:
    def test_is_mock_mode_active(self):
        assert razorpay_service.is_mock is True

    def test_create_order_returns_mock_id(self):
        res = razorpay_service.create_order(amount=10000, receipt="test_receipt")
        assert res["success"]
        assert res["order"]["id"].startswith("order_mock_")

    def test_mock_complete_payment_signature_verifies(self):
        res = razorpay_service.create_order(amount=10000)
        order_id = res["order"]["id"]
        mp = razorpay_service.mock_complete_payment(order_id)
        assert mp["success"]
        ok = razorpay_service.verify_payment_signature(
            mp["razorpay_order_id"], mp["razorpay_payment_id"], mp["razorpay_signature"]
        )
        assert ok is True

    def test_invalid_signature_rejected(self):
        ok = razorpay_service.verify_payment_signature("order_mock_x", "pay_x", "deadbeef")
        assert ok is False


# ----------------- Booking soft-lock + payment flow -----------------
@pytest.fixture(scope="module")
def soft_lock_booking(guest_token, demo_property_id, free_window):
    """Create a soft-lock booking on a verified-free future window."""
    ci, co = free_window
    headers = {"Authorization": f"Bearer {guest_token}"}
    payload = {
        "property_id": demo_property_id,
        "check_in_date": ci,
        "check_out_date": co,
        "number_of_guests": 2,
    }
    r = requests.post(f"{API}/bookings/", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["razorpay_order_id"].startswith("order_mock_"), body
    return body


class TestBookingFlow:
    def test_booking_returns_mock_order(self, soft_lock_booking):
        assert soft_lock_booking["razorpay_order_id"].startswith("order_mock_")
        assert soft_lock_booking["amount"] > 0

    def test_overlap_rejected_409(self, guest_token, demo_property_id, soft_lock_booking, free_window):
        headers = {"Authorization": f"Bearer {guest_token}"}
        # Overlap into the soft-lock window — bump check-in by 1 day
        ci_d = date.fromisoformat(free_window[0]) + timedelta(days=1)
        co_d = ci_d + timedelta(days=3)
        r = requests.post(
            f"{API}/bookings/",
            json={
                "property_id": demo_property_id,
                "check_in_date": ci_d.isoformat(),
                "check_out_date": co_d.isoformat(),
                "number_of_guests": 1,
            },
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 409, r.text

    def test_invalid_date_range_400(self, guest_token, demo_property_id, free_window):
        headers = {"Authorization": f"Bearer {guest_token}"}
        same = free_window[0]
        r = requests.post(
            f"{API}/bookings/",
            json={
                "property_id": demo_property_id,
                "check_in_date": same,
                "check_out_date": same,
                "number_of_guests": 1,
            },
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_blocked_date_rejected(self, host_token, guest_token, demo_property_id):
        host_h = {"Authorization": f"Bearer {host_token}"}
        # Build a fresh, isolated 3-day block window in the future
        block_start = date.today() + timedelta(days=550 + (uuid.uuid4().int % 60))
        block_end = block_start + timedelta(days=3)
        block_payload = {
            "start_date": block_start.isoformat(),
            "end_date": block_end.isoformat(),
            "reason": "phase8 test",
        }
        rb = requests.post(
            f"{API}/calendar/properties/{demo_property_id}/block-dates",
            json=block_payload,
            headers=host_h,
            timeout=15,
        )
        assert rb.status_code in (200, 201), rb.text
        blocked_id = rb.json().get("blocked_date_id") or rb.json().get("id")

        try:
            guest_h = {"Authorization": f"Bearer {guest_token}"}
            # Try to book inside the blocked window
            ci_in_block = (block_start + timedelta(days=1)).isoformat()
            co_in_block = block_end.isoformat()
            r = requests.post(
                f"{API}/bookings/",
                json={
                    "property_id": demo_property_id,
                    "check_in_date": ci_in_block,
                    "check_out_date": co_in_block,
                    "number_of_guests": 1,
                },
                headers=guest_h,
                timeout=15,
            )
            assert r.status_code == 409, r.text
        finally:
            if blocked_id:
                requests.delete(
                    f"{API}/calendar/blocked-dates/{blocked_id}", headers=host_h, timeout=10
                )

    def test_confirm_payment_with_mock_signature(self, guest_token, soft_lock_booking, demo_property_id):
        headers = {"Authorization": f"Bearer {guest_token}"}
        order_id = soft_lock_booking["razorpay_order_id"]
        booking_id = soft_lock_booking["booking_id"]
        mp = razorpay_service.mock_complete_payment(order_id)
        # confirm-payment expects a JSON body — see ConfirmPaymentRequest in routes
        body = {
            "booking_id": booking_id,
            "razorpay_order_id": mp["razorpay_order_id"],
            "razorpay_payment_id": mp["razorpay_payment_id"],
            "razorpay_signature": mp["razorpay_signature"],
        }
        r = requests.post(f"{API}/bookings/confirm-payment", json=body, headers=headers, timeout=20)
        assert r.status_code == 200, r.text

        # verify booking is confirmed
        rb = requests.get(f"{API}/bookings/{booking_id}", headers=headers, timeout=15)
        assert rb.status_code == 200
        assert rb.json()["booking_status"] == "confirmed"

    def test_blocked_dates_includes_booking_source(self, soft_lock_booking, free_window, demo_property_id):
        ci, co = free_window
        # widen the search window by ±30 days so the booking-source block falls inside
        start = (date.fromisoformat(ci) - timedelta(days=30)).isoformat()
        end = (date.fromisoformat(co) + timedelta(days=30)).isoformat()
        r = requests.get(
            f"{API}/calendar/properties/{demo_property_id}/blocked-dates",
            params={"start_date": start, "end_date": end},
            timeout=15,
        )
        assert r.status_code == 200
        blocks = r.json().get("blocked_dates", [])
        sources = [b.get("source") for b in blocks]
        assert "booking" in sources, f"expected booking-source block, got sources={sources}"

    def test_ical_export_includes_booking(self, host_token, demo_property_id, free_window):
        headers = {"Authorization": f"Bearer {host_token}"}
        r = requests.get(
            f"{API}/calendar/properties/{demo_property_id}/ical-export",
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 200
        text = r.text
        assert "BEGIN:VCALENDAR" in text
        check_in_compact = free_window[0].replace("-", "")
        assert check_in_compact in text, f"expected {check_in_compact} in iCal export"


# ----------------- Phase 7 regression smoke -----------------
class TestRegression:
    def test_search_still_works(self):
        r = requests.get(f"{API}/properties/search", params={"limit": 10}, timeout=15)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    @pytest.mark.parametrize("creds", [
        {"email": "guest@propnest.com", "password": "guest123"},
        {"email": "host@propnest.com", "password": "host123"},
        {"email": "admin@propnest.com", "password": "admin123"},
        {"email": "broker@propnest.com", "password": "broker123"},
        {"email": "employee@propnest.com", "password": "employee123"},
    ])
    def test_login_all_roles(self, creds):
        r = requests.post(f"{API}/auth/login", json=creds, timeout=15)
        assert r.status_code == 200, f"{creds['email']} -> {r.text}"
