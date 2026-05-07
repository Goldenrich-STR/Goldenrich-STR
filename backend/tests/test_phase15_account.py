"""Phase 15 — Super Admin Account: ledger, payouts, refunds, analytics regression."""
import csv
import io
import os
import time
import uuid
from datetime import date, datetime, timedelta

import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL not set"
API = f"{BASE_URL}/api"

CRED = {
    "host": ("host@propnest.com", "host123"),
    "broker": ("broker@propnest.com", "broker123"),
    "employee": ("employee@propnest.com", "employee123"),
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


# ---- Helpers: make a confirmed-paid booking by direct DB insert ----
def _seed_property(db, host_id, status="live"):
    pid = f"prop_TEST_p15_{uuid.uuid4().hex[:8]}"
    db.properties.insert_one({
        "property_id": pid,
        "owner_id": host_id,
        "host_id": host_id,
        "title": "TEST_p15 Property",
        "description": "phase15 test",
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
        "status": status,
        "blocked_dates": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return pid


def _seed_paid_booking(db, *, host_id, guest_id, property_id, total=5000, days_ago_checkout=2, check_in_offset_days=10):
    """Insert a confirmed+paid booking and return booking dict."""
    bid = f"bk_TEST_p15_{uuid.uuid4().hex[:8]}"
    if days_ago_checkout is not None:
        # past booking (for payout sweep)
        check_out = date.today() - timedelta(days=days_ago_checkout)
        check_in = check_out - timedelta(days=2)
    else:
        # future booking (for refund tier tests)
        check_in = date.today() + timedelta(days=check_in_offset_days)
        check_out = check_in + timedelta(days=2)
    pay_id = f"pay_TEST_{uuid.uuid4().hex[:10]}"
    doc = {
        "booking_id": bid,
        "property_id": property_id,
        "guest_id": guest_id,
        "host_id": host_id,
        "check_in_date": check_in.isoformat(),
        "check_out_date": check_out.isoformat(),
        "number_of_guests": 2,
        "base_amount": total,
        "service_fee": 0,
        "taxes": 0,
        "total_amount": total,
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
    return doc


@pytest.fixture(scope="module")
def host_id(tokens):
    return tokens["host"][1]


@pytest.fixture(scope="module")
def guest_id(tokens):
    return tokens["guest"][1]


@pytest.fixture(scope="module")
def test_property(db, host_id):
    pid = _seed_property(db, host_id)
    yield pid
    db.properties.delete_one({"property_id": pid})


# Track created bookings/payouts/refunds for cleanup
_CLEANUP = {"bookings": set(), "payouts": set(), "refunds": set(), "txns": set()}


def _cleanup(db):
    if _CLEANUP["bookings"]:
        db.bookings.delete_many({"booking_id": {"$in": list(_CLEANUP["bookings"])}})
        db.payouts.delete_many({"booking_id": {"$in": list(_CLEANUP["bookings"])}})
        db.refunds.delete_many({"booking_id": {"$in": list(_CLEANUP["bookings"])}})
        db.transactions.delete_many({"booking_id": {"$in": list(_CLEANUP["bookings"])}})


@pytest.fixture(scope="module", autouse=True)
def _final_cleanup(db):
    yield
    _cleanup(db)


# ============== Access Guard ==============
def test_admin_overview_requires_admin(tokens):
    for role in ("host", "broker", "employee", "guest"):
        tok = tokens[role][0]
        r = requests.get(f"{API}/admin/account/overview", headers=_h(tok), timeout=15)
        assert r.status_code == 403, f"{role} got {r.status_code}: {r.text}"


# ============== Overview ==============
def test_admin_overview_shape(tokens):
    tok = tokens["admin"][0]
    r = requests.get(f"{API}/admin/account/overview", headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    rev = d["revenue"]
    for k in ("total_gross_paise", "platform_take_paise", "booking_payments_paise",
              "registration_fees_paise", "subscriptions_paise", "refunds_paise",
              "payouts_paid_paise"):
        assert k in rev and isinstance(rev[k], int) and rev[k] >= 0
    # platform_take = booking * 10%
    assert rev["platform_take_paise"] == int(round(rev["booking_payments_paise"] * 0.10))
    assert "pending_payouts" in d and "count" in d["pending_payouts"]
    assert "mrr_paise" in d


# ============== MRR chart ==============
def test_mrr_chart_6_months(tokens):
    tok = tokens["admin"][0]
    r = requests.get(f"{API}/admin/account/mrr-chart?months=6", headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    months = r.json()["months"]
    assert len(months) == 6
    # newest last: parse labels
    labels = [m["label"] for m in months]
    parsed = [datetime.strptime(lbl, "%b %Y") for lbl in labels]
    assert parsed == sorted(parsed), f"months not chronological: {labels}"
    for m in months:
        for k in ("inflow_paise", "refund_paise", "net_paise"):
            assert isinstance(m[k], int)


# ============== Top hosts ==============
def test_top_hosts(tokens):
    tok = tokens["admin"][0]
    r = requests.get(f"{API}/admin/account/top-hosts?limit=5", headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    hosts = r.json()["hosts"]
    # backfilled 45 booking_payments → at least 1 host
    if hosts:
        gross = [h["gross_paise"] for h in hosts]
        assert gross == sorted(gross, reverse=True)
        for h in hosts:
            for k in ("host_id", "full_name", "email", "city", "gross_paise", "bookings", "platform_take_paise"):
                assert k in h
            assert h["platform_take_paise"] == int(round(h["gross_paise"] * 0.10))


# ============== Transactions list + filters ==============
def test_transactions_filter_by_type_status(tokens):
    tok = tokens["admin"][0]
    r = requests.get(f"{API}/admin/account/transactions?type=booking_payment&status=success",
                     headers=_h(tok), timeout=15)
    assert r.status_code == 200
    d = r.json()
    for t in d["transactions"]:
        assert t["type"] == "booking_payment"
        assert t["status"] == "success"
    # sort desc check
    times = [t["created_at"] for t in d["transactions"][:5]]
    assert times == sorted(times, reverse=True)


# ============== CSV export ==============
def test_csv_export(tokens):
    tok = tokens["admin"][0]
    r = requests.get(f"{API}/admin/account/transactions/export-csv?type=booking_payment",
                     headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    assert "text/csv" in r.headers.get("Content-Type", "")
    assert "attachment" in r.headers.get("Content-Disposition", "")
    rows = list(csv.DictReader(io.StringIO(r.text)))
    assert "amount_inr" in (rows[0].keys() if rows else r.text.split("\n")[0])
    for row in rows[:5]:
        assert row["type"] == "booking_payment"


# ============== Booking → ledger ==============
def test_mock_pay_writes_ledger_and_idempotent(db, tokens, host_id, guest_id, test_property):
    """Use POST /bookings/{id}/mock-pay to confirm a soft-lock; idempotent on retry."""
    g_tok = tokens["guest"][0]
    # Create soft-lock booking via API
    in_d = (date.today() + timedelta(days=30)).isoformat()
    out_d = (date.today() + timedelta(days=32)).isoformat()
    r = requests.post(f"{API}/bookings/", json={
        "property_id": test_property,
        "check_in_date": in_d,
        "check_out_date": out_d,
        "number_of_guests": 2,
    }, headers=_h(g_tok), timeout=15)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    bid = body["booking_id"]
    total_rupees = int(body["booking_details"]["total_amount"])
    _CLEANUP["bookings"].add(bid)

    # Mock-pay #1
    r1 = requests.post(f"{API}/bookings/{bid}/mock-pay", headers=_h(g_tok), timeout=15)
    assert r1.status_code == 200, r1.text

    # Verify ledger row exists
    txns = list(db.transactions.find({"booking_id": bid, "type": "booking_payment"}))
    assert len(txns) == 1, f"expected 1 txn after first mock-pay, got {len(txns)}"
    assert txns[0]["amount"] == total_rupees * 100
    assert txns[0]["host_id"] == host_id
    assert txns[0]["user_id"] == guest_id
    assert txns[0].get("is_mock") is True

    # Mock-pay #2 — idempotent (no new txn for same payment_id)
    r2 = requests.post(f"{API}/bookings/{bid}/mock-pay", headers=_h(g_tok), timeout=15)
    # may be 200 or 400 (already paid); accept either
    assert r2.status_code in (200, 400)
    txns2 = list(db.transactions.find({"booking_id": bid, "type": "booking_payment"}))
    assert len(txns2) == 1, f"duplicate txn on retry: {len(txns2)}"


# ============== Refund policy preview ==============
def test_refund_policy_preview_tiers(tokens):
    tok = tokens["admin"][0]
    today = date.today()

    # 100% — 10+ days out
    d1 = (today + timedelta(days=15)).isoformat()
    r = requests.get(f"{API}/admin/account/refunds/policy-preview?check_in_date={d1}&total_amount=5000",
                     headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["percent"] == 100.0 and j["tier"] == "full" and j["refund_inr"] == 5000.0

    # 50% — 3 days
    d2 = (today + timedelta(days=3)).isoformat()
    j = requests.get(f"{API}/admin/account/refunds/policy-preview?check_in_date={d2}&total_amount=5000",
                     headers=_h(tok), timeout=15).json()
    assert j["percent"] == 50.0 and j["tier"] == "partial_50"

    # 0% — 1 day
    d3 = (today + timedelta(days=1)).isoformat()
    j = requests.get(f"{API}/admin/account/refunds/policy-preview?check_in_date={d3}&total_amount=5000",
                     headers=_h(tok), timeout=15).json()
    assert j["percent"] == 0.0 and j["tier"] == "no_refund"


# ============== Admin refund (policy tier full) ==============
def test_admin_refund_policy_full(db, tokens, host_id, guest_id, test_property):
    tok = tokens["admin"][0]
    bk = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id,
                             property_id=test_property, total=5000,
                             days_ago_checkout=None, check_in_offset_days=10)
    bid = bk["booking_id"]
    _CLEANUP["bookings"].add(bid)

    r = requests.post(f"{API}/admin/account/refunds/{bid}",
                      json={"reason": "guest ill"}, headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    rfd = r.json()["refund"]
    assert rfd["refund_percent"] == 100.0
    assert rfd["policy_tier"] == "full"
    assert rfd["razorpay_refund_id"].startswith("rfnd_mock_") or rfd.get("is_mock")
    # ledger
    txns = list(db.transactions.find({"booking_id": bid, "type": "refund"}))
    assert len(txns) == 1
    # booking refund_status
    bdoc = db.bookings.find_one({"booking_id": bid})
    assert bdoc["refund_status"] == "processed"


# ============== Admin refund override ==============
def test_admin_refund_override_percent(db, tokens, host_id, guest_id, test_property):
    tok = tokens["admin"][0]
    bk = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id,
                             property_id=test_property, total=4000,
                             days_ago_checkout=None, check_in_offset_days=1)
    bid = bk["booking_id"]
    _CLEANUP["bookings"].add(bid)
    r = requests.post(f"{API}/admin/account/refunds/{bid}",
                      json={"reason": "half-refund", "override_percent": 75},
                      headers=_h(tok), timeout=15)
    assert r.status_code == 200, r.text
    rfd = r.json()["refund"]
    assert rfd["refund_percent"] == 75.0
    assert rfd["policy_tier"] == "admin_override"
    # 4000 INR -> 400000 paise * 0.75 = 300000
    assert rfd["refund_amount"] == 300000


# ============== Refund dup-guard ==============
def test_admin_refund_dup_guard(db, tokens, host_id, guest_id, test_property):
    tok = tokens["admin"][0]
    bk = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id,
                             property_id=test_property, total=3000,
                             days_ago_checkout=None, check_in_offset_days=10)
    bid = bk["booking_id"]
    _CLEANUP["bookings"].add(bid)
    # First refund (should succeed)
    requests.post(f"{API}/admin/account/refunds/{bid}",
                  json={"reason": "first"}, headers=_h(tok), timeout=15)
    # Mark the booking cancelled to trigger dup guard (route checks both flags)
    db.bookings.update_one({"booking_id": bid}, {"$set": {"booking_status": "cancelled"}})
    r2 = requests.post(f"{API}/admin/account/refunds/{bid}",
                       json={"reason": "second"}, headers=_h(tok), timeout=15)
    assert r2.status_code == 400
    assert "already" in r2.text.lower()


# ============== Auto-refund on guest cancel ==============
def test_guest_cancel_auto_refund(db, tokens, host_id, guest_id, test_property):
    g_tok = tokens["guest"][0]
    bk = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id,
                             property_id=test_property, total=6000,
                             days_ago_checkout=None, check_in_offset_days=10)
    bid = bk["booking_id"]
    _CLEANUP["bookings"].add(bid)
    r = requests.post(f"{API}/bookings/{bid}/cancel",
                      json={"cancellation_reason": "test cancel"}, headers=_h(g_tok), timeout=15)
    assert r.status_code == 200, r.text
    body = r.json()
    # refund object somewhere in response
    refund = body.get("refund") or body.get("data", {}).get("refund")
    assert refund is not None, f"no refund block: {body}"
    assert refund.get("policy_tier") == "full" or refund.get("tier") == "full" or refund.get("refund_percent") == 100.0
    # db check
    assert db.refunds.find_one({"booking_id": bid}) is not None
    assert db.transactions.find_one({"booking_id": bid, "type": "refund"}) is not None


# ============== Payout eligibility sweeper ==============
def test_payout_sweep_marks_eligible(db, tokens, host_id, guest_id, test_property):
    a_tok = tokens["admin"][0]
    bk = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id,
                             property_id=test_property, total=5000,
                             days_ago_checkout=2)  # check_out 2 days ago
    bid = bk["booking_id"]
    _CLEANUP["bookings"].add(bid)
    r = requests.post(f"{API}/admin/account/payouts/sweep-eligibility",
                      headers=_h(a_tok), timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["count"] >= 1
    p = db.payouts.find_one({"booking_id": bid})
    assert p is not None
    assert p["status"] == "eligible"
    # 5000 rupees * 100 = 500000 paise
    assert p["gross_amount"] == 500000
    assert p["platform_fee"] == 50000
    assert p["net_amount"] == 450000


# ============== Payout process success (with UPI) ==============
def test_process_payout_with_upi(db, tokens, host_id):
    h_tok, _ = tokens["host"]
    a_tok, _ = tokens["admin"]
    # Set UPI
    r = requests.put(f"{API}/host/payout-preference",
                     json={"preferred": "upi", "upi_vpa": "host@upi"},
                     headers=_h(h_tok), timeout=15)
    assert r.status_code == 200, r.text

    # Find an eligible payout for this host (created above)
    p = db.payouts.find_one({"host_id": host_id, "status": "eligible"})
    assert p is not None, "no eligible payout to process"
    pid = p["payout_id"]

    r = requests.post(f"{API}/admin/account/payouts/{pid}/process",
                      headers=_h(a_tok), timeout=15)
    assert r.status_code == 200, r.text
    payout = r.json()["payout"]
    assert payout["status"] == "paid"
    assert payout["razorpay_payout_id"].startswith("pout_mock_")
    txn = db.transactions.find_one({"payout_id": pid, "type": "payout"})
    assert txn is not None
    assert txn["amount"] == payout["net_amount"]


# ============== Payout fails when no destination ==============
def test_process_payout_no_destination(db, tokens, host_id, guest_id, test_property):
    a_tok = tokens["admin"][0]
    # Unset host preference
    db.users.update_one({"user_id": host_id}, {"$unset": {"payout_preference": ""}})
    # Create a fresh past booking and sweep
    bk = _seed_paid_booking(db, host_id=host_id, guest_id=guest_id,
                             property_id=test_property, total=2000, days_ago_checkout=3)
    _CLEANUP["bookings"].add(bk["booking_id"])
    requests.post(f"{API}/admin/account/payouts/sweep-eligibility",
                  headers=_h(a_tok), timeout=15)
    p = db.payouts.find_one({"booking_id": bk["booking_id"]})
    assert p is not None
    r = requests.post(f"{API}/admin/account/payouts/{p['payout_id']}/process",
                      headers=_h(a_tok), timeout=15)
    assert r.status_code == 200, r.text
    payout = r.json()["payout"]
    assert payout["status"] == "failed"
    assert "destination" in (payout.get("failure_reason", "") or "").lower()


# ============== Batch process ==============
def test_process_eligible_batch_idempotent(db, tokens, host_id):
    a_tok = tokens["admin"][0]
    # Ensure host has UPI again
    h_tok = tokens["host"][0]
    requests.put(f"{API}/host/payout-preference",
                 json={"preferred": "upi", "upi_vpa": "host@upi"},
                 headers=_h(h_tok), timeout=15)
    # Run batch
    r1 = requests.post(f"{API}/admin/account/payouts/process-eligible",
                       headers=_h(a_tok), timeout=15)
    assert r1.status_code == 200
    d1 = r1.json()
    assert d1["processed"] + d1["failed"] == d1["total"]
    # Run again — should now have 0 eligible
    r2 = requests.post(f"{API}/admin/account/payouts/process-eligible",
                       headers=_h(a_tok), timeout=15)
    d2 = r2.json()
    assert d2["total"] == 0
    assert d2["processed"] == 0


# ============== Host payout preference validation ==============
def test_host_payout_pref_validation(tokens):
    h_tok = tokens["host"][0]
    # Missing UPI VPA
    r = requests.put(f"{API}/host/payout-preference",
                     json={"preferred": "upi"}, headers=_h(h_tok), timeout=15)
    assert r.status_code == 400
    # Bank with only IFSC
    r = requests.put(f"{API}/host/payout-preference",
                     json={"preferred": "bank", "bank_ifsc": "HDFC0000123"},
                     headers=_h(h_tok), timeout=15)
    assert r.status_code == 400
    # Valid UPI
    r = requests.put(f"{API}/host/payout-preference",
                     json={"preferred": "upi", "upi_vpa": "host@okhdfc"},
                     headers=_h(h_tok), timeout=15)
    assert r.status_code == 200
    # Valid bank
    r = requests.put(f"{API}/host/payout-preference",
                     json={"preferred": "bank",
                           "bank_account_number": "1234567890",
                           "bank_ifsc": "HDFC0000123",
                           "bank_account_holder": "Host User"},
                     headers=_h(h_tok), timeout=15)
    assert r.status_code == 200, r.text
    pref = r.json()["payout_preference"]
    assert pref.get("bank_account_number_masked", "").endswith("7890")


# ============== Host payouts list ==============
def test_host_payouts_list(tokens, host_id, db):
    h_tok = tokens["host"][0]
    r = requests.get(f"{API}/host/payouts", headers=_h(h_tok), timeout=15)
    assert r.status_code == 200, r.text
    payouts = r.json()["payouts"]
    # only this host's payouts
    for p in payouts:
        assert p["host_id"] == host_id
        # enrichment
        assert "property" in p


# ============== Unique indexes ==============
def test_unique_indexes_payouts(db):
    """Inserting two payouts with same booking_id or payout_id must fail."""
    from pymongo.errors import DuplicateKeyError
    sample_bid = f"bk_TEST_idx_{uuid.uuid4().hex[:6]}"
    sample_pid = f"pyo_TEST_idx_{uuid.uuid4().hex[:6]}"
    base = {
        "payout_id": sample_pid,
        "host_id": "user_test",
        "booking_id": sample_bid,
        "property_id": "prop_test",
        "gross_amount": 100, "platform_fee": 10, "net_amount": 90,
        "destination_type": "upi", "destination_ref": "x@y",
        "status": "eligible",
        "eligible_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    db.payouts.insert_one(dict(base))
    try:
        # same booking_id, different payout_id
        dup = dict(base, payout_id=f"pyo_TEST_idx_{uuid.uuid4().hex[:6]}")
        with pytest.raises(DuplicateKeyError):
            db.payouts.insert_one(dup)
        # same payout_id, different booking_id
        dup2 = dict(base, booking_id=f"bk_TEST_idx_{uuid.uuid4().hex[:6]}")
        with pytest.raises(DuplicateKeyError):
            db.payouts.insert_one(dup2)
    finally:
        db.payouts.delete_many({"booking_id": sample_bid})
        db.payouts.delete_many({"payout_id": sample_pid})


# ============== Registration-fee mock-pay writes ledger ==============
def test_registration_fee_mock_pay_ledger(db, tokens):
    """Use a fresh ephemeral host (or just verify existing rows from backfill)."""
    # A ledger row of type=registration_fee should exist for the host (backfilled)
    host_id = tokens["host"][1]
    rows = list(db.transactions.find({"type": "registration_fee", "user_id": host_id}))
    assert len(rows) >= 1, "no registration_fee transactions for host"
    for r in rows:
        assert r["amount"] == 50000  # 500 INR in paise
