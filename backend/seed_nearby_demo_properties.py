"""Seed reversible nearby demo properties around the Android emulator GPS area."""
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

DATABASE_TYPE = os.environ.get("DATABASE_TYPE", "mongo")
POSTGRES_URL = os.environ.get("POSTGRES_URL")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

DEMO_PREFIX = "prop_nearby_demo_"

NEARBY_DEMO_PROPERTIES = [
    {
        "property_id": f"{DEMO_PREFIX}shoreline_office",
        "title": "Shoreline Smart Office",
        "description": "Premium day-use workspace near Shoreline with fast WiFi, meeting table, pantry access, and secure parking.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Shoreline Boulevard, Mountain View",
        "city": "Mountain View",
        "state": "California",
        "pin_code": "94043",
        "latitude": 37.4219999,
        "longitude": -122.0840575,
        "area_sqft": 950,
        "max_guests": 8,
        "price_per_night": 6500,
        "pricing_cycle": "day",
        "pricing_display_mode": "per_day",
        "amenities": ["wifi", "ac", "parking", "meeting_room", "coffee"],
        "images": [],
        "instant_booking": True,
        "booking_mode": "INSTANT_BOOK",
        "pet_friendly": False,
    },
    {
        "property_id": f"{DEMO_PREFIX}amphitheatre_cowork",
        "title": "Amphitheatre Coworking Suite",
        "description": "Open coworking suite with flexible desks, phone booth, conference access, and quiet work zones.",
        "property_type": "co_working",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Amphitheatre Parkway, Mountain View",
        "city": "Mountain View",
        "state": "California",
        "pin_code": "94043",
        "latitude": 37.4242,
        "longitude": -122.0921,
        "area_sqft": 1800,
        "max_guests": 20,
        "price_per_night": 4200,
        "pricing_cycle": "day",
        "pricing_display_mode": "per_day",
        "amenities": ["wifi", "ac", "parking", "printer", "coffee"],
        "images": [],
        "instant_booking": True,
        "booking_mode": "INSTANT_BOOK",
        "pet_friendly": False,
    },
    {
        "property_id": f"{DEMO_PREFIX}bayview_apartment",
        "title": "Bayview Managed Apartment",
        "description": "Comfortable managed 2BHK stay close to tech parks with kitchen, laundry, parking, and self check-in.",
        "property_type": "apartment",
        "category": "residential",
        "bhk_type": "2bhk",
        "address": "Charleston Road, Mountain View",
        "city": "Mountain View",
        "state": "California",
        "pin_code": "94043",
        "latitude": 37.4190,
        "longitude": -122.0795,
        "area_sqft": 1100,
        "max_guests": 5,
        "price_per_night": 9800,
        "pricing_cycle": "night",
        "pricing_display_mode": "per_night",
        "amenities": ["wifi", "ac", "parking", "kitchen", "washing_machine"],
        "images": [],
        "instant_booking": True,
        "booking_mode": "INSTANT_BOOK",
        "pet_friendly": True,
    },
    {
        "property_id": f"{DEMO_PREFIX}stevens_creek_event",
        "title": "Stevens Creek Event Hall",
        "description": "Compact event venue for launches, workshops, parties, and private dinners with AV and catering support.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Stevens Creek Trail, Mountain View",
        "city": "Mountain View",
        "state": "California",
        "pin_code": "94043",
        "latitude": 37.4118,
        "longitude": -122.0713,
        "area_sqft": 4200,
        "max_guests": 120,
        "price_per_night": 28000,
        "pricing_cycle": "day",
        "pricing_display_mode": "per_day",
        "amenities": ["parking", "stage", "catering", "ac", "sound_system"],
        "images": [],
        "instant_booking": True,
        "booking_mode": "INSTANT_BOOK",
        "pet_friendly": False,
    },
    {
        "property_id": f"{DEMO_PREFIX}palo_alto_meeting",
        "title": "Palo Alto Boardroom",
        "description": "Premium meeting room for client demos, investor meetings, and team planning sessions.",
        "property_type": "meeting_room",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "San Antonio Road, Palo Alto",
        "city": "Palo Alto",
        "state": "California",
        "pin_code": "94303",
        "latitude": 37.4074,
        "longitude": -122.1083,
        "area_sqft": 700,
        "max_guests": 12,
        "price_per_night": 3500,
        "pricing_cycle": "day",
        "pricing_display_mode": "per_day",
        "amenities": ["wifi", "ac", "parking", "projector", "coffee"],
        "images": [],
        "instant_booking": True,
        "booking_mode": "INSTANT_BOOK",
        "pet_friendly": False,
    },
]


async def _connect():
    if DATABASE_TYPE == "postgres":
        from utils.pg_adapter import PGAdapter

        db = PGAdapter(POSTGRES_URL)
        await db.connect()
        await db.ensure_table("properties")
        return db, None

    client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
    return client[DB_NAME], client


async def main():
    db, client = await _connect()
    try:
        now = datetime.now(timezone.utc).isoformat()
        await db.properties.delete_many({"property_id": {"$regex": f"^{DEMO_PREFIX}"}})
        for index, prop in enumerate(NEARBY_DEMO_PROPERTIES, start=1):
            doc = {
                **prop,
                "owner_id": "nearby_demo_host",
                "status": "live",
                "subscription_status": "active",
                "rating": 4.6 + (index % 4) * 0.1,
                "review_count": 12 + index * 3,
                "average_rating": 4.6 + (index % 4) * 0.1,
                "reviews_count": 12 + index * 3,
                "created_at": now,
                "updated_at": now,
                "approved_at": now,
            }
            await db.properties.insert_one(doc)
        print(f"Inserted {len(NEARBY_DEMO_PROPERTIES)} nearby demo properties.")
        print(f"Undo: delete properties where property_id starts with {DEMO_PREFIX}")
    finally:
        if client:
            client.close()
        elif DATABASE_TYPE == "postgres" and hasattr(db, "close"):
            await db.close()


if __name__ == "__main__":
    asyncio.run(main())
