"""Validate booking_id uniqueness fix (uuid4-based) and deterministic find_one."""
import os
import re
from datetime import date, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

GUEST = {"email": "guest@propnest.com", "password": "guest123"}

CANDIDATE_PROPERTIES = [
    "prop_demo_3_1778066214",
    "prop_demo_4_1778066214",
    "prop_demo_5_1778066214",
    "prop_demo_6_1778066214",
    "prop_demo_7_1778066214",
    "prop_demo_8_1778066214",
]

BK_PATTERN = re.compile(r"^BK[0-9A-F]{14}$")


@pytest.fixture(scope="module")
def guest_token():
    r = requests.post(f"{API}/auth/login", json=GUEST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


def _find_free_window(token, prop_id, start_offset, attempts=30):
    today = date.today()
    for i in range(attempts):
        ci = today + timedelta(days=start_offset + i * 4)
        co = ci + timedelta(days=2)
        payload = {
            "property_id": prop_id,
            "check_in_date": ci.isoformat(),
            "check_out_date": co.isoformat(),
            "number_of_guests": 2,
        }
        r = requests.post(f"{API}/bookings/", json=payload, headers=_auth(token), timeout=15)
        if r.status_code == 200:
            return r.json(), ci.isoformat(), co.isoformat()
        if r.status_code in (409, 400):
            continue
        pytest.fail(f"Unexpected error {r.status_code}: {r.text}")
    return None, None, None


# ---------- Rapid-fire uniqueness ----------
class TestBookingIdUniqueness:
    def test_rapid_fire_5_bookings_unique_ids(self, guest_token):
        """Create 5 rapid bookings on different dates within <1s; all booking_ids must
        be distinct, match BK[A-F0-9]{14}, with no collisions."""
        bookings = []
        # Use one property with 5 different non-overlapping windows in 2027
        prop_id = CANDIDATE_PROPERTIES[0]
        # Find 5 free windows back-to-back, starting deep in 2027
        today = date.today()
        offset = 700
        created = 0
        i = 0
        max_iter = 60
        while created < 5 and i < max_iter:
            ci = today + timedelta(days=offset + i * 4)
            co = ci + timedelta(days=2)
            payload = {
                "property_id": prop_id,
                "check_in_date": ci.isoformat(),
                "check_out_date": co.isoformat(),
                "number_of_guests": 2,
            }
            r = requests.post(f"{API}/bookings/", json=payload, headers=_auth(guest_token), timeout=15)
            if r.status_code == 200:
                bookings.append(r.json())
                created += 1
            i += 1

        assert len(bookings) == 5, f"Could not create 5 bookings, got {len(bookings)}"
        ids = [b["booking_id"] for b in bookings]

        # All distinct
        assert len(set(ids)) == 5, f"Collision detected: {ids}"

        # All match BK + 14 hex uppercase
        for bid in ids:
            assert BK_PATTERN.match(bid), f"booking_id format wrong: {bid}"

        # Cleanup
        for b in bookings:
            requests.post(
                f"{API}/bookings/{b['booking_id']}/cancel",
                headers=_auth(guest_token),
                timeout=15,
            )

    def test_get_booking_returns_exact_doc(self, guest_token):
        """After POST, GET /bookings/{id} returns the same doc — proves find_one is
        deterministic (uniqueness)."""
        booking, ci, co = _find_free_window(guest_token, CANDIDATE_PROPERTIES[1], 800)
        assert booking is not None, "Could not create booking"
        bid = booking["booking_id"]

        g = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        assert g.status_code == 200, g.text
        body = g.json()
        assert body["booking_id"] == bid
        assert body["check_in_date"] == ci
        assert body["check_out_date"] == co
        assert body["booking_status"] == "soft_lock"
        # Cleanup
        requests.post(f"{API}/bookings/{bid}/cancel", headers=_auth(guest_token), timeout=15)

    def test_cancel_updates_same_booking(self, guest_token):
        """Cancel mutates the EXACT booking we created (deterministic find_one)."""
        booking, ci, co = _find_free_window(guest_token, CANDIDATE_PROPERTIES[2], 900)
        assert booking is not None
        bid = booking["booking_id"]

        c = requests.post(f"{API}/bookings/{bid}/cancel", headers=_auth(guest_token), timeout=15)
        assert c.status_code == 200, c.text
        assert c.json()["booking_id"] == bid

        # Verify the SAME booking is now cancelled
        g = requests.get(f"{API}/bookings/{bid}", headers=_auth(guest_token), timeout=15)
        assert g.status_code == 200
        body = g.json()
        assert body["booking_id"] == bid
        assert body["booking_status"] == "cancelled"
        assert body["check_in_date"] == ci
        assert body["check_out_date"] == co
