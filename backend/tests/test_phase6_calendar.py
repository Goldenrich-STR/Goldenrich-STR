"""
Phase 6 Calendar + Auth + Regression smoke tests for PropNest STR.
Tests run against REACT_APP_BACKEND_URL with /api prefix.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://propnest-str.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# ---------- Fixtures ----------

CREDS = {
    "guest":    {"email": "guest@propnest.com",    "password": "guest123"},
    "host":     {"email": "host@propnest.com",     "password": "host123"},
    "broker":   {"email": "broker@propnest.com",   "password": "broker123"},
    "employee": {"email": "employee@propnest.com", "password": "employee123"},
    "admin":    {"email": "admin@propnest.com",    "password": "admin123"},
}

session = requests.Session()
session.headers.update({"Content-Type": "application/json"})

_tokens: dict[str, str] = {}


def _login(role: str) -> str:
    if role in _tokens:
        return _tokens[role]
    resp = session.post(f"{API}/auth/login", json=CREDS[role], timeout=30)
    assert resp.status_code == 200, f"Login failed for {role}: {resp.status_code} {resp.text}"
    data = resp.json()
    token = data.get("access_token") or data.get("token") or (data.get("data") or {}).get("access_token")
    assert token, f"No token in login response for {role}: {data}"
    _tokens[role] = token
    return token


def _hdr(role: str) -> dict:
    return {"Authorization": f"Bearer {_login(role)}", "Content-Type": "application/json"}


# ---------- Auth tests ----------

@pytest.mark.parametrize("role", ["guest", "host", "broker", "employee", "admin"])
def test_login_all_roles(role):
    resp = session.post(f"{API}/auth/login", json=CREDS[role], timeout=30)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    token = body.get("access_token") or body.get("token") or (body.get("data") or {}).get("access_token")
    assert token, body


# ---------- Regression on patched Depends() routes ----------

def test_property_listings_public():
    r = requests.get(f"{API}/properties/search", timeout=30)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert isinstance(body, (list, dict)), body


def test_host_my_properties():
    r = requests.get(f"{API}/properties/my-properties", headers=_hdr("host"), timeout=30)
    assert r.status_code in (200, 404), r.text


def test_admin_users_list_smoke():
    # Just smoke: must not 422/500
    r = requests.get(f"{API}/admin/users", headers=_hdr("admin"), timeout=30)
    assert r.status_code in (200, 401, 403, 404), r.text


def test_broker_dashboard_smoke():
    r = requests.get(f"{API}/broker/dashboard", headers=_hdr("broker"), timeout=30)
    assert r.status_code in (200, 401, 403, 404), r.text


def test_employee_dashboard_smoke():
    r = requests.get(f"{API}/employee/dashboard", headers=_hdr("employee"), timeout=30)
    assert r.status_code in (200, 401, 403, 404), r.text


def test_subscription_plans_smoke():
    r = requests.get(f"{API}/subscriptions/plans", timeout=30)
    assert r.status_code in (200, 404), r.text


def test_cms_smoke():
    r = requests.get(f"{API}/cms/pages", timeout=30)
    assert r.status_code in (200, 404), r.text


def test_notifications_smoke():
    r = requests.get(f"{API}/notifications/", headers=_hdr("host"), timeout=30)
    assert r.status_code in (200, 404), r.text


# ---------- Calendar tests ----------

PROPERTY_ID = "prop_1778064931.547249"


def _ensure_property():
    """Verify the seeded property exists for host. Else, create a new one."""
    global PROPERTY_ID
    r = requests.get(f"{API}/properties/{PROPERTY_ID}", timeout=30)
    if r.status_code == 200:
        return PROPERTY_ID
    # create new one
    payload = {
        "title": "TEST Calendar Villa",
        "description": "Test property for phase6 calendar tests",
        "property_type": "villa",
        "bhk_type": "3bhk",
        "category": "residential",
        "address": "Test address",
        "city": "Goa",
        "state": "Goa",
        "country": "India",
        "pincode": "403001",
        "max_guests": 6,
        "bedrooms": 3,
        "bathrooms": 2,
        "base_price_per_night": 5000,
        "amenities": ["wifi"],
    }
    r = requests.post(f"{API}/properties/", json=payload, headers=_hdr("host"), timeout=30)
    assert r.status_code in (200, 201), f"Failed to create test property: {r.status_code} {r.text}"
    body = r.json()
    PROPERTY_ID = body.get("property_id") or body.get("id") or (body.get("property") or {}).get("property_id")
    assert PROPERTY_ID, body
    return PROPERTY_ID


def test_calendar_blocked_dates_public():
    pid = _ensure_property()
    r = requests.get(f"{API}/calendar/properties/{pid}/blocked-dates", timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "blocked_dates" in body and "total" in body


def test_block_dates_validations_and_success():
    pid = _ensure_property()
    h = _hdr("host")

    # cleanup any pre-existing TEST blocks in the test window
    existing = requests.get(f"{API}/calendar/properties/{pid}/blocked-dates", timeout=30).json()
    for b in existing.get("blocked_dates", []):
        if b.get("source") == "manual" and b.get("start_date", "") >= "2026-08-01" and b.get("start_date", "") <= "2026-09-30":
            requests.delete(f"{API}/calendar/blocked-dates/{b['blocked_date_id']}", headers=h, timeout=30)

    # past date
    r = requests.post(f"{API}/calendar/properties/{pid}/block-dates",
                      json={"start_date": "2020-01-01", "end_date": "2020-01-05", "reason": "TEST past"},
                      headers=h, timeout=30)
    assert r.status_code == 400, r.text

    # end < start
    r = requests.post(f"{API}/calendar/properties/{pid}/block-dates",
                      json={"start_date": "2026-09-10", "end_date": "2026-09-05", "reason": "TEST inv"},
                      headers=h, timeout=30)
    assert r.status_code == 400, r.text

    # success block
    r = requests.post(f"{API}/calendar/properties/{pid}/block-dates",
                      json={"start_date": "2026-08-15", "end_date": "2026-08-20", "reason": "TEST block"},
                      headers=h, timeout=30)
    assert r.status_code == 200, r.text
    block_id = r.json()["blocked_date_id"]

    # overlap conflict
    r2 = requests.post(f"{API}/calendar/properties/{pid}/block-dates",
                       json={"start_date": "2026-08-18", "end_date": "2026-08-22", "reason": "TEST overlap"},
                       headers=h, timeout=30)
    assert r2.status_code == 409, r2.text

    # unblock
    r3 = requests.delete(f"{API}/calendar/blocked-dates/{block_id}", headers=h, timeout=30)
    assert r3.status_code == 200, r3.text

    # unblocking again -> 404
    r4 = requests.delete(f"{API}/calendar/blocked-dates/{block_id}", headers=h, timeout=30)
    assert r4.status_code == 404, r4.text


def test_block_dates_requires_auth():
    pid = _ensure_property()
    r = requests.post(f"{API}/calendar/properties/{pid}/block-dates",
                      json={"start_date": "2026-08-15", "end_date": "2026-08-16", "reason": "no auth"},
                      timeout=30)
    assert r.status_code in (401, 403), r.text


def test_unified_view():
    pid = _ensure_property()
    r = requests.get(f"{API}/calendar/properties/{pid}/unified-view?month=8&year=2026",
                     headers=_hdr("host"), timeout=30)
    assert r.status_code == 200, r.text
    body = r.json()
    assert "events" in body and "month" in body and body["month"] == 8


def test_ical_export():
    pid = _ensure_property()
    r = requests.get(f"{API}/calendar/properties/{pid}/ical-export", headers=_hdr("host"), timeout=30)
    assert r.status_code == 200, r.text
    ct = r.headers.get("content-type", "")
    assert "text/calendar" in ct, ct
    assert b"BEGIN:VCALENDAR" in r.content
    assert b"END:VCALENDAR" in r.content


def test_external_calendar_validation_and_crud():
    pid = _ensure_property()
    h = _hdr("host")

    # invalid url
    r = requests.post(f"{API}/calendar/properties/{pid}/external-calendars",
                      json={"name": "TEST bad", "ical_url": "ftp://bad.example.com/cal.ics"},
                      headers=h, timeout=30)
    assert r.status_code == 400, r.text

    # valid url (will fail to sync but should still be created)
    r = requests.post(f"{API}/calendar/properties/{pid}/external-calendars",
                      json={"name": "TEST ext", "ical_url": "https://example.com/cal.ics", "color": "#F59E0B"},
                      headers=h, timeout=60)
    assert r.status_code == 200, r.text
    body = r.json()
    cal_id = body["calendar"]["calendar_id"]

    # list
    r = requests.get(f"{API}/calendar/properties/{pid}/external-calendars", headers=h, timeout=30)
    assert r.status_code == 200, r.text
    assert any(c["calendar_id"] == cal_id for c in r.json()["calendars"])

    # manual sync
    r = requests.post(f"{API}/calendar/external-calendars/{cal_id}/sync", headers=h, timeout=60)
    assert r.status_code == 200, r.text

    # delete
    r = requests.delete(f"{API}/calendar/external-calendars/{cal_id}", headers=h, timeout=30)
    assert r.status_code == 200, r.text


def test_booking_blocked_by_manual_block():
    pid = _ensure_property()
    h_host = _hdr("host")

    # create a manual block in the future
    r = requests.post(f"{API}/calendar/properties/{pid}/block-dates",
                      json={"start_date": "2026-09-10", "end_date": "2026-09-15", "reason": "TEST booking guard"},
                      headers=h_host, timeout=30)
    # if pre-existing overlap, ignore
    if r.status_code == 200:
        block_id = r.json()["blocked_date_id"]
    else:
        block_id = None

    # guest tries to book overlapping dates
    h_guest = _hdr("guest")
    payload = {
        "property_id": pid,
        "check_in_date": "2026-09-12",
        "check_out_date": "2026-09-14",
        "number_of_guests": 2,
    }
    r = requests.post(f"{API}/bookings/", json=payload, headers=h_guest, timeout=30)
    assert r.status_code in (400, 409), f"Expected conflict, got {r.status_code} {r.text}"

    if block_id:
        requests.delete(f"{API}/calendar/blocked-dates/{block_id}", headers=h_host, timeout=30)
