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


@pytest.mark.anyio
async def test_subscription_dynamic_visibility_and_booking(db):
    """Verify that a property whose subscription has expired is filtered out from search/browse
    and cannot be retrieved/booked by guest, even before the sweep runs."""
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

    # Create an expired subscription (end_date is in the past) but property is still "live"
    expired_sub_id = "TEST_SUB_EXPIRED"
    expired_prop_id = "TEST_PROP_EXPIRED"
    
    await db.properties.insert_one({
        "property_id": expired_prop_id,
        "owner_id": user_id,
        "title": "Expired Test Villa Dynamic",
        "description": "Villa description",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "123 Street",
        "city": "Nashik",
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
        "end_date": (date.today() - timedelta(days=5)).isoformat(),
        "trial_end_date": (date.today() + timedelta(days=50)).isoformat()
    })

    # Create a non-expired subscription
    valid_sub_id = "TEST_SUB_SAFE"
    valid_prop_id = "TEST_PROP_SAFE"
    
    await db.properties.insert_one({
        "property_id": valid_prop_id,
        "owner_id": user_id,
        "title": "Valid Test Villa Dynamic",
        "description": "Villa description",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "123 Street",
        "city": "Nashik",
        "state": "MH",
        "pin_code": "400001",
        "area_sqft": 2000,
        "status": PropertyStatus.LIVE.value,
        "subscription_id": valid_sub_id,
        "subscription_status": "active"
    })
    
    await db.subscriptions.insert_one({
        "subscription_id": valid_sub_id,
        "user_id": user_id,
        "property_id": valid_prop_id,
        "plan_id": "plan_123",
        "plan_type": "3bhk",
        "billing_cycle": "monthly",
        "amount": 5000.0,
        "status": SubscriptionStatus.ACTIVE.value,
        "start_date": (date.today() - timedelta(days=5)).isoformat(),
        "end_date": (date.today() + timedelta(days=25)).isoformat(),
        "trial_end_date": (date.today() + timedelta(days=55)).isoformat()
    })

    try:
        from routes.property_routes import search_properties, get_property
        from fastapi import Response, Request
        from unittest.mock import MagicMock

        # 1. Test search_properties filters it out
        mock_response = MagicMock(spec=Response)
        search_res = await search_properties(
            response=mock_response,
            category=None,
            city="Nashik",
            property_type=None,
            min_price=None,
            max_price=None,
            bhk_type=None,
            amenities=None,
            instant_booking=None,
            pet_friendly=None,
            guests=None,
            max_guests=None,
            check_in=None,
            check_out=None,
            bbox=None,
            sort="recommended",
            limit=50,
            skip=0,
            db=db
        )
        props = search_res["properties"]
        prop_ids = [p["property_id"] for p in props]
        assert expired_prop_id not in prop_ids
        assert valid_prop_id in prop_ids

        # 2. Test get_property raises 404 for guests
        mock_request = MagicMock(spec=Request)
        mock_request.headers = {}
        
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await get_property(property_id=expired_prop_id, request=mock_request, response=mock_response, db=db)
        assert exc_info.value.status_code == 404

        # 3. Test get_property works for owner
        mock_request_owner = MagicMock(spec=Request)
        mock_request_owner.headers = {"authorization": "Bearer dummy_token"}
        
        # Patch decode_access_token to return owner user
        import utils.auth
        orig_decode = utils.auth.decode_access_token
        utils.auth.decode_access_token = lambda token: {"user_id": user_id, "role": "host"}
        
        try:
            prop_details = await get_property(property_id=expired_prop_id, request=mock_request_owner, response=mock_response, db=db)
            assert prop_details["property_id"] == expired_prop_id
        finally:
            utils.auth.decode_access_token = orig_decode

        # 4. Test create_booking raises 400 for expired property subscription
        from routes.booking_routes import create_booking
        from models.booking import BookingCreate
        
        booking_payload = BookingCreate(
            property_id=expired_prop_id,
            check_in_date=date.today() + timedelta(days=10),
            check_out_date=date.today() + timedelta(days=12),
            number_of_guests=2
        )
        
        with pytest.raises(HTTPException) as exc_info:
            await create_booking(
                booking_data=booking_payload,
                current_user={"user_id": "TEST_GUEST", "role": "guest"},
                db=db
            )
        assert exc_info.value.status_code == 400
        assert "subscription has expired" in exc_info.value.detail

    finally:
        await clean_test_data(db)
        await db.users.delete_many({"user_id": user_id})
