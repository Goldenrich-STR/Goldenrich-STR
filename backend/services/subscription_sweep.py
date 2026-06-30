import asyncio
import logging
from datetime import datetime, date, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from models.subscription import SubscriptionStatus
from models.property import PropertyStatus
from models.notification import NotificationType, NotificationChannel
from services.notification_service import send_multi_channel_notification

logger = logging.getLogger(__name__)

def parse_date(d):
    if not d:
        return None
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    try:
        return datetime.strptime(d.split('T')[0], "%Y-%m-%d").date()
    except Exception:
        return None

async def sweep_subscriptions(db: AsyncIOMotorDatabase):
    """Daily subscription sweep task to:
    1. Expire past due subscriptions, deactivate their status, and block/disable the associated properties.
    2. Send daily expiration warning notifications starting 10 days before expiry.
    """
    logger.info("Starting subscription status sweep...")
    today = date.today()
    
    try:
        # Fetch all active/trial subscriptions
        cursor = db.subscriptions.find({
            "status": {"$in": [SubscriptionStatus.ACTIVE.value, SubscriptionStatus.TRIAL.value]}
        })
        subscriptions = await cursor.to_list(length=1000)
        logger.info(f"Checking {len(subscriptions)} active/trial subscriptions...")
        
        for sub in subscriptions:
            sub_id = sub.get("subscription_id")
            property_id = sub.get("property_id")
            user_id = sub.get("user_id")
            end_date_raw = sub.get("end_date")
            
            end_date = parse_date(end_date_raw)
            if not end_date:
                continue
                
            # Fetch property title to customize notifications
            property_title = "Your Property"
            if property_id:
                prop = await db.properties.find_one({"property_id": property_id}, {"title": 1})
                if prop:
                    property_title = prop.get("title", "Your Property")
            
            # Case 1: Subscription has expired
            if end_date <= today:
                logger.info(f"Subscription {sub_id} for property {property_id} has expired (End date: {end_date})")
                
                # 1. Update subscription status in DB
                await db.subscriptions.update_one(
                    {"subscription_id": sub_id},
                    {"$set": {
                        "status": SubscriptionStatus.EXPIRED.value,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
                
                # 2. Deactivate the property and update its subscription status
                if property_id:
                    await db.properties.update_one(
                        {"property_id": property_id},
                        {"$set": {
                            "subscription_status": "expired",
                            "status": PropertyStatus.BLOCKED.value, # Block/disable property
                            "updated_at": datetime.now(timezone.utc)
                        }}
                    )
                
                # 3. Send Expiry Notification to Host
                try:
                    await send_multi_channel_notification(
                        db=db,
                        user_id=user_id,
                        notification_type=NotificationType.SUBSCRIPTION_EXPIRED,
                        title="Subscription Expired - Property Disabled",
                        message=f"Your subscription for property '{property_title}' has expired on {end_date}. Your property listing is now disabled. Please renew your subscription to reactivate it.",
                        channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                        data={"property_id": property_id, "subscription_id": sub_id}
                    )
                except Exception as notif_err:
                    logger.error(f"Failed to send subscription expired notification to user {user_id}: {notif_err}")
            
            # Case 2: Subscription is expiring within 10 days
            else:
                days_remaining = (end_date - today).days
                if 1 <= days_remaining <= 10:
                    logger.info(f"Subscription {sub_id} for property {property_id} is expiring in {days_remaining} days.")
                    
                    # Send Expiring Notification to Host
                    try:
                        await send_multi_channel_notification(
                            db=db,
                            user_id=user_id,
                            notification_type=NotificationType.SUBSCRIPTION_EXPIRING,
                            title="Subscription Expiring Soon",
                            message=f"Your subscription for property '{property_title}' will expire in {days_remaining} days (on {end_date}). Please renew to keep your property listing active.",
                            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                            data={"property_id": property_id, "subscription_id": sub_id, "days_remaining": days_remaining}
                        )
                    except Exception as notif_err:
                        logger.error(f"Failed to send subscription expiring notification to user {user_id}: {notif_err}")

        logger.info("Subscription status sweep completed successfully.")
    except Exception as e:
        logger.error(f"Error during subscription status sweep: {str(e)}")

async def start_subscription_sweeper(db: AsyncIOMotorDatabase, interval_seconds: int = 86400):
    """Start the background task loop for sweeping subscriptions."""
    async def _sweep_loop():
        # Delay start slightly on boot
        await asyncio.sleep(15)
        while True:
            try:
                await sweep_subscriptions(db)
            except Exception as e:
                logger.error(f"Subscription sweep task failed: {e}")
            await asyncio.sleep(interval_seconds)
            
    asyncio.create_task(_sweep_loop())
    logger.info(f"Subscription status sweeper scheduled (interval={interval_seconds}s)")
