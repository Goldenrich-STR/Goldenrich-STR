"""Phase 14 — Property Verification Workflow regression tests."""
import os
import time
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
}


def _login(role):
    email, pw = CRED[role]
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login {role}: {r.status_code} {r.text}"
    data = r.json()
    return data["access_token"], data["user"]["user_id"]


def _h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _make_property(host_token, suffix=""):
    payload = {
        "title": f"TEST_p14 Verif Property {suffix or int(time.time()*1000)}",
        "description": "Phase 14 ephemeral property for verification workflow test",
        "category": "residential",
        "property_type": "villa",
        "bhk_type": "2bhk",
        "max_guests": 4,
        "bedrooms": 2,
        "bathrooms": 2,
        "address": "123 Test Lane",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400001",
        "area_sqft": 1200,
        "latitude": 19.076,
        "longitude": 72.8777,
        "price_per_night": 5000,
        "amenities": ["wifi"],
        "images": ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c"],
    }
    r = requests.post(f"{API}/properties/", json=payload, headers=_h(host_token), timeout=15)
    assert r.status_code in (200, 201), f"create property: {r.status_code} {r.text}"
    return r.json()["property_id"]


@pytest.fixture(scope="module")
def tokens():
    return {role: _login(role) for role in CRED}


@pytest.fixture(scope="module")
def db():
    """Direct mongo handle for cleanup + introspection."""
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL", "mongodb://localhost:27017"))
    return client[os.environ.get("DB_NAME", "test_database")]


# ============== Happy path E2E ==============
def test_full_happy_path(tokens, db):
    host_tok, host_id = tokens["host"]
    broker_tok, broker_id = tokens["broker"]
    emp_tok, _ = tokens["employee"]
    admin_tok, _ = tokens["admin"]

    pid = _make_property(host_tok, "happy")
    try:
        # 1. Submit
        r = requests.post(f"{API}/properties/{pid}/submit-verification", headers=_h(host_tok), timeout=15)
        assert r.status_code == 200, r.text
        prop = db.properties.find_one({"property_id": pid})
        assert prop["status"] == "pending_verification"
        verif = db.property_verifications.find_one({"property_id": pid})
        assert verif and verif["status"] == "pending"
        assert verif["verification_id"].startswith("verify_")
        assert prop.get("broker_id") is not None

        # 2. Broker queue lists it
        r = requests.get(f"{API}/broker/verifications", headers=_h(broker_tok), timeout=15)
        assert r.status_code == 200
        ids = [v["property_id"] for v in r.json()["verifications"]]
        assert pid in ids

        # 3. Broker submits visit
        body = {
            "checklist": {
                "property_owner_verification": True, "ownership_verification": True,
                "property_location_verification": True, "amenities_verification": True,
                "safety_security_verification": True, "property_photos_verification": True,
                "pricing_verification": True, "guest_capacity_rules": True,
                "legal_compliance_verification": True, "employee_verification_declaration": False,
            },
            "geo_tagged_photos": [{
                "photo_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
                "latitude": 19.076, "longitude": 72.8777,
                "timestamp": "2026-01-01T10:00:00", "description": "front"
            }],
            "video_url": None, "broker_remarks": "ok",
        }
        r = requests.post(f"{API}/broker/verifications/{pid}/submit", json=body, headers=_h(broker_tok), timeout=15)
        assert r.status_code == 200, r.text
        prop = db.properties.find_one({"property_id": pid})
        assert prop["status"] == "under_review"
        verif = db.property_verifications.find_one({"property_id": pid})
        assert verif["status"] == "completed"

        # 4. Employee sees it in pending review
        r = requests.get(f"{API}/employee/verifications/pending", headers=_h(emp_tok), timeout=15)
        assert r.status_code == 200
        pending_ids = [v["property_id"] for v in r.json()["verifications"]]
        assert pid in pending_ids
        verif_id = verif["verification_id"]

        # 5. RM approves with JSON body
        r = requests.post(f"{API}/employee/verifications/{verif_id}/approve",
                          json={"remarks": "looks good"}, headers=_h(emp_tok), timeout=15)
        assert r.status_code == 200, r.text
        verif = db.property_verifications.find_one({"property_id": pid})
        assert verif["rm_reviewed"] is True and verif["rm_approved"] is True

        # 6. Admin awaiting-final-approval
        r = requests.get(f"{API}/admin/properties/awaiting-final-approval", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200
        wait_ids = [p["property_id"] for p in r.json()["properties"]]
        assert pid in wait_ids

        # 7. Admin approve
        r = requests.post(f"{API}/admin/properties/{pid}/approve", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        prop = db.properties.find_one({"property_id": pid})
        assert prop["status"] == "live"
    finally:
        db.properties.delete_one({"property_id": pid})
        db.property_verifications.delete_many({"property_id": pid})


# ============== RM rejection ==============
def test_rm_rejection_branch(tokens, db):
    host_tok, _ = tokens["host"]
    broker_tok, _ = tokens["broker"]
    emp_tok, _ = tokens["employee"]
    pid = _make_property(host_tok, "rmrej")
    try:
        requests.post(f"{API}/properties/{pid}/submit-verification", headers=_h(host_tok), timeout=15).raise_for_status()
        body = {
            "checklist": {k: True for k in [
                "property_owner_verification", "ownership_verification", "property_location_verification",
                "amenities_verification", "safety_security_verification", "property_photos_verification",
                "pricing_verification", "guest_capacity_rules", "legal_compliance_verification",
                "employee_verification_declaration"]},
            "geo_tagged_photos": [{
                "photo_url": "https://x/y.jpg", "latitude": 19.0, "longitude": 72.8,
                "timestamp": "2026-01-01T10:00:00",
            }],
        }
        requests.post(f"{API}/broker/verifications/{pid}/submit", json=body, headers=_h(broker_tok), timeout=15).raise_for_status()

        verif_id = db.property_verifications.find_one({"property_id": pid})["verification_id"]
        r = requests.post(f"{API}/employee/verifications/{verif_id}/reject",
                          json={"reason": "too dim"}, headers=_h(emp_tok), timeout=15)
        assert r.status_code == 200, r.text
        prop = db.properties.find_one({"property_id": pid})
        verif = db.property_verifications.find_one({"property_id": pid})
        assert prop["status"] == "draft"
        assert verif["status"] == "rejected"
    finally:
        db.properties.delete_one({"property_id": pid})
        db.property_verifications.delete_many({"property_id": pid})


# ============== Admin rejection after RM approval ==============
def test_admin_rejection_branch(tokens, db):
    host_tok, _ = tokens["host"]
    broker_tok, _ = tokens["broker"]
    emp_tok, _ = tokens["employee"]
    admin_tok, _ = tokens["admin"]
    pid = _make_property(host_tok, "adminrej")
    try:
        requests.post(f"{API}/properties/{pid}/submit-verification", headers=_h(host_tok), timeout=15).raise_for_status()
        body = {
            "checklist": {k: True for k in [
                "property_owner_verification", "ownership_verification", "property_location_verification",
                "amenities_verification", "safety_security_verification", "property_photos_verification",
                "pricing_verification", "guest_capacity_rules", "legal_compliance_verification",
                "employee_verification_declaration"]},
            "geo_tagged_photos": [{"photo_url": "https://x/y.jpg", "latitude": 19.0,
                                   "longitude": 72.8, "timestamp": "2026-01-01T10:00:00"}],
        }
        requests.post(f"{API}/broker/verifications/{pid}/submit", json=body, headers=_h(broker_tok), timeout=15).raise_for_status()
        verif_id = db.property_verifications.find_one({"property_id": pid})["verification_id"]
        requests.post(f"{API}/employee/verifications/{verif_id}/approve",
                      json={"remarks": "ok"}, headers=_h(emp_tok), timeout=15).raise_for_status()

        r = requests.post(f"{API}/admin/properties/{pid}/reject",
                          json={"reason": "incomplete"}, headers=_h(admin_tok), timeout=15)
        assert r.status_code == 200, r.text
        prop = db.properties.find_one({"property_id": pid})
        verif = db.property_verifications.find_one({"property_id": pid})
        assert prop["status"] == "rejected"
        assert verif.get("admin_approved") is False
    finally:
        db.properties.delete_one({"property_id": pid})
        db.property_verifications.delete_many({"property_id": pid})


# ============== Admin approve guard (no RM approval yet) ==============
def test_admin_approve_guard(tokens, db):
    host_tok, _ = tokens["host"]
    broker_tok, _ = tokens["broker"]
    admin_tok, _ = tokens["admin"]
    pid = _make_property(host_tok, "guard")
    try:
        requests.post(f"{API}/properties/{pid}/submit-verification", headers=_h(host_tok), timeout=15).raise_for_status()
        body = {
            "checklist": {k: True for k in [
                "property_owner_verification", "ownership_verification", "property_location_verification",
                "amenities_verification", "safety_security_verification", "property_photos_verification",
                "pricing_verification", "guest_capacity_rules", "legal_compliance_verification",
                "employee_verification_declaration"]},
            "geo_tagged_photos": [{"photo_url": "https://x/y.jpg", "latitude": 19.0,
                                   "longitude": 72.8, "timestamp": "2026-01-01T10:00:00"}],
        }
        requests.post(f"{API}/broker/verifications/{pid}/submit", json=body, headers=_h(broker_tok), timeout=15).raise_for_status()
        # No RM approval yet — admin approve should 400
        r = requests.post(f"{API}/admin/properties/{pid}/approve", headers=_h(admin_tok), timeout=15)
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"
    finally:
        db.properties.delete_one({"property_id": pid})
        db.property_verifications.delete_many({"property_id": pid})


# ============== JSON body enforcement ==============
def test_employee_reject_requires_body(tokens):
    emp_tok, _ = tokens["employee"]
    r = requests.post(f"{API}/employee/verifications/verify_FAKEID/reject",
                      headers={"Authorization": f"Bearer {emp_tok}"}, timeout=15)
    assert r.status_code == 422, f"expected 422 got {r.status_code}"


def test_admin_reject_requires_body(tokens):
    admin_tok, _ = tokens["admin"]
    r = requests.post(f"{API}/admin/properties/prop_FAKEID/reject",
                      headers={"Authorization": f"Bearer {admin_tok}"}, timeout=15)
    assert r.status_code == 422


# ============== verification_id uniqueness ==============
def test_verification_id_uniqueness(tokens, db):
    host_tok, _ = tokens["host"]
    pids = []
    try:
        for i in range(5):
            pid = _make_property(host_tok, f"uniq{i}")
            pids.append(pid)
            requests.post(f"{API}/properties/{pid}/submit-verification", headers=_h(host_tok), timeout=15).raise_for_status()
        ids = [db.property_verifications.find_one({"property_id": p})["verification_id"] for p in pids]
        assert len(set(ids)) == 5, f"collisions: {ids}"
        for vid in ids:
            assert vid.startswith("verify_") and len(vid) == len("verify_") + 14
    finally:
        for p in pids:
            db.properties.delete_one({"property_id": p})
            db.property_verifications.delete_many({"property_id": p})


# ============== Broker fairness (seed 2nd broker) ==============
def test_broker_fairness(tokens, db):
    host_tok, _ = tokens["host"]
    # Temporarily clear host broker_id so load-balancing algorithm is used
    db.users.update_one({"email": "host@propnest.com"}, {"$unset": {"broker_id": ""}})
    # Temporarily deactivate third broker (vikram.singh@goldenrich.in) so only the 2 test brokers are available
    db.users.update_one({"email": "vikram.singh@goldenrich.in"}, {"$set": {"is_active": False}})
    
    # Seed second broker temporarily
    from datetime import datetime
    second = {
        "user_id": "TEST_broker2_phase14",
        "email": "TEST_broker2@propnest.com",
        "phone": "+919999999998",
        "full_name": "TEST Broker Two",
        "role": "broker",
        "is_active": True,
        "city": "Mumbai",
        "lg_code": "LG-TEST",
        "password_hash": "x",
        "created_at": datetime.utcnow(),
    }
    db.users.insert_one(second)
    pids = []
    try:
        # Submit 4 properties; auto-assign should split roughly even
        for i in range(4):
            pid = _make_property(host_tok, f"fair{i}")
            pids.append(pid)
            requests.post(f"{API}/properties/{pid}/submit-verification",
                          headers=_h(host_tok), timeout=15).raise_for_status()
        broker1_id = db.users.find_one({"email": "broker@propnest.com"})["user_id"]
        broker2_id = "TEST_broker2_phase14"
        # Pre-existing load on broker1 may be non-zero from leftover tests.
        # Fairness: broker with lower starting load should get more.
        c1 = sum(1 for p in pids if db.properties.find_one({"property_id": p}).get("broker_id") == broker1_id)
        c2 = sum(1 for p in pids if db.properties.find_one({"property_id": p}).get("broker_id") == broker2_id)
        assert c1 + c2 == 4, f"unassigned: b1={c1} b2={c2}"
        # broker2 starts with 0 in-flight, so it should get at least 2 of the 4
        assert c2 >= 2, f"load balancer not picking lower-load broker: b1={c1} b2={c2}"
    finally:
        for p in pids:
            db.properties.delete_one({"property_id": p})
            db.property_verifications.delete_many({"property_id": p})
        db.users.delete_one({"user_id": "TEST_broker2_phase14"})
        # Restore host broker_id mapping and third broker status
        db.users.update_one({"email": "host@propnest.com"}, {"$set": {"broker_id": "user_broker_propnest"}})
        db.users.update_one({"email": "vikram.singh@goldenrich.in"}, {"$set": {"is_active": True}})
