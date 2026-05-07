"""Phase 13 — Host listing creation flow regression suite.

Covers:
- POST /api/upload/image (auth, content-type, size, success)
- GET  /api/uploads/<filename> (StaticFiles)
- GET  /api/auth/me  (profile minus secrets)
- POST /api/subscriptions/registration-fee  (mock order)
- POST /api/subscriptions/registration-fee/mock-pay  (idempotent demo pay)
- POST /api/subscriptions/confirm-registration-fee  (Pydantic body + mock signature)
- Property creation property_id uniqueness (uuid4 factory)
- POST /api/properties/{id}/submit-verification  (regression)
"""
import os
import io
import struct
import zlib
import requests
import pytest

def _backend_url() -> str:
    url = os.environ.get("REACT_APP_BACKEND_URL")
    if url:
        return url.rstrip("/")
    # fallback: read from /app/frontend/.env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    return line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass
    raise RuntimeError("REACT_APP_BACKEND_URL not set")


def _load_backend_env():
    """Read /app/backend/.env to pick up MONGO_URL/DB_NAME for direct mongo cleanup."""
    try:
        with open("/app/backend/.env") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                v = v.strip().strip('"').strip("'")
                os.environ.setdefault(k.strip(), v)
    except Exception:
        pass


_load_backend_env()
BASE_URL = _backend_url()
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "propnest_db")
API = f"{BASE_URL}/api"

HOST_EMAIL = "host@propnest.com"
HOST_PASSWORD = "host123"


# ---------- helpers ----------

def _login(email: str, password: str) -> str:
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def _tiny_png_bytes() -> bytes:
    """Build a minimal valid 1x1 PNG without external libs."""
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0))
    raw = b"\x00\xff\x00\x00"  # filter byte + RGB pixel
    idat = chunk(b"IDAT", zlib.compress(raw))
    iend = chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


# ---------- fixtures ----------

@pytest.fixture(scope="module")
def host_token():
    return _login(HOST_EMAIL, HOST_PASSWORD)


@pytest.fixture(scope="module")
def host_headers(host_token):
    return {"Authorization": f"Bearer {host_token}"}


@pytest.fixture
def reset_registration_fee(host_headers):
    """Reset host's registration_fee_paid flag to False for the negative tests."""
    # set False
    requests.patch  # noqa  -- placeholder; we use Mongo directly
    from pymongo import MongoClient
    mongo = MongoClient(MONGO_URL)
    db = mongo[DB_NAME]
    db.users.update_one({"email": HOST_EMAIL}, {"$set": {"registration_fee_paid": False}})
    yield
    # leave whatever state the test ended in


# ---------- Upload image ----------

class TestUploadImage:
    def test_upload_png_success(self, host_headers):
        files = {"file": ("tiny.png", _tiny_png_bytes(), "image/png")}
        r = requests.post(f"{API}/upload/image", headers=host_headers, files=files, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["filename"].endswith(".png")
        assert "/api/uploads/" in data["url"]
        assert data["size"] > 0
        assert data["content_type"] == "image/png"
        # server-side file fetch
        url = data["url"]
        if url.startswith("/"):
            url = BASE_URL + url
        s = requests.get(url, timeout=15)
        assert s.status_code == 200
        assert s.content[:8] == b"\x89PNG\r\n\x1a\n"
        assert len(s.content) == data["size"]

    def test_upload_rejects_txt(self, host_headers):
        files = {"file": ("note.txt", b"hello world", "text/plain")}
        r = requests.post(f"{API}/upload/image", headers=host_headers, files=files, timeout=15)
        assert r.status_code == 400
        assert "Unsupported" in r.text or "type" in r.text.lower()

    def test_upload_rejects_too_large(self, host_headers):
        big = b"\x00" * (8 * 1024 * 1024 + 16)  # 8MB + 16 bytes
        files = {"file": ("big.png", big, "image/png")}
        r = requests.post(f"{API}/upload/image", headers=host_headers, files=files, timeout=30)
        assert r.status_code == 413, f"expected 413 got {r.status_code} {r.text[:200]}"

    def test_upload_requires_auth(self):
        files = {"file": ("tiny.png", _tiny_png_bytes(), "image/png")}
        r = requests.post(f"{API}/upload/image", files=files, timeout=15)
        assert r.status_code in (401, 403), f"expected 401/403 got {r.status_code}"


# ---------- /auth/me ----------

class TestAuthMe:
    def test_me_returns_profile(self, host_headers):
        r = requests.get(f"{API}/auth/me", headers=host_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == HOST_EMAIL
        assert "full_name" in data
        assert "registration_fee_paid" in data
        # secrets must be stripped
        assert "password_hash" not in data
        assert "registration_fee_payment_id" not in data

    def test_me_requires_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=15)
        assert r.status_code in (401, 403)


# ---------- Registration fee flow ----------

class TestRegistrationFee:
    def test_create_order_and_full_mock_flow(self, host_headers, reset_registration_fee):
        # 1. Create order
        r = requests.post(f"{API}/subscriptions/registration-fee", headers=host_headers, timeout=15)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["amount"] == 50000
        assert order["currency"] == "INR"
        assert order["is_mock"] is True
        assert "razorpay_order_id" in order
        assert "razorpay_key_id" in order
        order_id = order["razorpay_order_id"]

        # 2. mock-pay (idempotent path) — use query param per signature
        r2 = requests.post(
            f"{API}/subscriptions/registration-fee/mock-pay",
            headers=host_headers,
            params={"razorpay_order_id": order_id},
            timeout=15,
        )
        assert r2.status_code == 200, r2.text
        m = r2.json()
        assert m.get("trial_activated") is True

        # 3. /auth/me reflects paid
        me = requests.get(f"{API}/auth/me", headers=host_headers, timeout=15).json()
        assert me["registration_fee_paid"] is True

        # 4. mock-pay again — idempotent 200
        r3 = requests.post(
            f"{API}/subscriptions/registration-fee/mock-pay",
            headers=host_headers,
            params={"razorpay_order_id": order_id},
            timeout=15,
        )
        assert r3.status_code == 200, r3.text

        # 5. create-order now returns 200 with already_paid:true (idempotent — Phase 18)
        r4 = requests.post(f"{API}/subscriptions/registration-fee", headers=host_headers, timeout=15)
        assert r4.status_code == 200, r4.text
        assert r4.json().get("already_paid") is True

    def test_confirm_registration_fee_with_pydantic_body(self, host_headers):
        # reset flag
        from pymongo import MongoClient
        mongo = MongoClient(MONGO_URL)
        db = mongo[DB_NAME]
        db.users.update_one({"email": HOST_EMAIL}, {"$set": {"registration_fee_paid": False}})

        # create order
        order = requests.post(
            f"{API}/subscriptions/registration-fee", headers=host_headers, timeout=15
        ).json()
        order_id = order["razorpay_order_id"]

        # use razorpay_service directly to build matching mock signature
        import sys, pathlib
        sys.path.insert(0, str(pathlib.Path("/app/backend")))
        from services.razorpay_service import razorpay_service
        sig_bundle = razorpay_service.mock_complete_payment(order_id)

        body = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": sig_bundle["razorpay_payment_id"],
            "razorpay_signature": sig_bundle["razorpay_signature"],
        }
        r = requests.post(
            f"{API}/subscriptions/confirm-registration-fee",
            headers=host_headers,
            json=body,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        body_out = r.json()
        assert body_out["trial_activated"] is True

        # GET /auth/me confirms persisted
        me = requests.get(f"{API}/auth/me", headers=host_headers, timeout=15).json()
        assert me["registration_fee_paid"] is True

        # invalid signature -> 400 (reset flag first since prior confirm flipped it true,
        # which would otherwise trigger the idempotent already_paid short-circuit)
        db.users.update_one({"email": HOST_EMAIL}, {"$set": {"registration_fee_paid": False}})
        bad = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": "pay_bogus",
            "razorpay_signature": "deadbeef",
        }
        rb = requests.post(
            f"{API}/subscriptions/confirm-registration-fee",
            headers=host_headers,
            json=bad,
            timeout=15,
        )
        assert rb.status_code == 400, rb.text


# ---------- Property uuid4 + submit-verification ----------

class TestPropertyIdUuid4AndSubmit:
    @staticmethod
    def _payload(seed: int) -> dict:
        return {
            "title": f"TEST_phase13_uuid_listing_{seed}_for_uniqueness",
            "description": "TEST phase13 description that is definitely longer than thirty characters.",
            "property_type": "apartment",
            "category": "residential",
            "bhk_type": "2bhk",
            "address": "123 TEST Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pin_code": "400001",
            "area_sqft": 800,
            "price_per_night": 2500.0,
            "minimum_stay_days": 1,
            "amenities": ["wifi"],
            "images": ["https://example.com/img.png"],
        }

    def test_property_ids_unique_uuid4(self, host_headers):
        ids = []
        created = []
        try:
            for i in range(5):
                r = requests.post(
                    f"{API}/properties/", headers=host_headers, json=self._payload(i), timeout=15
                )
                assert r.status_code == 200, r.text
                pid = r.json()["property_id"]
                ids.append(pid)
                created.append(pid)
            assert len(set(ids)) == 5, f"property_ids not unique: {ids}"
            for pid in ids:
                assert pid.startswith("prop_") and len(pid) >= 18
        finally:
            # cleanup
            from pymongo import MongoClient
            mongo = MongoClient(MONGO_URL)
            db = mongo[DB_NAME]
            if created:
                db.properties.delete_many({"property_id": {"$in": created}})

    def test_submit_verification_flips_status(self, host_headers):
        created = None
        try:
            r = requests.post(
                f"{API}/properties/", headers=host_headers, json=self._payload(99), timeout=15
            )
            assert r.status_code == 200, r.text
            pid = r.json()["property_id"]
            created = pid
            assert r.json()["status"] in ("draft", "pending_verification")

            sv = requests.post(
                f"{API}/properties/{pid}/submit-verification",
                headers=host_headers,
                timeout=15,
            )
            assert sv.status_code == 200, sv.text

            g = requests.get(f"{API}/properties/{pid}", headers=host_headers, timeout=15)
            assert g.status_code == 200, g.text
            assert g.json()["status"] == "pending_verification"
        finally:
            if created:
                from pymongo import MongoClient
                mongo = MongoClient(MONGO_URL)
                db = mongo[DB_NAME]
                db.properties.delete_one({"property_id": created})
