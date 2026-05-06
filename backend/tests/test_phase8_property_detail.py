"""Phase 8 — Property detail page + Razorpay mock end-to-end tests."""
import os
import sys
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://propnest-str.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Allow importing razorpay_service for mock_complete_payment helper
sys.path.insert(0, "/app/backend")
from services.razorpay_service import razorpay_service  # noqa: E402

GUEST = {"email": "guest@propnest.com", "password": "guest123"}
HOST = {"email": "host@propnest.com", "password": "host123"}


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
def soft_lock_booking(guest_token, demo_property_id):
    """Create a soft-lock booking on a free future window."""
    headers = {"Authorization": f"Bearer {guest_token}"}
    payload = {
        "property_id": demo_property_id,
        "check_in_date": "2026-12-01",
        "check_out_date": "2026-12-04",
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

    def test_overlap_rejected_409(self, guest_token, demo_property_id, soft_lock_booking):
        headers = {"Authorization": f"Bearer {guest_token}"}
        # Same window again -> conflict
        r = requests.post(
            f"{API}/bookings/",
            json={
                "property_id": demo_property_id,
                "check_in_date": "2026-12-02",
                "check_out_date": "2026-12-05",
                "number_of_guests": 1,
            },
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 409, r.text

    def test_invalid_date_range_400(self, guest_token, demo_property_id):
        headers = {"Authorization": f"Bearer {guest_token}"}
        r = requests.post(
            f"{API}/bookings/",
            json={
                "property_id": demo_property_id,
                "check_in_date": "2026-12-10",
                "check_out_date": "2026-12-10",
                "number_of_guests": 1,
            },
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 400, r.text

    def test_blocked_date_rejected(self, host_token, guest_token, demo_property_id):
        host_h = {"Authorization": f"Bearer {host_token}"}
        # Block 2026-11-15..2026-11-18
        block_payload = {
            "start_date": "2026-11-15",
            "end_date": "2026-11-18",
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
            r = requests.post(
                f"{API}/bookings/",
                json={
                    "property_id": demo_property_id,
                    "check_in_date": "2026-11-16",
                    "check_out_date": "2026-11-18",
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
        # confirm-payment uses query params (function args, no Body wrapper)
        params = {
            "booking_id": booking_id,
            "razorpay_order_id": mp["razorpay_order_id"],
            "razorpay_payment_id": mp["razorpay_payment_id"],
            "razorpay_signature": mp["razorpay_signature"],
        }
        r = requests.post(f"{API}/bookings/confirm-payment", params=params, headers=headers, timeout=20)
        assert r.status_code == 200, r.text

        # verify booking is confirmed
        rb = requests.get(f"{API}/bookings/{booking_id}", headers=headers, timeout=15)
        assert rb.status_code == 200
        assert rb.json()["booking_status"] == "confirmed"

    def test_blocked_dates_includes_booking_source(self, soft_lock_booking, demo_property_id):
        r = requests.get(
            f"{API}/calendar/properties/{demo_property_id}/blocked-dates",
            params={"start_date": "2026-11-01", "end_date": "2026-12-31"},
            timeout=15,
        )
        assert r.status_code == 200
        blocks = r.json().get("blocked_dates", [])
        sources = [b.get("source") for b in blocks]
        assert "booking" in sources, f"expected booking-source block, got sources={sources}"

    def test_ical_export_includes_booking(self, host_token, demo_property_id):
        headers = {"Authorization": f"Bearer {host_token}"}
        r = requests.get(
            f"{API}/calendar/properties/{demo_property_id}/ical-export",
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 200
        text = r.text
        assert "BEGIN:VCALENDAR" in text
        assert "2026-12-01".replace("-", "") in text or "20261201" in text


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
