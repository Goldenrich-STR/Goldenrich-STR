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

def test_create_commercial_plan_with_sqft_range(admin_token):
    # Create commercial plan with sqft_range and price_annual as 0
    params = {
        "plan_name": "Commercial Standard Small",
        "plan_type": "commercial",
        "price_monthly": 1500.0,
        "price_annual": 0.0,
        "description": "Standard commercial plan for small spaces",
        "validity_days": 30,
        "sqft_range": "small"
    }
    r = requests.post(f"{API}/subscriptions/admin/plans", params=params, headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    create_data = r.json()
    assert "plan_id" in create_data
    plan_id = create_data["plan_id"]

    # Verify plan was created with the correct sqft_range
    r = requests.get(f"{API}/subscriptions/admin/plans", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text
    plans = r.json()["plans"]
    created_plan = next((p for p in plans if p["plan_id"] == plan_id), None)
    assert created_plan is not None
    assert created_plan["sqft_range"] == "small"
    assert created_plan["price_annual"] == 0.0

    # Delete the created plan to clean up
    r = requests.delete(f"{API}/subscriptions/admin/plans/{plan_id}", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200, r.text

