"""Phase 11 — Booking-confirmed + soft-lock reminder notification triggers."""
import asyncio
import os
import sys
import time
from datetime import date, datetime, timedelta

import pytest
import requests

# Allow direct service imports
sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402
from services.razorpay_service import razorpay_service  # noqa: E402
from services.booking_notifications import _soft_lock_reminder_task  # noqa: E402

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "propnest_db")

GUEST = {"email": "guest@propnest.com", "password": "guest123"}
HOST = {"email": "host@propnest.com", "password": "host123"}

PROPERTY_IDS = [
    "prop_demo_3_1778066214",
    "prop_demo_4_1778066214",
    "prop_demo_2_1778066214",
    "prop_demo_1_1778066214",
    "prop_demo_5_1778066214",
]

BACKEND_LOG = "/var/log/supervisor/backend.err.log"


# ------------------------- fixtures ----------------------------

@pytest.fixture(scope="module")
def guest_token():
    r = requests.post(f"{API}/auth/login", json=GUEST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def host_token():
    r = requests.post(f"{API}/auth/login", json=HOST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def host_user_id():
    r = requests.post(f"{API}/auth/login", json=HOST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["user"]["user_id"]


@pytest.fixture(scope="module")
def guest_user_id():
    r = requests.post(f"{API}/auth/login", json=GUEST, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["user"]["user_id"]


@pytest.fixture
def db():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _auth(t):
    return {"Authorization": f"Bearer {t}"}


# Create soft-lock booking (retries forward through future windows on 409)
def _create_booking(token, attempts=80, base_offset=1500):
    today = date.today()
    last_err = None
    # Cycle through several properties to multiply free windows
    for prop in PROPERTY_IDS:
        for i in range(attempts):
            ci = today + timedelta(days=base_offset + i * 4)
            co = ci + timedelta(days=2)
            payload = {
                "property_id": prop,
                "check_in_date": ci.isoformat(),
                "check_out_date": co.isoformat(),
                "number_of_guests": 2,
            }
            r = requests.post(f"{API}/bookings/", json=payload, headers=_auth(token), timeout=15)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 409:
                continue
            last_err = (r.status_code, r.text)
    pytest.fail(f"Could not create booking after retries; last={last_err}")


def _read_log_tail(bytes_back=200_000):
    try:
        size = os.path.getsize(BACKEND_LOG)
        with open(BACKEND_LOG, "rb") as f:
            f.seek(max(0, size - bytes_back))
            return f.read().decode("utf-8", errors="replace")
    except FileNotFoundError:
        return ""


# ============================================================
# 1. Soft-lock reminder is scheduled on booking creation
# ============================================================
class TestReminderScheduling:
    def test_create_booking_logs_reminder_scheduled(self, guest_token):
        booking = _create_booking(guest_token)
        bid = booking["booking_id"]
        # Scheduling is synchronous (logger.info inside schedule_soft_lock_reminder)
        time.sleep(0.5)
        log = _read_log_tail()
        marker = f"Soft-lock reminder scheduled for {bid}"
        assert marker in log, f"Expected scheduling log for {bid} not found"
        # Extract '... in {N}s' and check it's roughly 480 (10min - 2min buffer)
        import re

        m = re.search(rf"Soft-lock reminder scheduled for {re.escape(bid)} in (\d+)s", log)
        assert m, "Could not extract delay seconds from log"
        delay = int(m.group(1))
        assert 470 <= delay <= 481, f"Expected delay ~479s, got {delay}"


# ============================================================
# 2. mock-pay triggers host (3 channels) + guest (in_app) notifs
# ============================================================
class TestMockPayNotifications:
    @pytest.mark.asyncio
    async def test_mock_pay_creates_host_and_guest_notifications(
        self, guest_token, host_user_id, guest_user_id, db
    ):
        booking = _create_booking(guest_token)
        bid = booking["booking_id"]

        # Snapshot existing counts so test is robust to prior runs
        before_host = await db.notifications.count_documents(
            {"user_id": host_user_id, "type": "new_booking_received"}
        )
        before_guest = await db.notifications.count_documents(
            {"user_id": guest_user_id, "type": "booking_confirmed"}
        )

        r = requests.post(
            f"{API}/bookings/{bid}/mock-pay", headers=_auth(guest_token), timeout=20
        )
        assert r.status_code == 200, r.text

        # async create_task -> wait briefly for completion
        for _ in range(20):
            await asyncio.sleep(0.5)
            after_host = await db.notifications.count_documents(
                {"user_id": host_user_id, "type": "new_booking_received"}
            )
            if after_host >= before_host + 3:
                break

        # Host: 3 new rows total across {sms, whatsapp, in_app}
        assert after_host - before_host >= 3, (
            f"Expected >=3 new host notifications, got {after_host - before_host}"
        )

        host_channels = set()
        async for doc in db.notifications.find(
            {
                "user_id": host_user_id,
                "type": "new_booking_received",
                "data.booking_id": bid,
            },
            {"_id": 0},
        ):
            host_channels.add(doc.get("channel"))
        assert {"sms", "whatsapp", "in_app"}.issubset(host_channels), (
            f"Host channels missing required set; got {host_channels}"
        )

        # Guest: at least one in_app booking_confirmed row
        after_guest = await db.notifications.count_documents(
            {"user_id": guest_user_id, "type": "booking_confirmed"}
        )
        assert after_guest >= before_guest + 1

        guest_inapp = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_confirmed",
                "channel": "in_app",
                "data.booking_id": bid,
            }
        )
        assert guest_inapp >= 1, "Expected guest in_app booking_confirmed row"

        # Backend logs include DEMO + MOCK EMAIL lines
        log = _read_log_tail()
        assert "[DEMO] WhatsApp to" in log
        assert "[DEMO] SMS to" in log
        assert "[MOCK EMAIL]" in log
        assert "New booking" in log  # email subject for host


# ============================================================
# 3. confirm-payment path triggers same notifications
# ============================================================
class TestConfirmPaymentNotifications:
    @pytest.mark.asyncio
    async def test_confirm_payment_creates_host_notifications(
        self, guest_token, host_user_id, db
    ):
        booking = _create_booking(guest_token)
        bid = booking["booking_id"]
        order_id = booking["razorpay_order_id"]
        mock = razorpay_service.mock_complete_payment(order_id)

        before_host = await db.notifications.count_documents(
            {"user_id": host_user_id, "type": "new_booking_received"}
        )

        payload = {
            "booking_id": bid,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": mock["razorpay_payment_id"],
            "razorpay_signature": mock["razorpay_signature"],
        }
        r = requests.post(
            f"{API}/bookings/confirm-payment",
            json=payload,
            headers=_auth(guest_token),
            timeout=20,
        )
        assert r.status_code == 200, r.text

        # Wait for async background task
        after_host = before_host
        for _ in range(20):
            await asyncio.sleep(0.5)
            after_host = await db.notifications.count_documents(
                {
                    "user_id": host_user_id,
                    "type": "new_booking_received",
                    "data.booking_id": bid,
                }
            )
            if after_host >= 3:
                break

        assert after_host >= 3, (
            f"Expected >=3 host notifs for confirm-payment booking, got {after_host}"
        )


# ============================================================
# 4-6. Reminder task: fires when valid; no-op on confirmed; no-op past expiry
# ============================================================
class TestSoftLockReminderTask:
    @pytest.mark.asyncio
    async def test_reminder_task_fires_when_softlock_valid(
        self, guest_token, guest_user_id, db
    ):
        booking = _create_booking(guest_token)
        bid = booking["booking_id"]

        # Confirm fresh soft_lock_expires_at >2min in future
        b = await db.bookings.find_one({"booking_id": bid}, {"_id": 0})
        assert b["booking_status"] == "soft_lock"
        assert b["soft_lock_expires_at"] > datetime.utcnow() + timedelta(minutes=2)

        before = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            }
        )

        # Direct invocation with delay=1
        await _soft_lock_reminder_task(db, bid, 1)

        after = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            }
        )
        assert after - before >= 3, f"Expected 3 reminder notifs, got {after - before}"

        channels = set()
        async for doc in db.notifications.find(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            },
            {"_id": 0},
        ):
            channels.add(doc.get("channel"))
        assert {"in_app", "whatsapp", "sms"}.issubset(channels)

        # Note: when invoked directly in test process the [MOCK EMAIL]
        # log goes to pytest stderr, not supervisor's err.log. The DB rows
        # above are the authoritative proof. We do an opportunistic check.
        log = _read_log_tail()
        # Just smoke-check that DEMO channel logs exist in general
        assert "[DEMO]" in log or "[MOCK EMAIL]" in log

    @pytest.mark.asyncio
    async def test_reminder_noop_when_confirmed(self, guest_token, guest_user_id, db):
        booking = _create_booking(guest_token)
        bid = booking["booking_id"]

        # Confirm via mock-pay
        r = requests.post(
            f"{API}/bookings/{bid}/mock-pay", headers=_auth(guest_token), timeout=20
        )
        assert r.status_code == 200

        before = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            }
        )
        await _soft_lock_reminder_task(db, bid, 0)
        after = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            }
        )
        assert after == before, "Reminder should be no-op for confirmed booking"

    @pytest.mark.asyncio
    async def test_reminder_noop_when_lock_expired(
        self, guest_token, guest_user_id, db
    ):
        booking = _create_booking(guest_token)
        bid = booking["booking_id"]
        # Force expiry into the past
        await db.bookings.update_one(
            {"booking_id": bid},
            {"$set": {"soft_lock_expires_at": datetime.utcnow() - timedelta(minutes=1)}},
        )
        before = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            }
        )
        await _soft_lock_reminder_task(db, bid, 0)
        after = await db.notifications.count_documents(
            {
                "user_id": guest_user_id,
                "type": "booking_pending_payment",
                "data.booking_id": bid,
            }
        )
        assert after == before, "Reminder should be no-op for expired soft-lock"


# ============================================================
# 7. /api/notifications/my-notifications surfaces new in-app rows for host
# ============================================================
class TestNotificationsAPI:
    def test_host_my_notifications_increases_after_confirmed_booking(
        self, guest_token, host_token
    ):
        before = requests.get(
            f"{API}/notifications/my-notifications",
            headers=_auth(host_token),
            timeout=15,
        )
        assert before.status_code == 200, before.text
        before_total = before.json().get("total", 0)

        booking = _create_booking(guest_token)
        bid = booking["booking_id"]
        r = requests.post(
            f"{API}/bookings/{bid}/mock-pay", headers=_auth(guest_token), timeout=20
        )
        assert r.status_code == 200

        # Wait briefly for async notif insertion
        new_total = before_total
        for _ in range(20):
            time.sleep(0.5)
            after = requests.get(
                f"{API}/notifications/my-notifications",
                headers=_auth(host_token),
                timeout=15,
            )
            assert after.status_code == 200
            new_total = after.json().get("total", 0)
            if new_total > before_total:
                break

        assert new_total > before_total, (
            f"Host total notifications should increase: before={before_total} after={new_total}"
        )
