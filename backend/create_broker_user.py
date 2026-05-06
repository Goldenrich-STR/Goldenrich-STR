#!/usr/bin/env python3
"""Create test broker user."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_broker():
    """Create broker user."""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    broker = {
        "user_id": f"user_broker_{int(datetime.utcnow().timestamp())}",
        "email": "broker@propnest.com",
        "phone": "+919876543212",
        "password_hash": pwd_context.hash("broker123"),
        "full_name": "Vikram Joshi",
        "role": "broker",
        "city": "Pune",
        "region": "Maharashtra",
        "profile_image": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb",
        "lg_code": "LG001",
        "kyc_status": "approved",
        "is_active": True,
        "is_email_verified": True,
        "is_phone_verified": True,
        "registration_fee_paid": True,
        "terms_accepted": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Check if broker already exists
    existing = await db.users.find_one({"email": broker["email"]})
    
    if existing:
        print(f"⚠️  Broker {broker['email']} already exists.")
        broker_id = existing["user_id"]
    else:
        await db.users.insert_one(broker)
        print(f"✅ Created broker: {broker['email']} (LG Code: {broker['lg_code']})")
        broker_id = broker["user_id"]
    
    # Assign existing host to this broker
    host = await db.users.find_one({"email": "host@propnest.com"})
    if host:
        await db.users.update_one(
            {"email": "host@propnest.com"},
            {"$set": {"broker_id": broker_id, "lg_code": "LG001"}}
        )
        print(f"✅ Assigned host@propnest.com to broker {broker['lg_code']}")
    
    client.close()
    print("\n📝 Test broker credentials: broker@propnest.com / broker123")

if __name__ == "__main__":
    asyncio.run(create_broker())
