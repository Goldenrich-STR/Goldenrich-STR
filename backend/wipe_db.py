#!/usr/bin/env python3
"""Script to wipe the database and seed fresh admin, empty CMS, and subscription plans."""

import asyncio
import os
import logging
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def wipe_and_reset():
    db_type = os.environ.get('DATABASE_TYPE', 'postgres')
    if db_type != 'postgres':
        logger.error("This script is designed for DATABASE_TYPE=postgres.")
        return

    postgres_url = os.environ.get('POSTGRES_URL')
    if not postgres_url:
        logger.error("POSTGRES_URL environment variable is missing.")
        return

    logger.info("Initializing PGAdapter...")
    from utils.pg_adapter import PGAdapter
    db = PGAdapter(postgres_url)
    await db.connect()

    tables = [
        "users", "properties", "bookings", "blocked_dates", 
        "external_calendars", "property_verifications", 
        "transactions", "payouts", "refunds", "reviews", 
        "notifications", "subscription_plans", "subscriptions", "cms_content", "leads", "coupons",
        "deleted_properties", "search_logs", "ai_calls", "ai_agents", "calendar_sync_logs"
    ]

    logger.info("Dropping all existing tables CASCADE...")
    async with db.pool.acquire() as conn:
        for table in tables:
            try:
                await conn.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
                logger.info(f"Dropped table: {table}")
            except Exception as e:
                logger.error(f"Failed to drop table {table}: {e}")

    logger.info("Re-creating all tables...")
    for table in tables:
        await db.ensure_table(table)
        logger.info(f"Created table: {table}")

    logger.info("Seeding Admin User...")
    from create_missing_users import create_missing_users
    await create_missing_users(db)

    logger.info("Seeding Default CMS Content (with empty blogs/testimonials)...")
    from routes.cms_routes import _ensure_seeded_landing_content, _ensure_seeded_support_content
    await _ensure_seeded_landing_content(db)
    await _ensure_seeded_support_content(db)

    logger.info("Seeding Subscription Plans...")
    from seed_subscription_plans import seed_plans
    # Run seed_plans using the active db adapter
    # To prevent it from closing our pool or connecting again, we can just run its inner logic:
    from datetime import datetime
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
    await db.subscription_plans.insert_many(plans)
    logger.info("Successfully seeded subscription plans.")

    await db.close()
    logger.info("Database wipe and reset successfully completed!")

if __name__ == "__main__":
    asyncio.run(wipe_and_reset())
