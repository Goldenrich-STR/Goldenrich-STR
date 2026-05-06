"""Phase 10 — Guest My Bookings + cancel endpoint tests."""
import os
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

GUEST = {"email": "guest@propnest.com", "password": "guest123"}
HOST = {"email": "host@propnest.com", "password": "host123"}

# Properties known to exist in the seeded data from prior phases
CANDIDATE_PROPERTIES = [
    "prop_demo_3_1778066214",
    "prop_demo_4_1778066214",
    "prop_demo_5_1778066214",
    "prop_demo_6_1778066214",
    "prop_demo_7_1778066214",
    "prop_demo_8_1778066214",
]


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


def _create_future_booking(token, attempts=30):
    """Create a fresh soft-lock booking in 2027 window. Try multiple windows/properties."""
    # Sleep briefly to ensure unique BK{timestamp_sec} booking_id when called back-to-back
    import time as _t
    _t.sleep(1.05)
    # 2027 is ~year+ out from 2026-05-06 container date, we offset heavily
    today = date.today()
    base_offset = 500  # well into 2027
    for property_id in CANDIDATE_PROPERTIES:
        for i in range(attempts):
            ci = today + timedelta(days=base_offset + i * 4)
            co = ci + timedelta(days=2)
            payload = {
                "property_id": property_id,
                "check_in_date": ci.isoformat(),
                "check_out_date": co.isoformat(),
                "number_of_guests": 2,
            }
            r = requests.post(f"{API}/bookings/", json=payload, headers=_auth(token), timeout=15)
            if r.status_code == 200:
                out = r.json()
                out["_property_id"] = property_id
                out["_check_in"] = ci.isoformat()
                out["_check_out"] = co.isoformat()
                return out
            if r.status_code in (409, 400):
                continue
            pytest.fail(f"Unexpected booking creation error {r.status_code}: {r.text}")
    pytest.fail("Could not create a fresh booking on any candidate property")


# ---------- GET /guest/my-bookings ----------
class TestGuestMyBookings:
    def test_requires_auth(self):
        r = requests.get(f"{API}/bookings/guest/my-bookings", timeout=15)
        assert r.status_code in (401, 403), r.text

    def test_returns_bookings_with_property_embedded(self, guest_token):
        r = requests.get(
            f"{API}/bookings/guest/my-bookings", headers=_auth(guest_token), timeout=15
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert "bookings" in body and "total" in body
        assert isinstance(body["bookings"], list)
        assert body["total"] == len(body["bookings"])
        # Phase 9 created confirmed bookings for guest – expect >= 1
        assert body["total"] >= 1, "Expected at least one existing booking from prior phases"

        for b in body["bookings"]:
            assert "_id" not in b
            assert "booking_id" in b
            assert "property_id" in b
            assert "property" in b, "property info must be embedded"
            # property may be None only if property was deleted; assert structure when present
            if b["property"] is not None:
                p = b["property"]
                assert "_id" not in p
                assert "property_id" in p
                assert "title" in p
                assert "city" in p
                # Non-critical fields
                for k in ("state", "images", "property_type", "category"):
                    assert k in p, f"missing property.{k}"

    def test_sorted_by_check_in_desc(self, guest_token):
        r = requests.get(
            f"{API}/bookings/guest/my-bookings", headers=_auth(guest_token), timeout=15
        )
        assert r.status_code == 200
        dates = [b["check_in_date"] for b in r.json()["bookings"]]
        assert dates == sorted(dates, reverse=True), f"not sorted desc: {dates[:5]}"


# ---------- GET /host/my-bookings ----------
class TestHostMyBookings:
    def test_host_bookings_embed_property(self, host_token):
        r = requests.get(
            f"{API}/bookings/host/my-bookings", headers=_auth(host_token), timeout=15
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert isinstance(body["bookings"], list)
        # If host has no bookings, fine; if has, validate structure
        for b in body["bookings"]:
            assert "_id" not in b
            assert "property" in b


# ---------- POST /{id}/cancel ----------
class TestCancelBooking:
    def test_cancel_unknown_booking_404(self, guest_token):
        r = requests.post(
            f"{API}/bookings/does_not_exist_xyz/cancel",
            headers=_auth(guest_token),
            timeout=15,
        )
        assert r.status_code == 404, r.text

    def test_cancel_requires_auth(self):
        r = requests.post(f"{API}/bookings/anything/cancel", timeout=15)
        assert r.status_code in (401, 403)

    def test_cancel_non_owner_is_403(self, guest_token, host_token):
        booking = _create_future_booking(guest_token)
        bid = booking["booking_id"]
        # host is not the guest → 403
        r = requests.post(
            f"{API}/bookings/{bid}/cancel", headers=_auth(host_token), timeout=15
        )
        assert r.status_code == 403, r.text
        # Cleanup: guest cancels own
        requests.post(f"{API}/bookings/{bid}/cancel", headers=_auth(guest_token), timeout=15)

    def test_cancel_soft_lock_success_and_idempotent(self, guest_token):
        booking = _create_future_booking(guest_token)
        bid = booking["booking_id"]
        # Sanity: brand-new booking must be in soft_lock
        pre = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        print(f"\n[debug] pre-cancel status={pre.json().get('booking_status')} bid={bid}")

        r = requests.post(
            f"{API}/bookings/{bid}/cancel", headers=_auth(guest_token), timeout=15
        )
        print(f"[debug] cancel resp={r.status_code} {r.text[:200]}")
        assert r.status_code == 200, r.text
        assert r.json()["message"] == "Booking cancelled"
        assert r.json()["booking_id"] == bid

        # Verify booking_status persisted
        g = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        assert g.status_code == 200
        assert g.json()["booking_status"] == "cancelled"

        # Idempotent second call
        r2 = requests.post(
            f"{API}/bookings/{bid}/cancel", headers=_auth(guest_token), timeout=15
        )
        assert r2.status_code == 200
        assert "already cancelled" in r2.json()["message"].lower()

    def test_cancel_confirmed_removes_booking_blocked_date(self, guest_token):
        # Create fresh booking
        booking = _create_future_booking(guest_token)
        bid = booking["booking_id"]
        prop_id = booking["_property_id"]
        ci = booking["_check_in"]
        co = booking["_check_out"]

        # Mock-pay to turn into confirmed (creates booking-sourced blocked date)
        mp = requests.post(
            f"{API}/bookings/{bid}/mock-pay", headers=_auth(guest_token), timeout=15
        )
        assert mp.status_code == 200, mp.text

        # Verify a blocked-date entry exists for this booking via the host calendar endpoint
        bd_before = requests.get(
            f"{API}/calendar/properties/{prop_id}/blocked-dates",
            headers=_auth(guest_token),
            timeout=15,
        )
        # Endpoint may require host auth; tolerate either 200/403
        found_before = False
        if bd_before.status_code == 200:
            entries = bd_before.json()
            if isinstance(entries, dict):
                entries = entries.get("blocked_dates", entries.get("items", []))
            found_before = any(
                (e.get("source") == "booking" and e.get("source_id") == bid)
                for e in (entries or [])
            )

        # Cancel
        c = requests.post(
            f"{API}/bookings/{bid}/cancel", headers=_auth(guest_token), timeout=15
        )
        assert c.status_code == 200, c.text

        # Verify booking status
        g = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        assert g.json()["booking_status"] == "cancelled"

        # Verify blocked-date removed (if we could see it before, it must be gone now)
        bd_after = requests.get(
            f"{API}/calendar/properties/{prop_id}/blocked-dates",
            headers=_auth(guest_token),
            timeout=15,
        )
        if bd_after.status_code == 200 and found_before:
            entries = bd_after.json()
            if isinstance(entries, dict):
                entries = entries.get("blocked_dates", entries.get("items", []))
            found_after = any(
                (e.get("source") == "booking" and e.get("source_id") == bid)
                for e in (entries or [])
            )
            assert not found_after, "booking blocked-date should be removed after cancel"

        # Bonus: same window should now be re-bookable (free dates)
        retry = requests.post(
            f"{API}/bookings/",
            json={
                "property_id": prop_id,
                "check_in_date": ci,
                "check_out_date": co,
                "number_of_guests": 2,
            },
            headers=_auth(guest_token),
            timeout=15,
        )
        assert retry.status_code == 200, f"expected dates freed after cancel, got {retry.status_code}: {retry.text}"
        # Clean up the re-created booking
        new_bid = retry.json()["booking_id"]
        requests.post(f"{API}/bookings/{new_bid}/cancel", headers=_auth(guest_token), timeout=15)
