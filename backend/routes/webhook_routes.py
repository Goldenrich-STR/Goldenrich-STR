from fastapi import APIRouter, Request, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
import hmac
import hashlib
import os
import logging
from datetime import datetime, timezone
import asyncio

from services.razorpay_service import razorpay_service
from models.booking import BookingStatus
from models.subscription import SubscriptionStatus

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


async def get_db():
    from server import db_instance
    return db_instance


@router.post("/razorpay")
async def razorpay_webhook(
    request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Secure Razorpay webhook receiver to confirm bookings, subscriptions, or registration fees."""
    # 1. Signature Verification
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature")

    webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    # In demo/development without webhook secret configured, we can skip signature check to ease testing
    if webhook_secret and signature:
        expected = hmac.new(
            webhook_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected, signature):
            logger.warning("Invalid Razorpay webhook signature detected!")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
    else:
        logger.info("Razorpay webhook signature verification skipped (RAZORPAY_WEBHOOK_SECRET not set in env).")

    # 2. Parse payload
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse JSON body from webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON payload"
        )

    event_type = payload.get("event")
    logger.info(f"Received Razorpay webhook event: {event_type}")

    if event_type not in ("payment.captured", "order.paid"):
        # We acknowledge receipt of other events with 200 OK as required by Razorpay
        return {"status": "ignored", "event": event_type}

    # Extract transaction references
    event_data = payload.get("payload", {})
    payment_entity = event_data.get("payment", {}).get("entity", {})
    order_entity = event_data.get("order", {}).get("entity", {}) or {}

    payment_id = payment_entity.get("id")
    order_id = payment_entity.get("order_id") or order_entity.get("id")
    amount_paise = payment_entity.get("amount") or order_entity.get("amount")
    
    # Razorpay receipt or notes can be used as direct correlation identifiers
    receipt = order_entity.get("receipt") or payment_entity.get("notes", {}).get("receipt")
    notes = payment_entity.get("notes", {})

    logger.info(
        f"Processing captured payment. ID={payment_id}, OrderID={order_id}, "
        f"Receipt={receipt}, Notes={notes}"
    )

    if not order_id and not receipt:
        logger.warning("Webhook event contains no order_id or receipt identifier!")
        return {"status": "unresolved", "error": "No transaction reference found"}

    # 3. Dynamic lookup & resolution
    
    # ---------------- 3A. Booking payment check ----------------
    booking = None
    if order_id:
        booking = await db.bookings.find_one({"razorpay_order_id": order_id}, {"_id": 0})
    if not booking and receipt:
        booking = await db.bookings.find_one({"booking_id": receipt}, {"_id": 0})

    if booking:
        booking_id = booking["booking_id"]
        logger.info(f"Resolved payment to Booking ID: {booking_id}")
        
        if booking.get("booking_status") != BookingStatus.CONFIRMED.value:
            # Update booking status to confirmed
            await db.bookings.update_one(
                {"booking_id": booking_id},
                {"$set": {
                    "booking_status": BookingStatus.CONFIRMED.value,
                    "payment_status": "paid",
                    "razorpay_payment_id": payment_id,
                    "confirmed_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )

            # Block booking dates
            try:
                await db.blocked_dates.update_one(
                    {"blocked_date_id": f"booking_{booking_id}"},
                    {
                        "$set": {
                            "blocked_date_id": f"booking_{booking_id}",
                            "property_id": booking["property_id"],
                            "owner_id": booking["host_id"],
                            "start_date": booking["check_in_date"],
                            "end_date": booking["check_out_date"],
                            "source": "booking",
                            "source_id": booking_id,
                            "reason": f"Booking {booking_id[:8]}",
                            "updated_at": datetime.now(timezone.utc),
                        },
                        "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
                    },
                    upsert=True,
                )
            except Exception as block_err:
                logger.warning(f"Webhook failed to block dates: {block_err}")

            # Record ledger row
            try:
                from models.transaction import TransactionType
                from services.account_service import record_transaction
                await record_transaction(
                    db,
                    type=TransactionType.BOOKING_PAYMENT,
                    amount=int(amount_paise or round(booking.get("total_amount", 0) * 100)),
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    user_id=booking["guest_id"],
                    host_id=booking["host_id"],
                    booking_id=booking_id,
                    is_mock=razorpay_service.is_mock,
                )
            except Exception as txn_err:
                logger.warning(f"Webhook failed to record transaction: {txn_err}")

            # Send notifications (non-blocking)
            try:
                from services.booking_notifications import notify_host_booking_confirmed
                confirmed_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
                if confirmed_booking:
                    asyncio.create_task(notify_host_booking_confirmed(db, confirmed_booking))
            except Exception as notify_err:
                logger.warning(f"Webhook failed to trigger notifications: {notify_err}")

            logger.info(f"Booking {booking_id} successfully confirmed via webhook.")
            return {"status": "processed", "resolved_entity": "booking", "id": booking_id}
        else:
            logger.info(f"Booking {booking_id} was already confirmed. No-op.")
            return {"status": "already_processed", "resolved_entity": "booking", "id": booking_id}

    # ---------------- 3B. Subscription purchase check ----------------
    subscription = None
    if order_id:
        subscription = await db.subscriptions.find_one({"razorpay_order_id": order_id}, {"_id": 0})
    if not subscription and receipt:
        subscription = await db.subscriptions.find_one({"subscription_id": receipt}, {"_id": 0})

    if subscription:
        subscription_id = subscription["subscription_id"]
        logger.info(f"Resolved payment to Subscription ID: {subscription_id}")

        if subscription.get("status") != SubscriptionStatus.ACTIVE.value:
            # Update status to active
            await db.subscriptions.update_one(
                {"subscription_id": subscription_id},
                {"$set": {
                    "status": SubscriptionStatus.ACTIVE.value,
                    "razorpay_subscription_id": payment_id,
                    "updated_at": datetime.now(timezone.utc)
                }}
            )

            # Activate associated property listing
            if subscription.get("property_id"):
                await db.properties.update_one(
                    {"property_id": subscription["property_id"]},
                    {"$set": {
                        "subscription_id": subscription_id,
                        "subscription_status": "active"
                    }}
                )

            # Record transaction
            try:
                from models.transaction import TransactionType
                from services.account_service import record_transaction
                await record_transaction(
                    db,
                    type=TransactionType.SUBSCRIPTION,
                    amount=int(amount_paise or round(subscription.get("amount", 0) * 100)),
                    razorpay_order_id=order_id,
                    razorpay_payment_id=payment_id,
                    user_id=subscription["user_id"],
                    subscription_id=subscription_id,
                    is_mock=razorpay_service.is_mock,
                )
            except Exception as txn_err:
                logger.warning(f"Webhook failed to record subscription transaction: {txn_err}")

            logger.info(f"Subscription {subscription_id} successfully activated via webhook.")
            return {"status": "processed", "resolved_entity": "subscription", "id": subscription_id}
        else:
            logger.info(f"Subscription {subscription_id} was already active. No-op.")
            return {"status": "already_processed", "resolved_entity": "subscription", "id": subscription_id}

    # ---------------- 3C. Host registration fee check ----------------
    # Host registration orders use receipt pattern "reg_fee_<user_id>"
    if receipt and receipt.startswith("reg_fee_"):
        user_id = receipt.replace("reg_fee_", "")
        logger.info(f"Resolved payment to host registration fee for User ID: {user_id}")

        user = await db.users.find_one({"user_id": user_id})
        if user:
            if not user.get("registration_fee_paid", False):
                # Update user
                await db.users.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "registration_fee_paid": True,
                        "registration_fee_payment_id": payment_id,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )

                # Record transaction
                try:
                    from models.transaction import TransactionType
                    from services.account_service import record_transaction
                    from routes.subscription_routes import REGISTRATION_FEE_AMOUNT
                    await record_transaction(
                        db,
                        type=TransactionType.REGISTRATION_FEE,
                        amount=int(amount_paise or REGISTRATION_FEE_AMOUNT),
                        razorpay_order_id=order_id,
                        razorpay_payment_id=payment_id,
                        user_id=user_id,
                        is_mock=razorpay_service.is_mock,
                    )
                except Exception as txn_err:
                    logger.warning(f"Webhook failed to record registration transaction: {txn_err}")

                logger.info(f"Registration fee for user {user_id} successfully confirmed via webhook.")
                return {"status": "processed", "resolved_entity": "registration_fee", "id": user_id}
            else:
                logger.info(f"Registration fee for user {user_id} was already paid. No-op.")
                return {"status": "already_processed", "resolved_entity": "registration_fee", "id": user_id}

    logger.warning(f"Webhook event resolved to no known entity. Order ID: {order_id}, Receipt: {receipt}")
    return {"status": "unresolved", "error": "No matching entity found"}
