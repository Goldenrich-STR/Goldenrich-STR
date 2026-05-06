"""Phase 9 — Payment config, mock-pay, and confirm-payment (Pydantic body) tests."""
import os
import sys
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

sys.path.insert(0, "/app/backend")
from services.razorpay_service import razorpay_service  # noqa: E402

GUEST = {"email": "guest@propnest.com", "password": "guest123"}
HOST = {"email": "host@propnest.com", "password": "host123"}

# Phase 9 brief recommends prop_demo_3 (Heritage Haveli) or prop_demo_4 (Tech Park)
PRIMARY_PROPERTY = "prop_demo_3_1778066214"
FALLBACK_PROPERTY = "prop_demo_4_1778066214"


# ---------- fixtures ----------
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


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


def _find_free_window(property_id, start_offset_days=400, length=2, attempts=40):
    """Find a check-in/check-out range with no existing booking/block on the property."""
    today = date.today()
    for i in range(attempts):
        ci = today + timedelta(days=start_offset_days + i * (length + 1))
        co = ci + timedelta(days=length)
        # Probe by trying a HEAD on availability via property/blocked-dates if available.
        # Simplest probe: just attempt booking creation; if 409, increment.
        return ci, co  # caller will retry on 409
    return None, None


def _create_booking(token, property_id, attempts=10):
    """Create a soft-lock booking on a free window. Retries forward on 409."""
    today = date.today()
    base_offset = 400
    for i in range(attempts):
        ci = today + timedelta(days=base_offset + i * 5)
        co = ci + timedelta(days=2)
        payload = {
            "property_id": property_id,
            "check_in_date": ci.isoformat(),
            "check_out_date": co.isoformat(),
            "number_of_guests": 2,
        }
        r = requests.post(f"{API}/bookings/", json=payload, headers=_auth(token), timeout=15)
        if r.status_code == 200:
            return r.json()
        if r.status_code == 409:
            continue
        pytest.fail(f"Unexpected booking creation error {r.status_code}: {r.text}")
    pytest.fail("Could not find free window for booking after retries")


# ---------- payment/config ----------
class TestPaymentConfig:
    def test_payment_config_public_no_auth(self):
        r = requests.get(f"{API}/bookings/payment/config", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["provider"] == "razorpay"
        assert "key_id" in data and isinstance(data["key_id"], str)
        assert "is_mock" in data and isinstance(data["is_mock"], bool)
        assert data["currency"] == "INR"

    def test_payment_config_is_mock_in_demo(self):
        r = requests.get(f"{API}/bookings/payment/config", timeout=15)
        assert r.status_code == 200
        # In this env demo keys are configured -> is_mock True
        assert r.json()["is_mock"] is True


# ---------- mock-pay ----------
class TestMockPay:
    def test_mock_pay_unknown_booking_returns_404(self, guest_token):
        r = requests.post(
            f"{API}/bookings/does_not_exist/mock-pay",
            headers=_auth(guest_token),
            timeout=15,
        )
        assert r.status_code == 404, r.text

    def test_mock_pay_success_and_idempotent(self, guest_token):
        booking = _create_booking(guest_token, PRIMARY_PROPERTY)
        bid = booking["booking_id"]
        # First mock-pay
        r = requests.post(f"{API}/bookings/{bid}/mock-pay", headers=_auth(guest_token), timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["mock"] is True
        assert body["booking_id"] == bid
        assert body["razorpay_payment_id"].startswith("pay_mock_")
        assert body["razorpay_order_id"] == booking["razorpay_order_id"]
        assert isinstance(body["razorpay_signature"], str) and len(body["razorpay_signature"]) == 64

        # Verify booking flipped to confirmed in DB via GET
        g = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        assert g.status_code == 200
        gb = g.json()
        assert gb["booking_status"] == "confirmed"
        assert gb["payment_status"] == "paid"
        assert gb["razorpay_payment_id"].startswith("pay_mock_")

        # Verify blocked_dates entry created (booking-source) via host calendar endpoint if accessible
        # We'll use the public property availability indirectly: a re-attempt on same window must 409.
        retry = requests.post(
            f"{API}/bookings/",
            json={
                "property_id": gb["property_id"],
                "check_in_date": gb["check_in_date"],
                "check_out_date": gb["check_out_date"],
                "number_of_guests": 1,
            },
            headers=_auth(guest_token),
            timeout=15,
        )
        assert retry.status_code == 409, retry.text

        # Idempotent second call: already confirmed -> 200 with "already confirmed"
        r2 = requests.post(f"{API}/bookings/{bid}/mock-pay", headers=_auth(guest_token), timeout=15)
        assert r2.status_code == 200
        assert "already" in r2.json()["message"].lower()

    def test_mock_pay_non_owner_guest_403(self, guest_token, host_token):
        booking = _create_booking(guest_token, FALLBACK_PROPERTY)
        bid = booking["booking_id"]
        # host token is a different user, should be 403
        r = requests.post(f"{API}/bookings/{bid}/mock-pay", headers=_auth(host_token), timeout=15)
        assert r.status_code == 403, r.text


# ---------- confirm-payment (Pydantic body) ----------
class TestConfirmPayment:
    def test_confirm_payment_valid_signature(self, guest_token):
        booking = _create_booking(guest_token, PRIMARY_PROPERTY)
        bid = booking["booking_id"]
        order_id = booking["razorpay_order_id"]
        mock = razorpay_service.mock_complete_payment(order_id)
        payload = {
            "booking_id": bid,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": mock["razorpay_payment_id"],
            "razorpay_signature": mock["razorpay_signature"],
        }
        r = requests.post(
            f"{API}/bookings/confirm-payment",
            json=payload,
            headers=_auth(guest_token),
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["booking_id"] == bid

        # Verify persistence
        g = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        assert g.json()["booking_status"] == "confirmed"

    def test_confirm_payment_invalid_signature_400(self, guest_token):
        booking = _create_booking(guest_token, FALLBACK_PROPERTY)
        bid = booking["booking_id"]
        order_id = booking["razorpay_order_id"]
        payload = {
            "booking_id": bid,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_mock_invalid_xxx",
            "razorpay_signature": "deadbeef" * 8,
        }
        r = requests.post(
            f"{API}/bookings/confirm-payment",
            json=payload,
            headers=_auth(guest_token),
            timeout=15,
        )
        assert r.status_code == 400, r.text
        assert "signature" in r.json()["detail"].lower()

    def test_confirm_payment_unknown_booking_404(self, guest_token):
        payload = {
            "booking_id": "BK_unknown_xxx",
            "razorpay_order_id": "order_mock_xxx",
            "razorpay_payment_id": "pay_mock_xxx",
            "razorpay_signature": "x" * 64,
        }
        r = requests.post(
            f"{API}/bookings/confirm-payment",
            json=payload,
            headers=_auth(guest_token),
            timeout=15,
        )
        assert r.status_code == 404, r.text

    def test_confirm_payment_non_owner_403(self, guest_token, host_token):
        booking = _create_booking(guest_token, PRIMARY_PROPERTY)
        bid = booking["booking_id"]
        order_id = booking["razorpay_order_id"]
        mock = razorpay_service.mock_complete_payment(order_id)
        payload = {
            "booking_id": bid,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": mock["razorpay_payment_id"],
            "razorpay_signature": mock["razorpay_signature"],
        }
        r = requests.post(
            f"{API}/bookings/confirm-payment",
            json=payload,
            headers=_auth(host_token),
            timeout=15,
        )
        assert r.status_code == 403, r.text

    def test_confirm_payment_query_param_legacy_rejected(self, guest_token):
        """The endpoint now requires Pydantic body; query-string callers must get 422."""
        params = {
            "booking_id": "BK_x",
            "razorpay_order_id": "o",
            "razorpay_payment_id": "p",
            "razorpay_signature": "s",
        }
        r = requests.post(
            f"{API}/bookings/confirm-payment",
            params=params,
            headers=_auth(guest_token),
            timeout=15,
        )
        assert r.status_code == 422, r.text


# ---------- regression smoke ----------
class TestPhase8Regression:
    def test_property_detail_still_works(self):
        r = requests.get(f"{API}/properties/{PRIMARY_PROPERTY}", timeout=15)
        assert r.status_code == 200
        assert r.json()["property_id"] == PRIMARY_PROPERTY

    def test_search_still_works(self):
        r = requests.get(f"{API}/properties/search", params={"limit": 5}, timeout=15)
        assert r.status_code == 200
        assert "properties" in r.json()
