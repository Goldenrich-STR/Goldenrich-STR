"""Seed demo LIVE properties for Guest Search & Discovery."""
import asyncio
import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]


DEMO_PROPERTIES = [
    {
        "title": "Sea Breeze Villa, Anjuna",
        "description": "3-bedroom beachside villa with private pool and sunset views.",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "Anjuna Beach Road",
        "city": "Goa",
        "state": "Goa",
        "pin_code": "403509",
        "latitude": 15.5736,
        "longitude": 73.7407,
        "area_sqft": 2200,
        "price_per_night": 8500,
        "amenities": ["wifi", "pool", "ac", "parking", "kitchen"],
        "images": [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
            "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Skyline Studio, Bandra",
        "description": "Modern studio apartment with city view, walking distance to Carter Road.",
        "property_type": "studio",
        "category": "residential",
        "bhk_type": "studio",
        "address": "Pali Hill",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400050",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "area_sqft": 550,
        "price_per_night": 3200,
        "amenities": ["wifi", "ac", "kitchen", "tv"],
        "images": [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Heritage Haveli, Old Jaipur",
        "description": "Restored haveli with frescoed walls, central courtyard and rooftop dining.",
        "property_type": "independent_house",
        "category": "residential",
        "bhk_type": "4bhk",
        "address": "Chandpole Bazaar",
        "city": "Jaipur",
        "state": "Rajasthan",
        "pin_code": "302001",
        "latitude": 26.9239,
        "longitude": 75.8167,
        "area_sqft": 3800,
        "price_per_night": 12500,
        "amenities": ["wifi", "ac", "parking", "kitchen", "rooftop"],
        "images": [
            "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },
    {
        "title": "Tech Park Co-Working Suite",
        "description": "8-seat private office in Whitefield tech park with high-speed fiber.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "ITPL Main Road, Whitefield",
        "city": "Bangalore",
        "state": "Karnataka",
        "pin_code": "560066",
        "latitude": 12.9698,
        "longitude": 77.7500,
        "area_sqft": 600,
        "price_per_night": 4500,
        "amenities": ["wifi", "ac", "parking", "coffee", "printer"],
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Lakeview Banquet Hall, Hussain Sagar",
        "description": "Air-conditioned banquet hall seats 250 with stage and full A/V.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Necklace Road",
        "city": "Hyderabad",
        "state": "Telangana",
        "pin_code": "500080",
        "latitude": 17.4239,
        "longitude": 78.4738,
        "area_sqft": 5000,
        "price_per_night": 35000,
        "amenities": ["ac", "stage", "parking", "av_system", "catering"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800",
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },
    {
        "title": "Hill Cottage, Manali",
        "description": "Wooden cottage with fireplace, mountain view balcony, 2 bedrooms.",
        "property_type": "independent_house",
        "category": "residential",
        "bhk_type": "2bhk",
        "address": "Old Manali Road",
        "city": "Manali",
        "state": "Himachal Pradesh",
        "pin_code": "175131",
        "latitude": 32.2396,
        "longitude": 77.1887,
        "area_sqft": 1100,
        "price_per_night": 4800,
        "amenities": ["wifi", "fireplace", "parking", "kitchen"],
        "images": [
            "https://images.unsplash.com/photo-1518733057094-95b53143d2a7?w=800",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Powai Lakeview Apartment",
        "description": "2BHK in Hiranandani with full lake view, gated community, gym + pool.",
        "property_type": "apartment",
        "category": "residential",
        "bhk_type": "2bhk",
        "address": "Hiranandani Gardens",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400076",
        "latitude": 19.1197,
        "longitude": 72.9156,
        "area_sqft": 950,
        "price_per_night": 5500,
        "amenities": ["wifi", "ac", "pool", "gym", "parking", "kitchen"],
        "images": [
            "https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800",
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Rooftop Lounge, Connaught Place",
        "description": "Open-air rooftop lounge perfect for product launches and parties (capacity 80).",
        "property_type": "rooftop",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Block A, Inner Circle",
        "city": "New Delhi",
        "state": "Delhi",
        "pin_code": "110001",
        "latitude": 28.6315,
        "longitude": 77.2167,
        "area_sqft": 2200,
        "price_per_night": 22000,
        "amenities": ["bar", "av_system", "parking", "restrooms"],
        "images": [
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800",
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },
]


async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    host = await db.users.find_one({"email": "host@propnest.com"}, {"_id": 0})
    if not host:
        print("ERROR: host@propnest.com not found. Run seed_users.py first.")
        return

    owner_id = host["user_id"]
    inserted = 0
    skipped = 0

    for idx, data in enumerate(DEMO_PROPERTIES):
        # Skip if a demo property with same title already exists
        existing = await db.properties.find_one({"title": data["title"]})
        if existing:
            skipped += 1
            continue

        prop_id = f"prop_demo_{idx + 1}_{int(datetime.utcnow().timestamp())}"
        doc = {
            "property_id": prop_id,
            "owner_id": owner_id,
            "broker_id": None,
            "title": data["title"],
            "description": data["description"],
            "property_type": data["property_type"],
            "category": data["category"],
            "bhk_type": data["bhk_type"],
            "address": data["address"],
            "city": data["city"],
            "state": data["state"],
            "pin_code": data["pin_code"],
            "latitude": data["latitude"],
            "longitude": data["longitude"],
            "area_sqft": data["area_sqft"],
            "price_per_night": data["price_per_night"],
            "price_per_week": None,
            "price_per_month": None,
            "minimum_stay_days": 1,
            "amenities": data["amenities"],
            "images": data["images"],
            "virtual_tour_link": None,
            "house_rules": None,
            "pet_friendly": data["pet_friendly"],
            "smoking_allowed": False,
            "instant_booking": data["instant_booking"],
            "status": "live",
            "verification_remarks": None,
            "blocked_dates": [],
            "subscription_id": None,
            "subscription_status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "submitted_at": datetime.utcnow(),
            "approved_at": datetime.utcnow(),
        }
        await db.properties.insert_one(doc)
        inserted += 1
        print(f"  + {data['title']} ({prop_id})")

    print(f"\nDone. Inserted {inserted}, skipped {skipped} (already exist).")
    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
