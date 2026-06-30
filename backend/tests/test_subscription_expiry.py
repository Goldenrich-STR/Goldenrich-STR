import os
import sys
import uuid
import pytest
from datetime import datetime, date, timedelta, timezone

# Allow service imports
sys.path.insert(0, "/app/backend")

from motor.motor_asyncio import AsyncIOMotorClient
from models.subscription import SubscriptionStatus
from models.property import PropertyStatus
from models.notification import NotificationType
from services.subscription_sweep import sweep_subscriptions

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "propnest_db")

@pytest.fixture
def db():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()

async def clean_test_data(db):
    await db.subscriptions.delete_many({"subscription_id": {"$regex": "^TEST_SUB_"}})
    await db.properties.delete_many({"property_id": {"$regex": "^TEST_PROP_"}})
    await db.notifications.delete_many({"user_id": "TEST_USER_SWEEP"})

@pytest.mark.anyio
async def test_subscription_expiry_sweep(db):
    await clean_test_data(db)
    
    user_id = "TEST_USER_SWEEP"
    # Create test host user if not exists
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        await db.users.insert_one({
            "user_id": user_id,
            "email": "host_sweep@example.com",
            "full_name": "Test Host",
            "phone": "9999999999",
            "role": "host"
        })
    
    # 1. Create a subscription that has expired (end_date in past)
    expired_sub_id = "TEST_SUB_EXPIRED"
    expired_prop_id = "TEST_PROP_EXPIRED"
    
    await db.properties.insert_one({
        "property_id": expired_prop_id,
        "owner_id": user_id,
        "title": "Expired Test Villa",
        "description": "Villa description",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "123 Street",
        "city": "Mumbai",
        "state": "MH",
        "pin_code": "400001",
        "area_sqft": 2000,
        "status": PropertyStatus.LIVE.value,
        "subscription_id": expired_sub_id,
        "subscription_status": "active"
    })
    
    await db.subscriptions.insert_one({
        "subscription_id": expired_sub_id,
        "user_id": user_id,
        "property_id": expired_prop_id,
        "plan_id": "plan_123",
        "plan_type": "3bhk",
        "billing_cycle": "monthly",
        "amount": 5000.0,
        "status": SubscriptionStatus.ACTIVE.value,
        "start_date": (date.today() - timedelta(days=40)).isoformat(),
        "end_date": (date.today() - timedelta(days=10)).isoformat(),
        "trial_end_date": (date.today() + timedelta(days=50)).isoformat()
    })
    
    # 2. Create a subscription expiring in 5 days (warning notification expected)
    warning_sub_id = "TEST_SUB_WARNING"
    warning_prop_id = "TEST_PROP_WARNING"
    
    await db.properties.insert_one({
        "property_id": warning_prop_id,
        "owner_id": user_id,
        "title": "Warning Test Villa",
        "description": "Villa description",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "123 Street",
        "city": "Mumbai",
        "state": "MH",
        "pin_code": "400001",
        "area_sqft": 2000,
        "status": PropertyStatus.LIVE.value,
        "subscription_id": warning_sub_id,
        "subscription_status": "active"
    })
    
    await db.subscriptions.insert_one({
        "subscription_id": warning_sub_id,
        "user_id": user_id,
        "property_id": warning_prop_id,
        "plan_id": "plan_123",
        "plan_type": "3bhk",
        "billing_cycle": "monthly",
        "amount": 5000.0,
        "status": SubscriptionStatus.ACTIVE.value,
        "start_date": (date.today() - timedelta(days=25)).isoformat(),
        "end_date": (date.today() + timedelta(days=5)).isoformat(),
        "trial_end_date": (date.today() + timedelta(days=65)).isoformat()
    })
    
    # 3. Create a subscription that is safe (expiring in 20 days, no warnings/expiry)
    safe_sub_id = "TEST_SUB_SAFE"
    safe_prop_id = "TEST_PROP_SAFE"
    
    await db.properties.insert_one({
        "property_id": safe_prop_id,
        "owner_id": user_id,
        "title": "Safe Test Villa",
        "description": "Villa description",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "123 Street",
        "city": "Mumbai",
        "state": "MH",
        "pin_code": "400001",
        "area_sqft": 2000,
        "status": PropertyStatus.LIVE.value,
        "subscription_id": safe_sub_id,
        "subscription_status": "active"
    })
    
    await db.subscriptions.insert_one({
        "subscription_id": safe_sub_id,
        "user_id": user_id,
        "property_id": safe_prop_id,
        "plan_id": "plan_123",
        "plan_type": "3bhk",
        "billing_cycle": "monthly",
        "amount": 5000.0,
        "status": SubscriptionStatus.ACTIVE.value,
        "start_date": (date.today() - timedelta(days=10)).isoformat(),
        "end_date": (date.today() + timedelta(days=20)).isoformat(),
        "trial_end_date": (date.today() + timedelta(days=80)).isoformat()
    })
    
    try:
        # Run sweep
        await sweep_subscriptions(db)
        
        # Assertions for expired subscription
        sub_expired = await db.subscriptions.find_one({"subscription_id": expired_sub_id})
        assert sub_expired["status"] == SubscriptionStatus.EXPIRED.value
        
        prop_expired = await db.properties.find_one({"property_id": expired_prop_id})
        assert prop_expired["subscription_status"] == "expired"
        assert prop_expired["status"] == PropertyStatus.BLOCKED.value
        
        # Verify expired notification sent
        expired_notif = await db.notifications.find_one({
            "user_id": user_id,
            "type": NotificationType.SUBSCRIPTION_EXPIRED.value
        })
        assert expired_notif is not None
        assert "Expired Test Villa" in expired_notif["message"]
        
        # Assertions for warning subscription
        sub_warning = await db.subscriptions.find_one({"subscription_id": warning_sub_id})
        assert sub_warning["status"] == SubscriptionStatus.ACTIVE.value # still active
        
        prop_warning = await db.properties.find_one({"property_id": warning_prop_id})
        assert prop_warning["subscription_status"] == "active"
        assert prop_warning["status"] == PropertyStatus.LIVE.value
        
        # Verify warning notification sent
        warning_notif = await db.notifications.find_one({
            "user_id": user_id,
            "type": NotificationType.SUBSCRIPTION_EXPIRING.value
        })
        assert warning_notif is not None
        assert "Warning Test Villa" in warning_notif["message"]
        assert warning_notif["data"]["days_remaining"] == 5
        
        # Assertions for safe subscription
        sub_safe = await db.subscriptions.find_one({"subscription_id": safe_sub_id})
        assert sub_safe["status"] == SubscriptionStatus.ACTIVE.value
        
        prop_safe = await db.properties.find_one({"property_id": safe_prop_id})
        assert prop_safe["subscription_status"] == "active"
        assert prop_safe["status"] == PropertyStatus.LIVE.value
        
        # Verify no warning notification sent for safe sub
        safe_notif = await db.notifications.find_one({
            "user_id": user_id,
            "type": NotificationType.SUBSCRIPTION_EXPIRING.value,
            "data.subscription_id": safe_sub_id
        })
        assert safe_notif is None
        
    finally:
        await clean_test_data(db)
        await db.users.delete_many({"user_id": user_id})
