"""Seed one live demo property with 15 uploaded images for gallery slider testing.

This uses only files that already exist in backend/uploads. Undo with:
python seed_slider_demo_property.py --undo
"""
import argparse
import asyncio
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
UPLOADS_DIR = ROOT / "uploads"
load_dotenv(ROOT / ".env")

DATABASE_TYPE = os.environ.get("DATABASE_TYPE", "mongo")
POSTGRES_URL = os.environ.get("POSTGRES_URL")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

PROPERTY_ID = "prop_slider_demo_gallery"


def uploaded_images(limit: int = 15) -> list[str]:
    allowed = {".jpg", ".jpeg", ".png", ".webp"}
    files = sorted(
        item
        for item in UPLOADS_DIR.iterdir()
        if item.is_file()
        and item.suffix.lower() in allowed
        and not item.name.lower().endswith("_original.jpeg")
        and not item.name.lower().endswith("_original.jpg")
        and not item.name.lower().endswith("_original.png")
    )
    images = [f"/uploads/{item.name}" for item in files[:limit]]
    if len(images) < 10:
        raise RuntimeError(
            f"Need at least 10 uploaded images in {UPLOADS_DIR}; found {len(images)}."
        )
    return images


async def connect_db():
    if DATABASE_TYPE == "postgres":
        from utils.pg_adapter import PGAdapter

        db = PGAdapter(POSTGRES_URL)
        await db.connect()
        await db.ensure_table("users")
        await db.ensure_table("properties")
        return db, None

    client = AsyncIOMotorClient(MONGO_URL, tz_aware=True)
    return client[DB_NAME], client


async def find_owner_id(db) -> str:
    host = await db.users.find_one({"role": "host"}, {"_id": 0})
    if not host:
        host = await db.users.find_one({"role": "admin"}, {"_id": 0})
    if not host:
        host = await db.users.find_one({}, {"_id": 0})
    if not host:
        raise RuntimeError("No user found to own the demo property.")
    return host.get("user_id") or host.get("id") or "slider_demo_host"


async def seed() -> None:
    db, client = await connect_db()
    try:
        images = uploaded_images(15)
        owner_id = await find_owner_id(db)
        now = datetime.now(timezone.utc)

        doc = {
            "property_id": PROPERTY_ID,
            "owner_id": owner_id,
            "broker_id": None,
            "title": "Slider Demo Premium Villa",
            "description": (
                "Demo live property created for testing the property details "
                "image carousel with many uploaded images."
            ),
            "property_type": "Villa",
            "category": "residential",
            "bhk_type": "4BHK",
            "address": "Demo Gallery Road, Nashik",
            "city": "Nashik",
            "state": "Maharashtra",
            "pin_code": "422001",
            "latitude": 19.9975,
            "longitude": 73.7898,
            "area_sqft": 2600,
            "price_per_night": 12500,
            "price_per_week": None,
            "price_per_month": None,
            "minimum_stay_days": 1,
            "min_guests": 1,
            "max_guests": 10,
            "extra_guest_fee": 1200,
            "max_extra_guests": 4,
            "amenities": [
                "wifi",
                "ac",
                "parking",
                "kitchen",
                "pool",
                "gazebo",
                "coffee",
            ],
            "images": images,
            "virtual_tour_link": None,
            "video_url": None,
            "house_rules": "No loud music after 10 PM. Valid government ID required at check-in.",
            "pet_friendly": True,
            "smoking_allowed": False,
            "instant_booking": True,
            "booking_mode": "INSTANT_BOOK",
            "status": "live",
            "verification_status": "approved",
            "document_verification_status": "approved",
            "subscription_status": "active",
            "rating": 4.8,
            "average_rating": 4.8,
            "review_count": 24,
            "reviews_count": 24,
            "blocked_dates": [],
            "created_at": now,
            "updated_at": now,
            "submitted_at": now,
            "approved_at": now,
        }

        await db.properties.delete_one({"property_id": PROPERTY_ID})
        await db.properties.insert_one(doc)
        print(f"Inserted {PROPERTY_ID} with {len(images)} images.")
        print("Open app Home and search: Slider Demo Premium Villa")
        print("Undo: python backend/seed_slider_demo_property.py --undo")
    finally:
        if client:
            client.close()
        elif DATABASE_TYPE == "postgres" and hasattr(db, "close"):
            await db.close()


async def undo() -> None:
    db, client = await connect_db()
    try:
        result = await db.properties.delete_one({"property_id": PROPERTY_ID})
        deleted = getattr(result, "deleted_count", 0)
        print(f"Deleted {deleted} slider demo property.")
    finally:
        if client:
            client.close()
        elif DATABASE_TYPE == "postgres" and hasattr(db, "close"):
            await db.close()


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--undo", action="store_true")
    args = parser.parse_args()
    if args.undo:
        await undo()
    else:
        await seed()


if __name__ == "__main__":
    asyncio.run(main())
