"""Phase 12 — Soft-lock reaper + reminder recovery tests.

These tests directly manipulate `db.bookings` to insert curated soft_lock
documents with arbitrary `soft_lock_expires_at`, then call the reaper
helpers and assert the database mutations.

The mocked Razorpay/MSG91/SendGrid integrations are not exercised here —
the reaper does pure DB mutations.
"""
import os
import sys
import uuid
from datetime import datetime, timedelta

import pytest

# Allow service imports
sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from services.soft_lock_reaper import (  # noqa: E402
    reap_expired_soft_locks,
    recover_pending_reminders,
)
from services.booking_notifications import _soft_lock_reminder_task  # noqa: E402

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "propnest_db")

BACKEND_LOG = "/var/log/supervisor/backend.err.log"


# ----------------------- helpers / fixtures -----------------------

@pytest.fixture
def db():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def _mk_booking_doc(
    expires_in_seconds: int,
    *,
    status: str = "soft_lock",
    reminder_sent: bool = False,
    guest_id: str = "TEST_guest",
    host_id: str = "TEST_host",
    property_id: str = "TEST_property",
) -> dict:
    """Build a minimal booking document for reaper testing."""
    bid = f"TESTBK{uuid.uuid4().hex[:10].upper()}"
    now = datetime.utcnow()
    return {
        "booking_id": bid,
        "property_id": property_id,
        "guest_id": guest_id,
        "host_id": host_id,
        "check_in_date": (datetime.utcnow().date() + timedelta(days=2000)).isoformat(),
        "check_out_date": (datetime.utcnow().date() + timedelta(days=2002)).isoformat(),
        "number_of_guests": 2,
        "base_amount": 1000.0,
        "service_fee": 0.0,
        "taxes": 0.0,
        "total_amount": 1000.0,
        "payment_status": "pending",
        "booking_status": status,
        "cancellation_policy": "moderate",
        "security_deposit": 0.0,
        "security_deposit_refunded": False,
        "created_at": now,
        "updated_at": now,
        "soft_lock_expires_at": now + timedelta(seconds=expires_in_seconds),
        "soft_lock_reminder_sent": reminder_sent,
    }


async def _cleanup_test_bookings(db):
    await db.bookings.delete_many({"booking_id": {"$regex": "^TESTBK"}})
    await db.blocked_dates.delete_many({"source_id": {"$regex": "^TESTBK"}})


def _read_log_tail(bytes_back=400_000) -> str:
    content_str = ""
    for path in [BACKEND_LOG, "backend_server.log", "backend/backend_server.log", "../backend_server.log"]:
        try:
            size = os.path.getsize(path)
            with open(path, "rb") as f:
                f.seek(max(0, size - bytes_back))
                content = f.read()
                if content.startswith(b'\xff\xfe') or content.startswith(b'\xfe\xff'):
                    content_str = content.decode('utf-16', errors='replace')
                elif b'\x00' in content and content.count(b'\x00') > len(content) // 3:
                    content_str = content.decode('utf-16', errors='replace')
                else:
                    content_str = content.decode('utf-8', errors='replace')
                break
        except FileNotFoundError:
            continue
    return content_str


# ============================================================
# 1. Startup log markers (already produced on supervisor restart)
# ============================================================
class TestStartupLogs:
    def test_startup_log_markers_present(self):
        log = _read_log_tail()
        assert "indexes ensured" in log, "Missing 'indexes ensured' log"
        assert "Soft-lock reaper started" in log, (
            "Missing reaper started log"
        )


# ============================================================
# 2. reap_expired_soft_locks() helper — direct invocation
# ============================================================
class TestReapHelper:
    @pytest.mark.asyncio
    async def test_reap_cancels_three_expired_softlocks(self, db):
        await _cleanup_test_bookings(db)
        try:
            docs = [_mk_booking_doc(-60) for _ in range(3)]
            await db.bookings.insert_many(docs)
            ids = [d["booking_id"] for d in docs]

            count = await reap_expired_soft_locks(db)
            assert count >= 3, f"Expected reaper to cancel >=3, got {count}"

            for bid in ids:
                fetched = await db.bookings.find_one({"booking_id": bid}, {"_id": 0})
                assert fetched["booking_status"] == "cancelled"
                assert fetched.get("cancellation_reason") == "soft_lock_expired"
                assert fetched.get("cancelled_at") is not None
                assert fetched.get("updated_at") is not None
        finally:
            await _cleanup_test_bookings(db)

    @pytest.mark.asyncio
    async def test_reap_safety_future_softlock_not_touched(self, db):
        await _cleanup_test_bookings(db)
        try:
            doc = _mk_booking_doc(600)  # 10 min future
            await db.bookings.insert_one(doc)
            await reap_expired_soft_locks(db)
            fetched = await db.bookings.find_one(
                {"booking_id": doc["booking_id"]}, {"_id": 0}
            )
            assert fetched["booking_status"] == "soft_lock"
            assert "cancelled_at" not in fetched or fetched.get("cancelled_at") is None
        finally:
            await _cleanup_test_bookings(db)

    @pytest.mark.asyncio
    async def test_reap_safety_confirmed_and_cancelled_not_touched(self, db):
        await _cleanup_test_bookings(db)
        try:
            confirmed = _mk_booking_doc(-3600, status="confirmed")
            cancelled = _mk_booking_doc(-3600, status="cancelled")
            await db.bookings.insert_many([confirmed, cancelled])
            await reap_expired_soft_locks(db)

            c = await db.bookings.find_one(
                {"booking_id": confirmed["booking_id"]}, {"_id": 0}
            )
            x = await db.bookings.find_one(
                {"booking_id": cancelled["booking_id"]}, {"_id": 0}
            )
            assert c["booking_status"] == "confirmed"
            assert x["booking_status"] == "cancelled"
            # cancellation_reason must NOT be the reaper's reason
            assert c.get("cancellation_reason") != "soft_lock_expired"
            assert x.get("cancellation_reason") != "soft_lock_expired"
        finally:
            await _cleanup_test_bookings(db)

    @pytest.mark.asyncio
    async def test_reap_deletes_associated_blocked_dates(self, db):
        await _cleanup_test_bookings(db)
        try:
            doc = _mk_booking_doc(-120)
            await db.bookings.insert_one(doc)
            # Insert a fake booking-source blocked_dates entry tied to this booking
            await db.blocked_dates.insert_one(
                {
                    "blocked_date_id": f"bd_{uuid.uuid4().hex[:10]}",
                    "property_id": doc["property_id"],
                    "start_date": doc["check_in_date"],
                    "end_date": doc["check_out_date"],
                    "source": "booking",
                    "source_id": doc["booking_id"],
                    "created_at": datetime.utcnow(),
                }
            )

            await reap_expired_soft_locks(db)
            remaining = await db.blocked_dates.count_documents(
                {"source": "booking", "source_id": doc["booking_id"]}
            )
            assert remaining == 0, "Reaper should have deleted booking-source blocked_dates"
        finally:
            await _cleanup_test_bookings(db)


# ============================================================
# 3. recover_pending_reminders() helper
# ============================================================
class TestRecoverReminders:
    @pytest.mark.asyncio
    async def test_recover_returns_count_for_eligible_bookings(self, db):
        await _cleanup_test_bookings(db)
        try:
            # Eligible: future-expiry, reminder not yet sent
            eligible = [_mk_booking_doc(700, reminder_sent=False) for _ in range(2)]
            # Ineligible: already reminder_sent
            ineligible_sent = _mk_booking_doc(700, reminder_sent=True)
            # Ineligible: past expiry
            ineligible_expired = _mk_booking_doc(-60, reminder_sent=False)
            await db.bookings.insert_many(
                eligible + [ineligible_sent, ineligible_expired]
            )

            count = await recover_pending_reminders(db)
            assert count >= 2, (
                f"Expected at least 2 reminders rescheduled, got {count}"
            )
        finally:
            await _cleanup_test_bookings(db)

    @pytest.mark.asyncio
    async def test_recover_skips_already_sent(self, db):
        await _cleanup_test_bookings(db)
        try:
            doc = _mk_booking_doc(700, reminder_sent=True)
            await db.bookings.insert_one(doc)
            count = await recover_pending_reminders(db)
            # Should not reschedule the already-sent one (count may include other
            # live soft_locks in DB but our doc must NOT contribute).
            # Validate by checking flag remains True and no change.
            fetched = await db.bookings.find_one(
                {"booking_id": doc["booking_id"]}, {"_id": 0}
            )
            assert fetched["soft_lock_reminder_sent"] is True
            assert isinstance(count, int)
        finally:
            await _cleanup_test_bookings(db)


# ============================================================
# 4. Reminder dedup via _soft_lock_reminder_task
# ============================================================
class TestReminderDedup:
    @pytest.mark.asyncio
    async def test_reminder_task_dedups_on_second_invocation(self, db):
        await _cleanup_test_bookings(db)
        try:
            # We need a real guest user for notifications side-effects.
            guest = await db.users.find_one(
                {"email": "guest@propnest.com"}, {"_id": 0}
            )
            assert guest, "Seed guest@propnest.com missing"
            doc = _mk_booking_doc(
                600, guest_id=guest["user_id"]
            )
            await db.bookings.insert_one(doc)
            bid = doc["booking_id"]

            before = await db.notifications.count_documents(
                {
                    "user_id": guest["user_id"],
                    "type": "booking_pending_payment",
                    "data.booking_id": bid,
                }
            )

            # First call: should fire and set reminder_sent=True
            await _soft_lock_reminder_task(db, bid, 0)

            after_first = await db.notifications.count_documents(
                {
                    "user_id": guest["user_id"],
                    "type": "booking_pending_payment",
                    "data.booking_id": bid,
                }
            )
            assert after_first - before >= 3, (
                f"Expected >=3 reminder rows on first call, got {after_first - before}"
            )

            fetched = await db.bookings.find_one({"booking_id": bid}, {"_id": 0})
            assert fetched["soft_lock_reminder_sent"] is True
            assert fetched.get("soft_lock_reminder_sent_at") is not None

            # Second call: must be a no-op
            await _soft_lock_reminder_task(db, bid, 0)
            after_second = await db.notifications.count_documents(
                {
                    "user_id": guest["user_id"],
                    "type": "booking_pending_payment",
                    "data.booking_id": bid,
                }
            )
            assert after_second == after_first, (
                "Second reminder invocation must not produce new notifications "
                f"(before_dedup={after_first}, after_dedup={after_second})"
            )
        finally:
            await _cleanup_test_bookings(db)


# ============================================================
# 5. Live invariant: no soft_lock with past expiry should exist on a healthy server
# ============================================================
class TestLiveInvariants:
    @pytest.mark.asyncio
    async def test_no_soft_lock_with_past_expiry_in_db(self, db):
        # The live reaper sweeps every 30s; this assertion gives it a small grace
        # window. If something is stuck, this test highlights it.
        import asyncio as _aio

        # Wait up to 35s for any stale soft_locks to be reaped
        for _ in range(8):
            stale = await db.bookings.count_documents(
                {
                    "booking_status": "soft_lock",
                    "soft_lock_expires_at": {"$lte": datetime.utcnow()},
                }
            )
            if stale == 0:
                break
            await _aio.sleep(5)
        assert stale == 0, (
            f"Found {stale} soft_lock bookings whose expiry is in the past; "
            "reaper is not keeping the DB clean."
        )
