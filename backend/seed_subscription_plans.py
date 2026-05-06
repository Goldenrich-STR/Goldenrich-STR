#!/usr/bin/env python3
"""Seed default subscription plans into the database."""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_plans():
    """Seed default subscription plans."""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    plans = [
        {
            "plan_id": f"plan_studio_{int(datetime.utcnow().timestamp())}",
            "plan_type": "studio",
            "plan_name": "Studio Plan",
            "price_monthly": 999.0,
            "price_annual": 9999.0,
            "description": "Perfect for studio apartments and 1RK properties",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "plan_id": f"plan_1bhk_{int(datetime.utcnow().timestamp())}",
            "plan_type": "1bhk",
            "plan_name": "1 BHK Plan",
            "price_monthly": 1499.0,
            "price_annual": 14999.0,
            "description": "Ideal for 1 bedroom properties",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "plan_id": f"plan_2bhk_{int(datetime.utcnow().timestamp())}",
            "plan_type": "2bhk",
            "plan_name": "2 BHK Plan",
            "price_monthly": 1999.0,
            "price_annual": 19999.0,
            "description": "Great for 2 bedroom properties",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "plan_id": f"plan_3bhk_{int(datetime.utcnow().timestamp())}",
            "plan_type": "3bhk",
            "plan_name": "3 BHK Plan",
            "price_monthly": 2499.0,
            "price_annual": 24999.0,
            "description": "Best for 3 bedroom properties",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "plan_id": f"plan_4bhk_{int(datetime.utcnow().timestamp())}",
            "plan_type": "4bhk_plus",
            "plan_name": "4 BHK+ Plan",
            "price_monthly": 2999.0,
            "price_annual": 29999.0,
            "description": "For 4+ bedroom properties",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "plan_id": f"plan_commercial_{int(datetime.utcnow().timestamp())}",
            "plan_type": "commercial",
            "plan_name": "Commercial Plan",
            "price_monthly": 3499.0,
            "price_annual": 34999.0,
            "description": "For office spaces and co-working",
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "plan_id": f"plan_banquet_{int(datetime.utcnow().timestamp())}",
            "plan_type": "banquet",
            "plan_name": "Banquet/Event Plan",
            "price_monthly": 4999.0,
            "price_annual": 49999.0,
            "description": "For event venues and banquet halls",
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]
    
    # Check if plans already exist
    existing_count = await db.subscription_plans.count_documents({})
    
    if existing_count > 0:
        print(f"Subscription plans already exist ({existing_count} plans). Skipping seed.")
    else:
        result = await db.subscription_plans.insert_many(plans)
        print(f"✅ Seeded {len(result.inserted_ids)} subscription plans successfully!")
        
        for plan in plans:
            print(f"  - {plan['plan_name']}: ₹{plan['price_monthly']}/month")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_plans())
