"""Seed demo LIVE properties for Guest Search & Discovery."""
import asyncio
import os
from datetime import datetime
from pathlib import Path

# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
DATABASE_TYPE = os.environ.get("DATABASE_TYPE", "mongo")
POSTGRES_URL = os.environ.get("POSTGRES_URL")


DEMO_PROPERTIES = [
    # 1. GOA
    {
        "title": "The Whispering Palms Villa, Candolim",
        "description": "Exquisite 4-bedroom luxury villa featuring a private infinity pool, lush tropical gardens, and personal chef services just steps from Candolim Beach.",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "4bhk",
        "address": "Candolim Beach Road, near Taj Fort Aguada",
        "city": "Goa",
        "state": "Goa",
        "pin_code": "403515",
        "latitude": 15.5164,
        "longitude": 73.7632,
        "area_sqft": 4500,
        "price_per_night": 22000,
        "amenities": ["wifi", "pool", "ac", "parking", "kitchen", "chef", "jacuzzi"],
        "images": [
            "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Goa Beachfront Coworking Hub",
        "description": "Premium commercial coworking workspace right next to the beach, with high-speed WiFi, conference rooms, and gourmet coffee bar.",
        "property_type": "co_working",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Anjuna Beach Road",
        "city": "Goa",
        "state": "Goa",
        "pin_code": "403509",
        "latitude": 15.5824,
        "longitude": 73.7423,
        "area_sqft": 3000,
        "price_per_night": 4500,
        "amenities": ["wifi", "ac", "parking", "coffee", "printer"],
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Goa Beachside Party Lawn",
        "description": "Ultimate outdoor beachside venue perfect for weddings, concerts, and luxury corporate events under the palms.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Morjim Beach Road",
        "city": "Goa",
        "state": "Goa",
        "pin_code": "403512",
        "latitude": 15.6455,
        "longitude": 73.7311,
        "area_sqft": 20000,
        "price_per_night": 85000,
        "amenities": ["parking", "stage", "bar", "catering", "sea_view"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": True,
    },

    # 2. UDAIPUR
    {
        "title": "Royal Lakefront Palace, Udaipur",
        "description": "Magnificent 5-bedroom heritage palace stay overlooking Lake Pichola. Features hand-painted frescoes, private courtyard, and boat dock access.",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "5bhk",
        "address": "Pichola Lake Side, Near City Palace",
        "city": "Udaipur",
        "state": "Rajasthan",
        "pin_code": "313001",
        "latitude": 24.5764,
        "longitude": 73.6835,
        "area_sqft": 6500,
        "price_per_night": 45000,
        "amenities": ["wifi", "ac", "parking", "kitchen", "rooftop", "lake_view", "butler"],
        "images": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },
    {
        "title": "Udaipur Heritage Business Center",
        "description": "Luxurious corporate workspaces with traditional Rajasthani design accents, equipped with premium meeting rooms and business lounge.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Fateh Sagar Lake Road",
        "city": "Udaipur",
        "state": "Rajasthan",
        "pin_code": "313001",
        "latitude": 24.6021,
        "longitude": 73.6745,
        "area_sqft": 2500,
        "price_per_night": 6000,
        "amenities": ["wifi", "ac", "parking", "coffee", "lake_view"],
        "images": [
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Udaipur Palace Lakeview Lawn",
        "description": "Heritage celebration lawns and banquet venue offering stunning royal background views of Lake Pichola.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Haridas Ji Ki Magri",
        "city": "Udaipur",
        "state": "Rajasthan",
        "pin_code": "313001",
        "latitude": 24.5888,
        "longitude": 73.6655,
        "area_sqft": 18000,
        "price_per_night": 95000,
        "amenities": ["parking", "stage", "catering", "lake_view"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },

    # 3. MANALI
    {
        "title": "The Oakwood Alpine Chalet, Manali",
        "description": "Cozy 3-bedroom wooden chalet in Solang Valley. Panoramic views of snow-capped peaks, large brick fireplace, and glass sunroom.",
        "property_type": "independent_house",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "Solang Valley Road",
        "city": "Manali",
        "state": "Himachal Pradesh",
        "pin_code": "175131",
        "latitude": 32.3164,
        "longitude": 77.1632,
        "area_sqft": 2800,
        "price_per_night": 14500,
        "amenities": ["wifi", "fireplace", "parking", "kitchen", "heating", "balcony"],
        "images": [
            "https://images.unsplash.com/photo-1518733057094-95b53143d2a7?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Manali Mountain View Workspace",
        "description": "Commercial co-working retreat cabin designed for digital nomads. Features heated desks, high-speed fiber internet, and mountain views.",
        "property_type": "co_working",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Old Manali Rd",
        "city": "Manali",
        "state": "Himachal Pradesh",
        "pin_code": "175131",
        "latitude": 32.2599,
        "longitude": 77.1856,
        "area_sqft": 1200,
        "price_per_night": 3000,
        "amenities": ["wifi", "heating", "parking", "coffee", "balcony"],
        "images": [
            "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Manali Snowpeaks Celebration Meadow",
        "description": "Breathtaking outdoor events valley venue surrounded by cedar forests, perfect for weddings and winter parties.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Solang Valley base",
        "city": "Manali",
        "state": "Himachal Pradesh",
        "pin_code": "175131",
        "latitude": 32.3211,
        "longitude": 77.1544,
        "area_sqft": 25000,
        "price_per_night": 70000,
        "amenities": ["parking", "stage", "catering", "heating", "mountain_view"],
        "images": [
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": True,
    },

    # 4. ALIBAUG
    {
        "title": "Coconut Grove Beach Villa, Alibaug",
        "description": "Modern 3-bedroom villa nestled inside a coconut orchard. Steps from Varsoli beach, features a private plunge pool and open-air gazebo.",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "Varsoli Beach Road",
        "city": "Alibaug",
        "state": "Maharashtra",
        "pin_code": "402201",
        "latitude": 18.6725,
        "longitude": 72.8835,
        "area_sqft": 3200,
        "price_per_night": 18000,
        "amenities": ["wifi", "pool", "ac", "parking", "kitchen", "gazebo", "bbq"],
        "images": [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Alibaug Coastal Business Retreat",
        "description": "Executive meeting rooms and corporate workspace close to Alibaug port, ideal for offsite board meetings.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Rewas Road",
        "city": "Alibaug",
        "state": "Maharashtra",
        "pin_code": "402201",
        "latitude": 18.6912,
        "longitude": 72.8999,
        "area_sqft": 1800,
        "price_per_night": 7500,
        "amenities": ["wifi", "ac", "parking", "coffee", "sea_view"],
        "images": [
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Alibaug Coconut Orchard Party Lawn",
        "description": "Lush tropical green lawn perfect for premium weddings, receptions, and birthday banquets.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Nagaon Beach Road",
        "city": "Alibaug",
        "state": "Maharashtra",
        "pin_code": "402201",
        "latitude": 18.6311,
        "longitude": 72.9102,
        "area_sqft": 15000,
        "price_per_night": 55000,
        "amenities": ["parking", "stage", "catering", "bbq"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": True,
    },

    # 5. KARJAT
    {
        "title": "Elysium Glasshouse Villa, Karjat",
        "description": "Ultra-modern 4-bedroom architectural masterpiece with glass facades, private infinity pool, and striking view of the Western Ghats waterfalls.",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "4bhk",
        "address": "Ghat Road, Karjat Hills",
        "city": "Karjat",
        "state": "Maharashtra",
        "pin_code": "410201",
        "latitude": 18.9102,
        "longitude": 73.3284,
        "area_sqft": 5200,
        "price_per_night": 26000,
        "amenities": ["wifi", "pool", "ac", "parking", "kitchen", "gym", "game_room"],
        "images": [
            "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Karjat Eco-Tech Workspace",
        "description": "A green-themed, solar-powered commercial office offering private suites, shared coworking desks and ultra high-speed backup internet.",
        "property_type": "co_working",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Karjat Station Road",
        "city": "Karjat",
        "state": "Maharashtra",
        "pin_code": "410201",
        "latitude": 18.9155,
        "longitude": 73.3299,
        "area_sqft": 1500,
        "price_per_night": 4000,
        "amenities": ["wifi", "ac", "parking", "coffee"],
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Karjat Waterfall Wedding Lawn",
        "description": "Stunning private estate featuring an actual seasonal waterfall backdrop, ideal for luxury destination weddings.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Halivali Hills",
        "city": "Karjat",
        "state": "Maharashtra",
        "pin_code": "410201",
        "latitude": 18.8955,
        "longitude": 73.3411,
        "area_sqft": 30000,
        "price_per_night": 120000,
        "amenities": ["parking", "stage", "catering", "pool"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": True,
    },

    # 6. MUSSOORIE
    {
        "title": "The Pine Wood Estate, Landour",
        "description": "Charming 4-bedroom colonial-era stone estate surrounded by old pine trees. Features antique furniture, library, and dramatic Himalayan sunset views.",
        "property_type": "independent_house",
        "category": "residential",
        "bhk_type": "4bhk",
        "address": "Upper Mall Road, Landour",
        "city": "Mussoorie",
        "state": "Uttarakhand",
        "pin_code": "248179",
        "latitude": 30.4624,
        "longitude": 78.0932,
        "area_sqft": 4000,
        "price_per_night": 19500,
        "amenities": ["wifi", "parking", "kitchen", "fireplace", "heating", "library"],
        "images": [
            "https://images.unsplash.com/photo-1549517045-bc93de075e53?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },
    {
        "title": "Mussoorie Pinehills Co-working",
        "description": "Charming rustic design coworking and private meeting rooms overlooking the snowcapped ranges.",
        "property_type": "co_working",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Library Road",
        "city": "Mussoorie",
        "state": "Uttarakhand",
        "pin_code": "248179",
        "latitude": 30.4599,
        "longitude": 78.0722,
        "area_sqft": 1400,
        "price_per_night": 3200,
        "amenities": ["wifi", "heating", "parking", "coffee"],
        "images": [
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Mussoorie Himalayan Sunset Deck",
        "description": "Scenic rooftop event banquet space ideal for high-altitude product launches and premium private gatherings.",
        "property_type": "rooftop",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Lal Tibba View Point Rd",
        "city": "Mussoorie",
        "state": "Uttarakhand",
        "pin_code": "248179",
        "latitude": 30.4688,
        "longitude": 78.1011,
        "area_sqft": 8000,
        "price_per_night": 65000,
        "amenities": ["parking", "stage", "bar", "catering", "mountain_view"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },

    # 7. WAYANAD
    {
        "title": "Emerald Rainforest Retreat, Vythiri",
        "description": "Charming 2-bedroom eco-luxe wooden villa built inside Wayanad's rainforest canopy. Private jacuzzi, natural spring pool, and bird watching deck.",
        "property_type": "independent_house",
        "category": "residential",
        "bhk_type": "2bhk",
        "address": "Vythiri Forest Reserve",
        "city": "Wayanad",
        "state": "Kerala",
        "pin_code": "673576",
        "latitude": 11.5542,
        "longitude": 76.0384,
        "area_sqft": 1800,
        "price_per_night": 11000,
        "amenities": ["wifi", "parking", "jacuzzi", "deck", "forest_view"],
        "images": [
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Wayanad Forest Edge Office",
        "description": "A tranquil corporate retreat office cabin with direct views of green plantations, high speed fiber and silent backup generator.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Kalpetta Bypass Road",
        "city": "Wayanad",
        "state": "Kerala",
        "pin_code": "673121",
        "latitude": 11.6055,
        "longitude": 76.0822,
        "area_sqft": 1000,
        "price_per_night": 3500,
        "amenities": ["wifi", "ac", "parking", "coffee"],
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Wayanad Rainforest Celebration Valley",
        "description": "Premium valley venue nestled between tea plantations, offering a tropical green paradise for outdoor weddings.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Meppadi Hill Route",
        "city": "Wayanad",
        "state": "Kerala",
        "pin_code": "673577",
        "latitude": 11.5422,
        "longitude": 76.1211,
        "area_sqft": 22000,
        "price_per_night": 75000,
        "amenities": ["parking", "stage", "catering", "forest_view"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": True,
    },

    # 8. OOTY
    {
        "title": "Highland Valley Cottage, Ooty",
        "description": "Scenic 3-bedroom colonial cottage nestled inside a tea estate. Fireplace in bedrooms, organic vegetable patch, and direct valley views.",
        "property_type": "independent_house",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "Doddabetta Estate Road",
        "city": "Ooty",
        "state": "Tamil Nadu",
        "pin_code": "643001",
        "latitude": 11.4102,
        "longitude": 76.7384,
        "area_sqft": 2400,
        "price_per_night": 12500,
        "amenities": ["wifi", "fireplace", "parking", "kitchen", "valley_view", "tea_garden"],
        "images": [
            "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&q=80&w=1200",
            "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1200",
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Ooty Tea-Garden Business Cabin",
        "description": "Stunning private meeting cabin built next to organic tea gardens, equipped with modular workstations and high-speed satellite WiFi.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Coonoor Road",
        "city": "Ooty",
        "state": "Tamil Nadu",
        "pin_code": "643001",
        "latitude": 11.4255,
        "longitude": 76.7112,
        "area_sqft": 1100,
        "price_per_night": 4200,
        "amenities": ["wifi", "parking", "coffee", "tea_garden"],
        "images": [
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Ooty Doddabetta Valley Banquet",
        "description": "High-altitude glass banquet hall offering 360-degree panoramic views of Ooty's valleys and cloud lines.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Doddabetta Peak Peak Rd",
        "city": "Ooty",
        "state": "Tamil Nadu",
        "pin_code": "643002",
        "latitude": 11.4011,
        "longitude": 76.7422,
        "area_sqft": 12000,
        "price_per_night": 80000,
        "amenities": ["parking", "stage", "catering", "heating", "valley_view"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },

    # 9. NASHIK
    {
        "title": "Taj Valley View Villa, Nashik",
        "description": "Premium 4-bedroom villa nested in the Nashik vineyards with a private swimming pool, outdoor deck, and wine-tasting lounge.",
        "property_type": "villa",
        "category": "residential",
        "bhk_type": "4bhk",
        "address": "Trimbakeshwar Road",
        "city": "Nashik",
        "state": "Maharashtra",
        "pin_code": "422007",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "area_sqft": 4500,
        "price_per_night": 18500,
        "amenities": ["wifi", "pool", "ac", "parking", "kitchen", "rooftop"],
        "images": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Nashik IT Park Workspace",
        "description": "Premium commercial office desks and private meeting rooms with corporate high-speed fiber internet and security.",
        "property_type": "private_office",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Ambad Link Road",
        "city": "Nashik",
        "state": "Maharashtra",
        "pin_code": "422010",
        "latitude": 19.9542,
        "longitude": 73.7329,
        "area_sqft": 1500,
        "price_per_night": 5000,
        "amenities": ["wifi", "ac", "parking", "coffee", "printer"],
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Goldenrich STR Banquet, College Road",
        "description": "Grand banquet hall and conference center perfect for up to 300 guests with central air conditioning and audio system.",
        "property_type": "banquet_hall",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "College Road",
        "city": "Nashik",
        "state": "Maharashtra",
        "pin_code": "422005",
        "latitude": 20.0078,
        "longitude": 73.7656,
        "area_sqft": 6000,
        "price_per_night": 45000,
        "amenities": ["ac", "stage", "parking", "av_system", "catering"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": False,
    },

    # 10. PUNE
    {
        "title": "Koregaon Park Luxury Suite",
        "description": "Exquisite 3-bedroom modern apartment located in the prime green belt of Koregaon Park, features smart home automation.",
        "property_type": "apartment",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "Lane 5, Koregaon Park",
        "city": "Pune",
        "state": "Maharashtra",
        "pin_code": "411001",
        "latitude": 18.5362,
        "longitude": 73.8935,
        "area_sqft": 2600,
        "price_per_night": 12000,
        "amenities": ["wifi", "ac", "parking", "kitchen", "gym", "balcony"],
        "images": [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Downtown Premium Office Desk",
        "description": "Premium dedicated desks in a shared co-working office, high-speed WiFi, free gourmet coffee and meeting cabins.",
        "property_type": "co_working",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "MG Road",
        "city": "Pune",
        "state": "Maharashtra",
        "pin_code": "411001",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "area_sqft": 100,
        "price_per_night": 1200,
        "amenities": ["wifi", "ac", "parking", "coffee"],
        "images": [
            "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Pune Rooftop Lounge Venue",
        "description": "Gorgeous open-air sky lounge venue for corporate parties, product launches, and private functions.",
        "property_type": "rooftop",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Viman Nagar Skyline",
        "city": "Pune",
        "state": "Maharashtra",
        "pin_code": "411014",
        "latitude": 18.5677,
        "longitude": 73.9122,
        "area_sqft": 9000,
        "price_per_night": 75000,
        "amenities": ["parking", "stage", "bar", "catering", "city_view"],
        "images": [
            "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },

    # 11. MUMBAI
    {
        "title": "Bandra Sea-Facing Apartment",
        "description": "Luxurious 3-bedroom sky apartment overlooking the sea link, offering premium marble finishes, smart controls, and concierge.",
        "property_type": "apartment",
        "category": "residential",
        "bhk_type": "3bhk",
        "address": "Carter Road, Bandra West",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400050",
        "latitude": 19.0688,
        "longitude": 72.8211,
        "area_sqft": 3000,
        "price_per_night": 35000,
        "amenities": ["wifi", "ac", "parking", "kitchen", "sea_view", "concierge"],
        "images": [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": True,
    },
    {
        "title": "Corporate Meeting Room, BKC",
        "description": "Professional 12-seater conference and meeting room with projector and white-board in the heart of BKC.",
        "property_type": "meeting_room",
        "category": "commercial",
        "bhk_type": "commercial",
        "address": "Bandra Kurla Complex",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400051",
        "latitude": 19.0596,
        "longitude": 72.8295,
        "area_sqft": 400,
        "price_per_night": 8000,
        "amenities": ["wifi", "ac", "tv", "white-board"],
        "images": [
            "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": True,
        "pet_friendly": False,
    },
    {
        "title": "Luxury Yacht Event Deck",
        "description": "Ultimate private yacht event venue for premium sunset cruise celebrations in the Mumbai harbor.",
        "property_type": "rooftop",
        "category": "event_venue",
        "bhk_type": "banquet",
        "address": "Gateway of India Marina",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pin_code": "400001",
        "latitude": 18.9220,
        "longitude": 72.8347,
        "area_sqft": 3000,
        "price_per_night": 120000,
        "amenities": ["bar", "av_system", "kitchen", "catering"],
        "images": [
            "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&q=80&w=1200"
        ],
        "instant_booking": False,
        "pet_friendly": False,
    }
]


async def seed():
    if DATABASE_TYPE == 'postgres':
        from utils.pg_adapter import PGAdapter
        db = PGAdapter(POSTGRES_URL)
        await db.connect()
        await db.ensure_table("users")
        await db.ensure_table("properties")
        client = None
    else:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]

    host = await db.users.find_one({"email": "host@propnest.com"}, {"_id": 0})
    if not host:
        # Try alternate emails
        host = await db.users.find_one({"email": "host@goldenrichstay.com"}, {"_id": 0})
        
    if not host:
        # Find any user that is a host or admin to act as owner
        host = await db.users.find_one({"role": "host"}, {"_id": 0})
        if not host:
            host = await db.users.find_one({}, {"_id": 0})
            
    if not host:
        print("ERROR: No host or admin user found to link properties. Run seed_users.py first.")
        return

    owner_id = host["user_id"]

    # Delete existing demo properties first to avoid duplication
    print("Clearing existing demo properties...")
    await db.properties.delete_many({"property_id": {"$regex": "^prop_demo_"}})

    inserted = 0

    for idx, data in enumerate(DEMO_PROPERTIES):
        max_guests = 6
        veg_price = None
        non_veg_price = None
        
        category_lower = data["category"].lower()
        if category_lower == "commercial":
            max_guests = 15
        elif category_lower == "event_venue":
            max_guests = 500
            if "yacht" in data["title"].lower():
                veg_price = 1500.0
                non_veg_price = 2500.0
            elif "lounge" in data["title"].lower() or "rooftop" in data["title"].lower():
                veg_price = 800.0
                non_veg_price = 1200.0
            elif "banquet" in data["title"].lower() or "lawn" in data["title"].lower():
                veg_price = 500.0
                non_veg_price = 700.0
            else:
                veg_price = 450.0
                non_veg_price = 650.0
        else: # residential
            bhk_lower = data.get("bhk_type", "").lower()
            if "studio" in bhk_lower:
                max_guests = 2
            elif "1bhk" in bhk_lower:
                max_guests = 2
            elif "2bhk" in bhk_lower:
                max_guests = 4
            elif "3bhk" in bhk_lower:
                max_guests = 6
            elif "4bhk" in bhk_lower:
                max_guests = 8
            else:
                max_guests = 6

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
            "max_guests": max_guests,
            "veg_price": veg_price,
            "non_veg_price": non_veg_price,
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

    # Seed subscription coupons
    print("\nSeeding demo subscription coupons...")
    await db.coupons.delete_many({"coupon_type": "subscription"})
    demo_coupons = [
        {
            "coupon_id": "coup_sub_50_pct",
            "code": "SUB50",
            "discount_type": "percentage",
            "discount_value": 50.0,
            "coupon_type": "subscription",
            "property_id": None,
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "coupon_id": "coup_sub_welcome_500",
            "code": "SUBWELCOME",
            "discount_type": "fixed",
            "discount_value": 500.0,
            "coupon_type": "subscription",
            "property_id": None,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]
    for coupon in demo_coupons:
        await db.coupons.insert_one(coupon)
        print(f"  + Coupon: {coupon['code']} ({coupon['discount_value']} discount)")

    print(f"\nDone. Inserted {inserted} new luxury stay demo properties.")
    if client:
        client.close()
    if hasattr(db, 'pool') and db.pool:
        await db.pool.close()


if __name__ == "__main__":
    asyncio.run(seed())
