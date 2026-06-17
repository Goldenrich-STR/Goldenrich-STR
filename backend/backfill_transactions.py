"""Phase 15 — Backfill Transaction ledger rows from pre-existing bookings,
paid registration fees and active subscriptions. Idempotent: safe to run multiple times."""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Ensure backend root on path so we can import models/services
sys.path.insert(0, str(Path(__file__).resolve().parent))

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

from models.transaction import TransactionType  # noqa
from services.account_service import record_transaction  # noqa


REGISTRATION_FEE_AMOUNT_PAISE = int(os.environ.get("REGISTRATION_FEE_AMOUNT", "50000"))


async def main():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    booking_written = 0
    async for b in db.bookings.find({"payment_status": "paid"}, {"_id": 0}):
        existing = await db.transactions.find_one({
            "type": TransactionType.BOOKING_PAYMENT.value,
            "booking_id": b["booking_id"],
        })
        if existing:
            continue
        await record_transaction(
            db,
            type=TransactionType.BOOKING_PAYMENT,
            amount=int(round(b.get("total_amount", 0) * 100)),
            razorpay_payment_id=b.get("razorpay_payment_id"),
            user_id=b.get("guest_id"),
            host_id=b.get("host_id"),
            booking_id=b["booking_id"],
            is_mock=True,
        )
        booking_written += 1

    reg_written = 0
    async for u in db.users.find({"registration_fee_paid": True}, {"_id": 0}):
        existing = await db.transactions.find_one({
            "type": TransactionType.REGISTRATION_FEE.value,
            "user_id": u["user_id"],
        })
        if existing:
            continue
        await record_transaction(
            db,
            type=TransactionType.REGISTRATION_FEE,
            amount=REGISTRATION_FEE_AMOUNT_PAISE,
            razorpay_payment_id=u.get("registration_fee_payment_id"),
            user_id=u["user_id"],
            is_mock=True,
        )
        reg_written += 1

    sub_written = 0
    async for s in db.subscriptions.find({"status": {"$in": ["active", "trial"]}}, {"_id": 0}):
        existing = await db.transactions.find_one({
            "type": TransactionType.SUBSCRIPTION.value,
            "subscription_id": s["subscription_id"],
        })
        if existing:
            continue
        plan = await db.subscription_plans.find_one({"plan_id": s.get("plan_id")}, {"_id": 0})
        if not plan:
            continue
        await record_transaction(
            db,
            type=TransactionType.SUBSCRIPTION,
            amount=int(round(plan.get("price", 0) * 100)),
            razorpay_payment_id=s.get("razorpay_subscription_id"),
            user_id=s["user_id"],
            subscription_id=s["subscription_id"],
            is_mock=True,
        )
        sub_written += 1

    logger.info(
        f"Backfill complete: bookings={booking_written}, registration_fees={reg_written}, subscriptions={sub_written}"
    )
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
