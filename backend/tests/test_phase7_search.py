"""Phase 7 Guest Search & Discovery — backend pytest suite."""
import os
import pytest
import requests
from datetime import datetime, timedelta

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://propnest-str.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def host_token(session):
    r = session.post(f"{API}/auth/login", json={"email": "host@propnest.com", "password": "host123"})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _search(session, **params):
    r = session.get(f"{API}/properties/search", params=params)
    assert r.status_code == 200, r.text
    return r.json()


# ---------------- Demo seed sanity ----------------
class TestSeed:
    def test_eight_demo_live_properties(self, session):
        data = _search(session, limit=100)
        titles = [p["title"] for p in data["properties"]]
        demo_titles = {
            "Sea Breeze Villa, Anjuna",
            "Skyline Studio, Bandra",
            "Heritage Haveli, Old Jaipur",
            "Tech Park Co-Working Suite",
            "Lakeview Banquet Hall, Hussain Sagar",
            "Hill Cottage, Manali",
            "Powai Lakeview Apartment",
            "Rooftop Lounge, Connaught Place",
        }
        present = demo_titles.intersection(titles)
        assert len(present) == 8, f"Missing demo properties. Got: {present}"
        # All returned properties should be LIVE
        for p in data["properties"]:
            assert p["status"] == "live"


# ---------------- Filter tests ----------------
class TestFilters:
    def test_category_event_venue(self, session):
        data = _search(session, category="event_venue")
        titles = {p["title"] for p in data["properties"]}
        assert "Rooftop Lounge, Connaught Place" in titles
        assert "Lakeview Banquet Hall, Hussain Sagar" in titles
        assert len(data["properties"]) == 2

    def test_property_type_villa(self, session):
        data = _search(session, property_type="villa")
        assert len(data["properties"]) == 1
        assert data["properties"][0]["title"] == "Sea Breeze Villa, Anjuna"

    def test_city_mumbai_regex(self, session):
        data = _search(session, city="Mumbai")
        assert len(data["properties"]) == 2
        for p in data["properties"]:
            assert p["city"].lower() == "mumbai"

    def test_min_price_10000(self, session):
        data = _search(session, min_price=10000)
        assert len(data["properties"]) == 3
        for p in data["properties"]:
            assert p["price_per_night"] >= 10000

    def test_max_price_5000(self, session):
        # Expect 4500 (Tech Park), 4800 (Hill Cottage), 3200 (Skyline) — Powai 5500 excluded
        data = _search(session, max_price=5000)
        prices = sorted(p["price_per_night"] for p in data["properties"])
        assert prices == [3200, 4500, 4800]
        assert len(data["properties"]) == 3

    def test_amenities_wifi_ac(self, session):
        data = _search(session, amenities="wifi,ac")
        for p in data["properties"]:
            assert "wifi" in p["amenities"] and "ac" in p["amenities"]
        assert len(data["properties"]) >= 1

    def test_instant_booking_true(self, session):
        data = _search(session, instant_booking="true")
        for p in data["properties"]:
            assert p["instant_booking"] is True

    def test_pet_friendly_true(self, session):
        data = _search(session, pet_friendly="true")
        titles = {p["title"] for p in data["properties"]}
        assert "Sea Breeze Villa, Anjuna" in titles
        assert "Hill Cottage, Manali" in titles
        assert len(data["properties"]) == 2

    def test_bbox_mumbai(self, session):
        data = _search(session, bbox="18.5,72.5,19.5,73.5")
        for p in data["properties"]:
            assert p["city"].lower() == "mumbai"
        assert len(data["properties"]) == 2


# ---------------- Sort tests ----------------
class TestSort:
    def test_sort_price_asc(self, session):
        data = _search(session, sort="price_asc", limit=100)
        prices = [p["price_per_night"] for p in data["properties"]]
        assert prices == sorted(prices)

    def test_sort_price_desc(self, session):
        data = _search(session, sort="price_desc", limit=100)
        prices = [p["price_per_night"] for p in data["properties"]]
        assert prices == sorted(prices, reverse=True)

    def test_sort_newest(self, session):
        data = _search(session, sort="newest", limit=100)
        dates = [p["created_at"] for p in data["properties"]]
        assert dates == sorted(dates, reverse=True)

    def test_sort_recommended(self, session):
        data = _search(session, sort="recommended", limit=100)
        ib_flags = [p["instant_booking"] for p in data["properties"]]
        # All True items should appear before False items
        seen_false = False
        ok = True
        for f in ib_flags:
            if not f:
                seen_false = True
            elif seen_false and f:
                ok = False
                break
        assert ok


# ---------------- Date availability ----------------
class TestAvailability:
    def test_dates_no_overlap_returns_full_set(self, session):
        data = _search(session, check_in="2026-09-01", check_out="2026-09-05", limit=100)
        # All 8 demo props should be present (none have overlapping bookings)
        titles = {p["title"] for p in data["properties"]}
        assert "Sea Breeze Villa, Anjuna" in titles
        assert len(data["properties"]) >= 8

    def test_invalid_dates_returns_400(self, session):
        r = session.get(f"{API}/properties/search", params={"check_in": "2026-09-05", "check_out": "2026-09-05"})
        assert r.status_code == 400
        r2 = session.get(f"{API}/properties/search", params={"check_in": "2026-09-10", "check_out": "2026-09-05"})
        assert r2.status_code == 400

    def test_blocked_dates_excludes_property(self, session, host_token):
        # Pick a demo property, block a future range, verify it's excluded, then unblock.
        data = _search(session, property_type="villa")
        prop = data["properties"][0]
        prop_id = prop["property_id"]
        ci, co = "2026-10-01", "2026-10-05"
        headers = {"Authorization": f"Bearer {host_token}"}

        # Block
        r = requests.post(
            f"{API}/calendar/properties/{prop_id}/block-dates",
            json={"start_date": ci, "end_date": co, "reason": "TEST_phase7_search"},
            headers=headers,
        )
        assert r.status_code in (200, 201), r.text
        body = r.json()
        block_id = body.get("blocked_date_id") or body.get("block_id") or body.get("id")

        try:
            data2 = _search(session, check_in="2026-10-02", check_out="2026-10-04", limit=100)
            ids = {p["property_id"] for p in data2["properties"]}
            assert prop_id not in ids, "Blocked property should be excluded"
        finally:
            if block_id:
                requests.delete(f"{API}/calendar/blocked-dates/{block_id}", headers=headers)


# ---------------- Regression smoke ----------------
class TestRegression:
    def test_login_all_roles(self, session):
        for email, pw in [
            ("guest@propnest.com", "guest123"),
            ("host@propnest.com", "host123"),
            ("admin@propnest.com", "admin123"),
        ]:
            r = session.post(f"{API}/auth/login", json={"email": email, "password": pw})
            assert r.status_code == 200, f"{email} login failed"

    def test_host_dashboard_accessible(self, session, host_token):
        r = session.get(f"{API}/properties/host/my-properties", headers={"Authorization": f"Bearer {host_token}"})
        assert r.status_code == 200

    def test_calendar_unified_view(self, session, host_token):
        # Pick first host property
        r = session.get(f"{API}/properties/host/my-properties", headers={"Authorization": f"Bearer {host_token}"})
        props = r.json().get("properties", [])
        if not props:
            pytest.skip("No host properties")
        pid = props[0]["property_id"]
        r2 = requests.get(
            f"{API}/calendar/properties/{pid}/unified-view",
            params={"start_date": "2026-09-01", "end_date": "2026-09-30"},
            headers={"Authorization": f"Bearer {host_token}"},
        )
        assert r2.status_code == 200
