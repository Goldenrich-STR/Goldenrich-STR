"""Create or refresh the local hourly conference-room demo listing."""

import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient


ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

PROPERTY_ID = "prop_nashik_hourly_conference_hub"
PROPERTY_TITLE = "Nashik Hourly Conference Hub"


async def connect_database():
    if os.environ.get("DATABASE_TYPE", "mongo") == "postgres":
        from utils.pg_adapter import PGAdapter

        database = PGAdapter(os.environ["POSTGRES_URL"])
        await database.connect()
        await database.ensure_table("properties")
        return database, None

    client = AsyncIOMotorClient(os.environ["MONGO_URL"], tz_aware=True)
    return client[os.environ["DB_NAME"]], client


async def main():
    database, mongo_client = await connect_database()
    try:
        template = await database.properties.find_one(
            {"title": "Nashik IT Park Workspace"},
            {"_id": 0},
        ) or {}
        now = datetime.now(timezone.utc).isoformat()
        property_document = {
            "property_id": PROPERTY_ID,
            "owner_id": template.get("owner_id") or "user_host_1784086071",
            "broker_id": template.get("broker_id"),
            "broker_lg_code": template.get("broker_lg_code"),
            "rm_id": template.get("rm_id"),
            "employee_id": template.get("employee_id"),
            "created_by_role": template.get("created_by_role") or "host",
            "created_by_user_id": template.get("created_by_user_id") or template.get("owner_id") or "user_host_1784086071",
            "title": PROPERTY_TITLE,
            "description": "A modern conference room in Nashik for client meetings, workshops, interviews and team sessions, bookable by the hour.",
            "property_type": "conference_room",
            "category": "commercial",
            "bhk_type": "small",
            "address": "IT Park Road, Ambad MIDC",
            "city": "Nashik",
            "state": "Maharashtra",
            "pin_code": "422010",
            "latitude": 19.9517,
            "longitude": 73.7466,
            "nearby_places": ["Ambad MIDC", "Nashik IT Park", "Mumbai Naka"],
            "area_sqft": 420,
            "max_guests": 12,
            "guest_size": 12,
            "price_per_night": 750,
            "pricing_cycle": "hourly",
            "pricing_display_mode": "per_hour",
            "minimum_stay_days": 1,
            "check_in_time": "09:00",
            "check_out_time": "21:00",
            "amenities": ["wifi", "ac", "projector", "printer", "parking", "coffee"],
            "images": template.get("images") or [],
            "house_rules": "Hourly bookings require at least one hour. Please leave the room tidy after use.",
            "pet_friendly": False,
            "smoking_allowed": False,
            "instant_booking": True,
            "booking_mode": "INSTANT_BOOK",
            "status": "live",
            "subscription_status": "active",
            "blocked_dates": [],
            "rating": 4.8,
            "review_count": 18,
            "average_rating": 4.8,
            "reviews_count": 18,
            "created_at": template.get("created_at") or now,
            "updated_at": now,
            "approved_at": now,
        }

        await database.properties.update_one(
            {"property_id": PROPERTY_ID},
            {"$set": property_document},
            upsert=True,
        )
        print(f"Seeded local property: {PROPERTY_TITLE} ({PROPERTY_ID})")
    finally:
        if mongo_client:
            mongo_client.close()
        elif hasattr(database, "close"):
            await database.close()


if __name__ == "__main__":
    asyncio.run(main())
