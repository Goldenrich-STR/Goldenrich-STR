#!/usr/bin/env python3
"""Create admin and test users."""

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

async def create_users():
    """Create admin and test users."""
    from server import db_instance
    if os.environ.get('DATABASE_TYPE') == 'postgres':
        await db_instance.connect()
        await db_instance.ensure_table("users")
    db = db_instance
    
    users = [
        {
            "user_id": f"user_admin_{int(datetime.utcnow().timestamp())}",
            "email": "admin@propnest.com",
            "phone": "+919876543214",
            "password_hash": pwd_context.hash("admin123"),
            "full_name": "Admin User",
            "role": "admin",
            "city": "Mumbai",
            "profile_image": "https://images.unsplash.com/photo-1655249481446-25d575f1c054",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": True,
            "terms_accepted": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "user_id": f"user_host_{int(datetime.utcnow().timestamp())}",
            "email": "host@propnest.com",
            "phone": "+919876543211",
            "password_hash": pwd_context.hash("host123"),
            "full_name": "Rajesh Sharma",
            "role": "host",
            "city": "Pune",
            "profile_image": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": True,
            "terms_accepted": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "user_id": f"user_guest_{int(datetime.utcnow().timestamp())}",
            "email": "guest@propnest.com",
            "phone": "+919876543210",
            "password_hash": pwd_context.hash("guest123"),
            "full_name": "Priya Mehta",
            "role": "guest",
            "city": "Mumbai",
            "profile_image": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb",
            "kyc_status": "approved",
            "is_active": True,
            "is_email_verified": True,
            "is_phone_verified": True,
            "registration_fee_paid": False,
            "terms_accepted": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    for user in users:
        # Check if user already exists
        existing = await db.users.find_one({"email": user["email"]})
        
        if existing:
            print(f"User {user['email']} already exists. Skipping.")
        else:
            await db.users.insert_one(user)
            print(f"Created user: {user['email']} (Role: {user['role']})")
    
    if hasattr(db, 'close'):
        await db.close()
    print("\nTest credentials saved in /app/memory/test_credentials.md")

if __name__ == "__main__":
    asyncio.run(create_users())
