import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@propnest.com", "password": "admin123"}

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]

def _auth(t):
    return {"Authorization": f"Bearer {t}"}

def test_get_public_cms_landing():
    # 1. Fetch public CMS landing-page content
    r = requests.get(f"{API}/cms/landing-page", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "hero" in data
    assert "how_it_works" in data
    assert "testimonials" in data
    assert "blog" in data

    # Verify hero content matches schema
    hero = data["hero"]
    assert "sub_tag" in hero
    assert "title" in hero
    assert "subtitle" in hero
    assert "image_url" in hero

def test_admin_cms_workflow(admin_token):
    # 1. Fetch admin CMS documents
    r = requests.get(f"{API}/cms/admin/content?page=landing", headers=_auth(admin_token), timeout=15)
    assert r.status_code == 200
    docs = r.json().get("content", [])
    assert len(docs) > 0

    # 2. Find the Hero section document
    hero_doc = next((d for d in docs if d["section"] == "hero"), None)
    assert hero_doc is not None
    content_id = hero_doc["content_id"]

    # 3. Update the Hero section document content_data
    original_data = hero_doc["content_data"]
    updated_data = {
        **original_data,
        "title": "Elevated Luxury & Cozy Spaces",
        "subtitle": "Test subtitle update via pytest workflow"
    }

    r = requests.patch(
        f"{API}/cms/admin/content/{content_id}",
        json={"content_data": updated_data},
        headers=_auth(admin_token),
        timeout=15
    )
    assert r.status_code == 200
    assert "message" in r.json()

    # 4. Fetch public CMS landing-page again and verify the change is visible
    r = requests.get(f"{API}/cms/landing-page", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["hero"]["title"] == "Elevated Luxury & Cozy Spaces"
    assert data["hero"]["subtitle"] == "Test subtitle update via pytest workflow"

    # 5. Restore the original data
    r = requests.patch(
        f"{API}/cms/admin/content/{content_id}",
        json={"content_data": original_data},
        headers=_auth(admin_token),
        timeout=15
    )
    assert r.status_code == 200
