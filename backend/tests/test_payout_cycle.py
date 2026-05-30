"""Test host payout cycle preferences and sweep eligibility logic."""
import os
import uuid
import pytest
import requests
from datetime import date, datetime, timedelta
from dotenv import load_dotenv

if os.path.exists("/app/frontend/.env"):
    load_dotenv("/app/frontend/.env")
    load_dotenv("/app/backend/.env")
else:
    import pathlib
    _base_dir = pathlib.Path(__file__).parent.parent.parent
    load_dotenv(_base_dir / "frontend" / ".env")
    load_dotenv(_base_dir / "backend" / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

CRED = {
    "host": ("host@propnest.com", "host123"),
    "admin": ("admin@propnest.com", "admin123"),
    "guest": ("guest@propnest.com", "guest123"),
}

def _login(role):
    email, pw = CRED[role]
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login {role}: {r.status_code} {r.text}"
    d = r.json()
    return d["access_token"], d["user"]["user_id"]

def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

@pytest.fixture(scope="module")
def tokens():
    return {role: _login(role) for role in CRED}

@pytest.fixture(scope="module")
def db():
    from pymongo import MongoClient
    client = MongoClient(os.environ["MONGO_URL"])
    return client[os.environ["DB_NAME"]]

def _seed_property(db, host_id):
    pid = f"prop_TEST_cycle_{uuid.uuid4().hex[:8]}"
    db.properties.insert_one({
        "property_id": pid,
        "owner_id": host_id,
        "host_id": host_id,
        "title": "TEST_cycle Property",
        "description": "payout cycle test",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "2bhk",
        "address": "123 Lane",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400001",
        "latitude": 19.07,
        "longitude": 72.87,
        "area_sqft": 1000,
        "price_per_night": 5000,
        "amenities": [],
        "images": [],
        "status": "live",
        "blocked_dates": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return pid

def _seed_paid_booking(db, *, host_id, guest_id, property_id, days_ago_checkout):
    bid = f"bk_TEST_cycle_{uuid.uuid4().hex[:8]}"
    check_out = date.today() - timedelta(days=days_ago_checkout)
    check_in = check_out - timedelta(days=2)
    pay_id = f"pay_TEST_{uuid.uuid4().hex[:10]}"
    doc = {
        "booking_id": bid,
        "property_id": property_id,
        "guest_id": guest_id,
        "host_id": host_id,
        "check_in_date": check_in.isoformat(),
        "check_out_date": check_out.isoformat(),
        "number_of_guests": 2,
        "base_amount": 5000,
        "service_fee": 0,
        "taxes": 0,
        "total_amount": 5000,
        "payment_status": "paid",
        "razorpay_payment_id": pay_id,
        "payment_id": pay_id,
        "booking_status": "confirmed",
        "cancellation_policy": "moderate",
        "security_deposit": 0,
        "security_deposit_refunded": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "confirmed_at": datetime.utcnow(),
    }
    db.bookings.insert_one(doc)
    return bid

def test_payout_cycle_preference_and_sweep(db, tokens):
    host_tok, host_id = tokens["host"]
    admin_tok, _ = tokens["admin"]
    guest_tok, guest_id = tokens["guest"]

    # 1. Update host payout preference to "weekly"
    r = requests.put(
        f"{API}/host/payout-preference",
        json={"preferred": "upi", "upi_vpa": "host@upi", "payout_cycle": "weekly"},
        headers=_h(host_tok),
        timeout=15
    )
    assert r.status_code == 200, r.text
    pref = r.json()["payout_preference"]
    assert pref.get("payout_cycle") == "weekly"

    # Seed property
    pid = _seed_property(db, host_id)

    try:
        # 2. Create a booking that checked out 2 days ago. Under "weekly", it should NOT be eligible.
        bid_weekly_not_eligible = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id, property_id=pid, days_ago_checkout=2)
        
        # 3. Create a booking that checked out 8 days ago. Under "weekly", it SHOULD be eligible (delay_days = 7).
        bid_weekly_eligible = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id, property_id=pid, days_ago_checkout=8)

        # Run sweep
        r = requests.post(f"{API}/admin/account/payouts/sweep-eligibility", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text

        # Verify that bid_weekly_eligible has an eligible payout row, but bid_weekly_not_eligible does not
        p_eligible = db.payouts.find_one({"booking_id": bid_weekly_eligible})
        p_not_eligible = db.payouts.find_one({"booking_id": bid_weekly_not_eligible})

        assert p_eligible is not None, "weekly eligible booking should have a payout row"
        assert p_eligible["status"] == "eligible"
        assert p_not_eligible is None, "weekly non-eligible booking should not have a payout row yet"

        # 4. Now update host payout preference to "monthly"
        r = requests.put(
            f"{API}/host/payout-preference",
            json={"preferred": "upi", "upi_vpa": "host@upi", "payout_cycle": "monthly"},
            headers=_h(host_tok),
            timeout=15
        )
        assert r.status_code == 200, r.text
        assert r.json()["payout_preference"].get("payout_cycle") == "monthly"

        # Create a booking that checked out 15 days ago. Under "monthly", it should NOT be eligible.
        bid_monthly_not_eligible = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id, property_id=pid, days_ago_checkout=15)

        # Create a booking that checked out 32 days ago. Under "monthly", it SHOULD be eligible (delay_days = 30).
        bid_monthly_eligible = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id, property_id=pid, days_ago_checkout=32)

        # Run sweep again
        r = requests.post(f"{API}/admin/account/payouts/sweep-eligibility", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text

        p_monthly_eligible = db.payouts.find_one({"booking_id": bid_monthly_eligible})
        p_monthly_not_eligible = db.payouts.find_one({"booking_id": bid_monthly_not_eligible})

        assert p_monthly_eligible is not None, "monthly eligible booking should have a payout row"
        assert p_monthly_eligible["status"] == "eligible"
        assert p_monthly_not_eligible is None, "monthly non-eligible booking should not have a payout row yet"

    finally:
        # Cleanup
        db.properties.delete_one({"property_id": pid})
        for bid in [bid_weekly_not_eligible, bid_weekly_eligible, bid_monthly_not_eligible, bid_monthly_eligible]:
            db.bookings.delete_many({"booking_id": bid})
            db.payouts.delete_many({"booking_id": bid})
            db.transactions.delete_many({"booking_id": bid})
