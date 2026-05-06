#!/usr/bin/env python3
"""Create test employee user."""

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

async def create_employee():
    """Create employee user."""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    employee = {
        "user_id": f"user_employee_{int(datetime.utcnow().timestamp())}",
        "email": "employee@propnest.com",
        "phone": "+919876543213",
        "password_hash": pwd_context.hash("employee123"),
        "full_name": "Sneha Kulkarni",
        "role": "employee",
        "city": "Mumbai",
        "employee_region": "Maharashtra",
        "profile_image": "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb",
        "kyc_status": "approved",
        "is_active": True,
        "is_email_verified": True,
        "is_phone_verified": True,
        "registration_fee_paid": True,
        "terms_accepted": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Check if employee already exists
    existing = await db.users.find_one({"email": employee["email"]})
    
    if existing:
        print(f"⚠️  Employee {employee['email']} already exists.")
    else:
        await db.users.insert_one(employee)
        print(f"✅ Created employee (RM): {employee['email']}")
    
    client.close()
    print("\n📝 Test employee credentials: employee@propnest.com / employee123")

if __name__ == "__main__":
    asyncio.run(create_employee())
