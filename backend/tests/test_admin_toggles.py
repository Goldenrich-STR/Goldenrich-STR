import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@propnest.com", "password": "admin123"}
HOST = {"email": "host@propnest.com", "password": "host123"}

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

@pytest.fixture(scope="module")
def host_token():
    r = requests.post(f"{API}/auth/login", json=HOST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def _auth(t):
    return {"Authorization": f"Bearer {t}"}

def test_admin_subscription_plan_toggle_workflow(admin_token, host_token):
    # 1. Fetch plans via admin endpoint
    r = requests.get(f"{API}/subscriptions/admin/plans", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "plans" in data
    plans = data["plans"]
    assert len(plans) > 0
    
    # Select first plan
    plan = plans[0]
    plan_id = plan["plan_id"]
    original_active_status = plan.get("is_active", True)
    
    # 2. Try to toggle plan status as non-admin (host) -> should fail
    r = requests.patch(f"{API}/subscriptions/admin/plans/{plan_id}/toggle", headers=_auth(host_token), timeout=15)
    assert r.status_code == 403
    
    # 3. Toggle plan status as admin -> should succeed
    r = requests.patch(f"{API}/subscriptions/admin/plans/{plan_id}/toggle", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    toggle_data = r.json()
    assert toggle_data["is_active"] == (not original_active_status)
    
    # 4. Toggle back to original status
    r = requests.patch(f"{API}/subscriptions/admin/plans/{plan_id}/toggle", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    toggle_data2 = r.json()
    assert toggle_data2["is_active"] == original_active_status

def test_admin_coupon_toggle_workflow(admin_token, host_token):
    # 1. Fetch coupons via admin endpoint
    r = requests.get(f"{API}/coupons/", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "coupons" in data
    coupons = data["coupons"]
    
    # If no coupons exist, create one
    if not coupons:
        create_payload = {
            "code": "TESTINGTOGGLE10",
            "discount_type": "percentage",
            "discount_value": 10.0,
            "coupon_type": "subscription",
            "property_id": None
        }
        r_create = requests.post(f"{API}/coupons/", json=create_payload, headers=_auth(admin_token), timeout=15)
        assert r_create.status_code == 200, r_create.text
        # Fetch again
        r = requests.get(f"{API}/coupons/", headers=_auth(admin_token), timeout=15)
        assert r.status_code == 200
        coupons = r.json()["coupons"]
        
    coupon = coupons[0]
    coupon_id = coupon["coupon_id"]
    original_active_status = coupon.get("is_active", True)
    
    # 2. Try to toggle status as non-admin (host) -> should fail
    r = requests.patch(f"{API}/coupons/admin/{coupon_id}/toggle", headers=_auth(host_token), timeout=15)
    assert r.status_code == 403
    
    # 3. Toggle status as admin -> should succeed
    r = requests.patch(f"{API}/coupons/admin/{coupon_id}/toggle", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    toggle_data = r.json()
    assert toggle_data["is_active"] == (not original_active_status)
    
    # 4. Toggle back to original status
    r = requests.patch(f"{API}/coupons/admin/{coupon_id}/toggle", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    toggle_data2 = r.json()
    assert toggle_data2["is_active"] == original_active_status
