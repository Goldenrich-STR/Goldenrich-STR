import asyncio
from datetime import datetime, timezone
from pathlib import Path
import sys

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
sys.path.insert(0, str(ROOT_DIR))
load_dotenv(ROOT_DIR / ".env")

from server import db_instance  # noqa: E402


PLAN_SEED = [
    {
        "plan_id": "plan_comfort_stay",
        "plan_type": "studio",
        "property_category": "residential",
        "property_type": "studio",
        "bhk_type": "studio",
        "plan_name": "COMFORT STAY",
        "price_monthly": 2000,
        "price_annual": 20000,
        "platform_fee": 100,
        "tax_percent": 18,
        "description": "Ideal for STR apartments. Promote your property, avoid low ranking, and manage reservations from a single dashboard.",
    },
    {
        "plan_id": "plan_family_stay",
        "plan_type": "1bhk",
        "property_category": "residential",
        "property_type": "apartment",
        "bhk_type": "1bhk",
        "plan_name": "Family Stay",
        "price_monthly": 3000,
        "price_annual": 30000,
        "platform_fee": 150,
        "tax_percent": 18,
        "description": "Ideal for 1BHK apartments, preferred family stays, and homes needing smooth booking management.",
    },
    {
        "plan_id": "plan_premium_stay",
        "plan_type": "2bhk",
        "property_category": "residential",
        "property_type": "apartment",
        "bhk_type": "2bhk",
        "plan_name": "Premium Stay",
        "price_monthly": 4000,
        "price_annual": 40000,
        "platform_fee": 200,
        "tax_percent": 18,
        "description": "Built for spacious 2BHK homes. Showcase your property to a wider audience and manage bookings with ease.",
    },
    {
        "plan_id": "plan_executive_stay",
        "plan_type": "3bhk",
        "property_category": "residential",
        "property_type": "apartment",
        "bhk_type": "3bhk",
        "plan_name": "Executive Stay",
        "price_monthly": 5000,
        "price_annual": 50000,
        "platform_fee": 250,
        "tax_percent": 18,
        "description": "Enhance premium 3BHK apartments, attract larger groups, and maintain a comfortable stay through X-Space360.",
    },
    {
        "plan_id": "plan_smart_stay",
        "plan_type": "4bhk",
        "property_category": "residential",
        "property_type": "apartment",
        "bhk_type": "4bhk",
        "plan_name": "Smart Stay",
        "price_monthly": 7000,
        "price_annual": 70000,
        "platform_fee": 350,
        "tax_percent": 18,
        "description": "Perfect for multi-apartment and compact-living spaces. List your property, manage bookings, and start earning through X-Space360.",
    },
    {
        "plan_id": "plan_villa_2bhk",
        "plan_type": "2bhk",
        "property_category": "residential",
        "property_type": "villa",
        "bhk_type": "2bhk",
        "plan_name": "Villa 2BHK Plan",
        "price_monthly": 5000,
        "price_annual": 50000,
        "platform_fee": 500,
        "tax_percent": 18,
        "description": "For 2BHK villas and holiday homes. Showcase facilities and start receiving bookings from a single dashboard.",
    },
    {
        "plan_id": "plan_villa_3bhk",
        "plan_type": "3bhk",
        "property_category": "residential",
        "property_type": "villa",
        "bhk_type": "3bhk",
        "plan_name": "Villa 3BHK Plan",
        "price_monthly": 7000,
        "price_annual": 70000,
        "platform_fee": 500,
        "tax_percent": 18,
        "description": "Designed for 3BHK villas serving groups and family stays. List faster and manage reservations through X-Space360.",
    },
    {
        "plan_id": "plan_villa_4bhk",
        "plan_type": "4bhk",
        "property_category": "residential",
        "property_type": "villa",
        "bhk_type": "4bhk",
        "plan_name": "Villa 4BHK Plan",
        "price_monthly": 10000,
        "price_annual": 100000,
        "platform_fee": 1000,
        "tax_percent": 18,
        "description": "Perfect for premium 4BHK villas. List your property, manage reservations, and attract group and family bookings.",
    },
    {
        "plan_id": "plan_villa_5bhk",
        "plan_type": "4bhk_plus",
        "property_category": "residential",
        "property_type": "villa",
        "bhk_type": "5bhk",
        "plan_name": "Villa 5BHK Plan",
        "price_monthly": 15000,
        "price_annual": 150000,
        "platform_fee": 1500,
        "tax_percent": 18,
        "description": "Created for luxury 5BHK+ villas. Showcase premium amenities, receive party bookings, and reach high-value travel demand.",
    },
    {
        "plan_id": "plan_banquet",
        "plan_type": "banquet",
        "property_category": "event_venue",
        "property_type": None,
        "plan_name": "BANQUET",
        "price_monthly": 10000,
        "price_annual": 100000,
        "platform_fee": 500,
        "tax_percent": 18,
        "description": "Tailored for luxury celebrations with flat-rate admissions. Promote your premium property and connect with high-value guests.",
    },
    {
        "plan_id": "plan_commercial_100_300",
        "plan_type": "commercial",
        "property_category": "commercial",
        "property_type": None,
        "plan_name": "Starter Commercial - 100-300 sq.ft",
        "price_monthly": 3500,
        "price_annual": 35000,
        "platform_fee": 200,
        "tax_percent": 18,
        "sqft_range": "100-300",
        "description": "Designed for small commercial studios, cabins, and office corners. This plan helps showcase your space professionally and attract verified short-term users.",
    },
    {
        "plan_id": "plan_commercial_200_300",
        "plan_type": "commercial",
        "property_category": "commercial",
        "property_type": None,
        "plan_name": "Business Plus - 200-300 sq.ft",
        "price_monthly": 2500,
        "price_annual": 25000,
        "platform_fee": 200,
        "tax_percent": 18,
        "sqft_range": "200-300",
        "description": "Ideal for compact offices, studios, and small commercial spaces. Receive inquiries and manage short-term bookings through the platform.",
    },
    {
        "plan_id": "plan_commercial_300_500",
        "plan_type": "commercial",
        "property_category": "commercial",
        "property_type": None,
        "plan_name": "Professional - 300-500 sq.ft",
        "price_monthly": 6000,
        "price_annual": 60000,
        "platform_fee": 300,
        "tax_percent": 18,
        "sqft_range": "300-500",
        "description": "Created for mid-size offices, coaching rooms, salons, studios, and commercial spaces that need better visibility and booking control.",
    },
    {
        "plan_id": "plan_commercial_500_700",
        "plan_type": "commercial",
        "property_category": "commercial",
        "property_type": None,
        "plan_name": "Premium Business - 500-700 sq.ft",
        "price_monthly": 9000,
        "price_annual": 90000,
        "platform_fee": 500,
        "tax_percent": 18,
        "sqft_range": "500-700",
        "description": "Best suited for bigger showrooms, commercial offices, fitness centers, educational facilities, and premium business spaces.",
    },
    {
        "plan_id": "plan_commercial_700_1000",
        "plan_type": "commercial",
        "property_category": "commercial",
        "property_type": None,
        "plan_name": "Elite Commercial - 700-1000 sq.ft",
        "price_monthly": 12000,
        "price_annual": 120000,
        "platform_fee": 500,
        "tax_percent": 18,
        "sqft_range": "700-1000",
        "description": "Designed for premium commercial establishments, studios, workspaces, and event-ready venues needing strong visibility.",
    },
    {
        "plan_id": "plan_commercial_1000_plus",
        "plan_type": "commercial",
        "property_category": "commercial",
        "property_type": None,
        "plan_name": "Enterprise PRO - 1000+ sq.ft",
        "price_monthly": 15000,
        "price_annual": 150000,
        "platform_fee": 1000,
        "tax_percent": 18,
        "sqft_range": "1000+",
        "description": "For large premium commercial properties, co-working spaces, halls, large office buildings, and commercial studios.",
    },
]


async def seed_subscription_plans():
    await db_instance.connect()
    try:
        await db_instance.ensure_table("subscription_plans")
        now = datetime.now(timezone.utc)

        await db_instance.subscription_plans.update_many(
            {"plan_id": "plan_1783075189.738285"},
            {
                "$set": {
                    "is_active": False,
                    "is_deleted": True,
                    "deleted_at": now,
                    "updated_at": now,
                }
            },
        )

        for plan in PLAN_SEED:
            payload = {
                **plan,
                "validity_days": 30,
                "is_active": True,
                "is_deleted": False,
                "updated_at": now,
            }
            existing = await db_instance.subscription_plans.find_one({"plan_id": plan["plan_id"]}, {"_id": 0})
            if existing:
                await db_instance.subscription_plans.update_one({"plan_id": plan["plan_id"]}, {"$set": payload})
            else:
                payload["created_at"] = now
                await db_instance.subscription_plans.insert_one(payload)

        total = await db_instance.subscription_plans.count_documents({"is_deleted": {"$ne": True}})
        print(f"Seeded {len(PLAN_SEED)} subscription plans. Active visible plans: {total}")
    finally:
        if getattr(db_instance, "pool", None):
            await db_instance.pool.close()


if __name__ == "__main__":
    asyncio.run(seed_subscription_plans())
