from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from pydantic import BaseModel
from models.property import Property, PropertyCreate, PropertyUpdate, PropertyStatus, PropertyCategory
from models.subscription import SubscriptionStatus
from models.user import UserRole
from models.notification import NotificationChannel, NotificationType
from middleware.auth_middleware import get_current_user, require_role
from services.notification_service import send_multi_channel_notification
from services.booking_calculation_service import (
    BOOKING_CHARGE_KEYS,
    PLATFORM_FEE_CONTEXT_BROKER,
    PLATFORM_FEE_CONTEXT_DEFAULT,
    PLATFORM_FEE_CONTEXT_RM,
    as_float,
    calculate_configured_charges_total,
    get_booking_payment_config,
    money,
)
from services.nearby_property_service import (
    DEFAULT_RADIUS_METERS,
    find_nearby_properties,
)
from utils.property_urls import build_property_path, build_property_slug, extract_property_id
from datetime import datetime, timezone
import asyncio
import logging
import math
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/properties", tags=["Properties"])

HOST_MANAGE_EDITABLE_STATUSES = {
    PropertyStatus.PENDING_VERIFICATION.value,
    PropertyStatus.UNDER_REVIEW.value,
    PropertyStatus.LIVE.value,
}

HOST_MANAGE_EDITABLE_FIELDS = {
    "price_per_night",
    "pricing_display_mode",
    "per_person_price",
    "extra_guest_price",
    "pricing_cycle",
    "minimum_stay_days",
    "house_rules",
    "pet_friendly",
    "smoking_allowed",
    "instant_booking",
    "booking_mode",
    "has_cook",
    "cook_price",
    "has_self_cook",
    "has_taxi",
    "veg_price",
    "non_veg_price",
    "food_type",
    "guest_size",
    "packages",
    "check_in_time",
    "check_out_time",
    "amenities",
    "images",
    "video_url",
    "youtube_short_url",
    "youtube_long_url",
}

INSTANT_BOOK_MODE = "INSTANT_BOOK"
HOST_APPROVAL_MODE = "HOST_APPROVAL"
HOST_APPROVAL_SLA_MINUTES = 24 * 60
DISALLOWED_PROPERTY_MEDIA_HOSTS = {
    "example.com",
    "www.example.com",
    "images.unsplash.com",
    "source.unsplash.com",
    "unsplash.com",
    "images.pexels.com",
    "videos.pexels.com",
    "pexels.com",
    "picsum.photos",
    "placeholder.com",
    "via.placeholder.com",
    "placehold.co",
    "dummyimage.com",
}


async def get_db():
    from server import db_instance
    return db_instance


@router.get("/nearby")
async def nearby_properties(
    lat: float = Query(..., description="User/current map latitude"),
    lng: float = Query(..., description="User/current map longitude"),
    radius: int = Query(
        DEFAULT_RADIUS_METERS,
        ge=1,
        le=20000,
        description="Search radius in meters. Default 5000.",
    ),
    checkIn: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    checkOut: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    guests: Optional[int] = Query(None, ge=1),
    propertyType: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    minPrice: Optional[float] = Query(None, ge=0),
    maxPrice: Optional[float] = Query(None, ge=0),
    instantBook: Optional[bool] = Query(None),
    limit: int = Query(100, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return compact LIVE property markers around a coordinate without exposing full listing payloads."""
    return await find_nearby_properties(
        db,
        lat=lat,
        lng=lng,
        radius=radius,
        check_in=checkIn,
        check_out=checkOut,
        guests=guests,
        property_type=propertyType,
        category=category,
        min_price=minPrice,
        max_price=maxPrice,
        instant_book=instantBook,
        limit=limit,
    )


def _normalize_booking_mode(prop: dict) -> dict:
    mode = INSTANT_BOOK_MODE
    prop["booking_mode"] = mode
    prop["instant_booking"] = mode == INSTANT_BOOK_MODE
    prop["host_approval_required"] = mode == HOST_APPROVAL_MODE
    prop["host_approval_sla_minutes"] = HOST_APPROVAL_SLA_MINUTES if mode == HOST_APPROVAL_MODE else None
    return prop


def _is_disallowed_property_media_url(value: str) -> bool:
    if not value:
        return False
    lowered = value.strip().lower()
    return any(host in lowered for host in DISALLOWED_PROPERTY_MEDIA_HOSTS)


def _sanitize_property_media(payload: dict) -> dict:
    images = payload.get("images")
    if isinstance(images, list):
        payload["images"] = [
            image
            for image in images
            if isinstance(image, str)
            and image.strip()
            and not _is_disallowed_property_media_url(image)
        ]
    for key in ("video_url", "youtube_short_url", "youtube_long_url"):
        value = payload.get(key)
        if isinstance(value, str) and _is_disallowed_property_media_url(value):
            payload[key] = None
    return payload

def _property_host_nightly_price(prop: dict) -> float:
    try:
        raw_price = prop.get("base_price") if prop.get("base_price") not in (None, "") else prop.get("price_per_night")
        return float(raw_price or 0)
    except (TypeError, ValueError):
        return 0.0


def _mapped_value(*values) -> bool:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized and normalized not in {"na", "n/a", "none", "null", "-"}:
                return True
        elif value:
            return True
    return False


def _is_rm_user(user: Optional[dict]) -> bool:
    user = user or {}
    role = str(user.get("role") or "").strip().lower()
    role_key = str(user.get("admin_role_key") or user.get("designation") or "").strip().lower()
    return role in {"rm", "relationship_manager"} or role_key in {"rm", "relationship_manager"} or "relationship manager" in role_key


def _is_broker_user(user: Optional[dict]) -> bool:
    user = user or {}
    role = str(user.get("role") or "").strip().lower()
    return role == "broker"


async def _property_platform_fee_context(db: AsyncIOMotorDatabase, prop: dict, owner: Optional[dict] = None) -> str:
    owner = owner or {}
    first_verifier_id = (
        prop.get("broker_id")
        or prop.get("managed_by_broker_id")
        or prop.get("created_by_user_id")
    )
    if _mapped_value(prop.get("broker_id")) and str(prop.get("broker_id")).strip() == str(prop.get("rm_id") or "").strip():
        return PLATFORM_FEE_CONTEXT_RM
    if (
        _mapped_value(prop.get("broker_id"), prop.get("rm_id"), prop.get("branch_manager_id"))
        and str(prop.get("rm_id")).strip() == str(prop.get("branch_manager_id")).strip()
        and str(prop.get("broker_id")).strip() != str(prop.get("rm_id")).strip()
    ):
        return PLATFORM_FEE_CONTEXT_RM
    if _mapped_value(prop.get("broker_id"), prop.get("branch_manager_id")) and not _mapped_value(prop.get("broker_lg_code"), prop.get("managed_by_broker_id")):
        verifier = await db.users.find_one({"user_id": prop.get("broker_id")}, {"_id": 0, "role": 1, "admin_role_key": 1, "designation": 1})
        if _is_rm_user(verifier):
            return PLATFORM_FEE_CONTEXT_RM
    if _mapped_value(first_verifier_id):
        verifier = await db.users.find_one({"user_id": first_verifier_id}, {"_id": 0, "role": 1, "admin_role_key": 1, "designation": 1})
        if _is_rm_user(verifier):
            return PLATFORM_FEE_CONTEXT_RM
        if _is_broker_user(verifier):
            return PLATFORM_FEE_CONTEXT_BROKER

    if _mapped_value(
        prop.get("broker_id"),
        prop.get("broker_lg_code"),
        prop.get("broker_code"),
        prop.get("assigned_broker_id"),
        owner.get("broker_id"),
        owner.get("broker_lg_code"),
        owner.get("lg_code"),
    ):
        return PLATFORM_FEE_CONTEXT_BROKER
    if _mapped_value(
        prop.get("rm_id"),
        prop.get("employee_id"),
        prop.get("assigned_employee_id"),
        prop.get("rm_code"),
        prop.get("employee_code"),
        owner.get("rm_id"),
        owner.get("employee_id"),
        owner.get("assigned_employee_id"),
        owner.get("employee_code"),
    ):
        return PLATFORM_FEE_CONTEXT_RM
    return PLATFORM_FEE_CONTEXT_DEFAULT


async def _add_customer_display_price(db: AsyncIOMotorDatabase, prop: dict, config: Optional[dict] = None) -> dict:
    try:
        config = config or await get_booking_payment_config(db)
        host_price = money(_property_host_nightly_price(prop))
        owner = None
        if prop.get("owner_id"):
            owner = await db.users.find_one({"user_id": prop.get("owner_id")}, {"_id": 0})
        platform_fee_context = await _property_platform_fee_context(db, prop, owner)
        display_price = money(host_price + calculate_configured_charges_total(
            host_price,
            config,
            platform_fee_context=platform_fee_context,
        ))
        prop["host_price_per_night"] = as_float(host_price)
        prop["display_price_per_night"] = as_float(display_price)
        prop["customer_price_per_night"] = as_float(display_price)
        prop["platform_fee_context"] = platform_fee_context
        prop["display_price_excludes_tax"] = True
        enabled_charges = [
            key
            for key in BOOKING_CHARGE_KEYS
            if (
                config.get("charges", {}).get(key, {}).get("enabled")
                or (
                    key == "platform_fee"
                    and platform_fee_context != PLATFORM_FEE_CONTEXT_DEFAULT
                    and (config.get("platform_fee_overrides", {}).get(platform_fee_context) or {}).get("enabled")
                )
            )
        ]
        prop["display_price_includes"] = enabled_charges
    except Exception as exc:
        logger.warning("Failed to add customer display price for %s: %s", prop.get("property_id"), exc)
    return _normalize_booking_mode(prop)


class DeletePropertyRequest(BaseModel):
    reason: str

@router.post("/", response_model=Property)
async def create_property(
    property_data: PropertyCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new property listing (Host only)."""
    try:
        # Check if user is a host
        if current_user["role"] != UserRole.HOST.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only hosts can create property listings"
            )
        
        # Fetch the host's profile to retrieve their registered broker_id, rm_id, and branch_manager_id
        host_user = await db.users.find_one({"user_id": current_user["user_id"]})
        host_broker_id = host_user.get("broker_id") if host_user else None
        host_rm_id = host_user.get("rm_id") if host_user else None
        host_bm_id = host_user.get("branch_manager_id") if host_user else None
        
        # Create property object
        create_payload = property_data.model_dump()
        create_payload = _normalize_booking_mode(create_payload)
        create_payload = _sanitize_property_media(create_payload)
        property_obj = Property(
            owner_id=current_user["user_id"],
            broker_id=host_broker_id,
            rm_id=host_rm_id,
            branch_manager_id=host_bm_id,
            **create_payload
        )
        
        # Insert into database
        property_dict = property_obj.model_dump()
        await db.properties.insert_one(property_dict)

        host_name = (
            (host_user or {}).get("full_name")
            or current_user.get("full_name")
            or current_user.get("email")
            or "Host"
        )
        location_parts = [
            getattr(property_obj, "city", "") or property_dict.get("city", ""),
            getattr(property_obj, "state", "") or property_dict.get("state", ""),
        ]
        location = ", ".join(part for part in location_parts if part) or "Location not specified"

        notification_result = await send_multi_channel_notification(
            db=db,
            user_id=current_user["user_id"],
            notification_type=NotificationType.PROPERTY_APPROVED,
            title="Property listed",
            message=(
                f"Your property '{property_obj.title}' has been listed successfully "
                "on X-Space360."
            ),
            channels=[
                NotificationChannel.IN_APP,
                NotificationChannel.WHATSAPP,
            ],
            data={
                "host_name": host_name,
                "property_id": property_obj.property_id,
                "property_title": property_obj.title,
                "location": location,
                "status": property_obj.status.value if hasattr(property_obj.status, "value") else property_obj.status,
            },
        )
        whatsapp_result = (notification_result.get("results") or {}).get("whatsapp", {})
        if whatsapp_result.get("success"):
            logger.info(
                "Property listed WhatsApp queued/sent: property=%s user=%s provider=%s",
                property_obj.property_id,
                current_user["user_id"],
                whatsapp_result.get("message_id"),
            )
        else:
            logger.warning(
                "Property listed WhatsApp failed: property=%s user=%s result=%s",
                property_obj.property_id,
                current_user["user_id"],
                whatsapp_result,
            )
        
        logger.info(f"Property created: {property_obj.property_id} by {current_user['user_id']} (broker assigned: {host_broker_id})")
        return property_obj
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create property"
        )

@router.get("/search")
async def search_properties(
    response: Response,
    search: Optional[str] = Query(None, description="Search text for property name, location, or description"),
    q: Optional[str] = Query(None, description="Alias for search"),
    category: Optional[PropertyCategory] = None,
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bhk_type: Optional[str] = None,
    amenities: Optional[str] = Query(None, description="Comma-separated amenities"),
    instant_booking: Optional[bool] = None,
    pet_friendly: Optional[bool] = None,
    guests: Optional[int] = Query(None, ge=1, description="Minimum guest capacity required"),
    max_guests: Optional[int] = Query(None, ge=1, description="Alias for guests/minimum guest capacity"),
    check_in: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    check_out: Optional[str] = Query(None, description="ISO date YYYY-MM-DD"),
    bbox: Optional[str] = Query(None, description="min_lat,min_lng,max_lat,max_lng for map viewport"),
    latitude: Optional[float] = Query(None, description="Center latitude for radius search"),
    longitude: Optional[float] = Query(None, description="Center longitude for radius search"),
    radius_km: Optional[float] = Query(None, gt=0, le=100, description="Radius in kilometers for coordinate search"),
    sort: Optional[str] = Query("recommended", description="recommended | price_asc | price_desc | newest"),
    limit: int = 50,
    skip: int = 0,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Search properties with filters (public endpoint)."""
    try:
        # Build query
        query = {
            "status": PropertyStatus.LIVE.value,
        }

        PROPERTY_TYPE_CATEGORY_MAP = {
            "apartment": "residential",
            "villa": "residential",
            "bungalow": "residential",
            "studio": "residential",
            "independent_house": "residential",
            "co_living": "residential",
            "resort": "residential",
            "private_office": "commercial",
            "co_working": "commercial",
            "meeting_room": "commercial",
            "conference_room": "commercial",
            "banquet_hall": "event_venue",
            "wedding_venue": "event_venue",
            "hotel_ballroom": "event_venue",
            "rooftop": "event_venue",
        }

        if property_type and not property_type.startswith("not:"):
            clean_types = [t.strip() for t in property_type.split(",") if t.strip()]
            if len(clean_types) == 1:
                single_type = clean_types[0]
                implied_cat = PROPERTY_TYPE_CATEGORY_MAP.get(single_type)
                if implied_cat and category and category.value != implied_cat:
                    logger.info(f"Auto-adjusting category filter from {category.value} to {implied_cat} due to property_type={single_type}")
                    category = None

        if category:
            query["category"] = category.value

        if search:
            escaped = re.escape(search.strip())
            query["$or"] = [
                {"title": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
                {"city": {"$regex": escaped, "$options": "i"}},
                {"state": {"$regex": escaped, "$options": "i"}},
                {"address": {"$regex": escaped, "$options": "i"}},
            ]

        radius_search = latitude is not None and longitude is not None and radius_km is not None

        HUB_LOCATIONS = {
            "trimbakeshwar": {
                "coords": (19.9323, 73.5305),
                "radius_km": 15.0,
                "pincodes": {"422212", "422213", "422220"},
                "keywords": ["trimbakeshwar", "trimbak", "trambak", "trimabk", "talwade"]
            },
            "nashik": {
                "coords": (19.9975, 73.7898),
                "radius_km": 20.0,
                "pincodes": {"422001", "422002", "422003", "422004", "422005", "422006", "422007", "422008", "422009", "422010", "422011", "422012", "422013", "422101", "422102", "422050"},
                "keywords": ["nashik", "nasik", "panchavati", "pathardi", "indira nagar", "cidco", "govind nagar", "satpur", "deolali"]
            },
            "sula": {
                "coords": (20.0059, 73.6889),
                "radius_km": 8.0,
                "pincodes": {"422222", "422013"},
                "keywords": ["sula", "vineyards", "savargaon"]
            },
            "gangapur": {
                "coords": (20.0081, 73.6846),
                "radius_km": 10.0,
                "pincodes": {"422222", "422013"},
                "keywords": ["gangapur", "dam", "savargaon"]
            },
            "igatpuri": {
                "coords": (19.6952, 73.5626),
                "radius_km": 15.0,
                "pincodes": {"422403", "422402", "422401"},
                "keywords": ["igatpuri", "ghoti", "vaitarna", "kasara"]
            },
            "anjaneri": {
                "coords": (19.9176, 73.5790),
                "radius_km": 8.0,
                "pincodes": {"422212", "422213"},
                "keywords": ["anjaneri"]
            },
            "harihar": {
                "coords": (19.9025, 73.4727),
                "radius_km": 12.0,
                "pincodes": {"422212"},
                "keywords": ["harihar", "fort", "harshagad", "nirgudpada"]
            },
            "bhandardara": {
                "coords": (19.5392, 73.7533),
                "radius_km": 20.0,
                "pincodes": {"414601", "422601", "422604"},
                "keywords": ["bhandardara", "shendi", "arthur lake", "wilson dam", "kalsubai"]
            }
        }

        def get_location_keywords(location: str) -> list:
            loc_lower = location.strip().lower()
            synonym_groups = [
                {"trimbakeshwar", "trimbak", "trambak", "trimabk", "talwade"},
                {"nashik", "nasik"},
                {"kokan", "konkan"},
                {"lonavala", "lonavla"},
                {"alibaug", "alibag"},
                {"mumbai", "bombay"},
                {"pune", "poona"},
                {"sula", "vineyards"},
                {"gangapur", "dam"},
                {"harihar", "fort", "harshagad"},
                {"mahabaleshwar", "mahableshwar"},
            ]
            for group in synonym_groups:
                if any(x in loc_lower for x in group) or any(loc_lower in x for x in group):
                    return list(group)
            return [location.strip()]

        def city_match_conditions(location: str) -> list:
            keywords = get_location_keywords(location)
            conditions = []
            for kw in keywords:
                escaped = re.escape(kw)
                conditions.extend([
                    {"city": {"$regex": escaped, "$options": "i"}},
                    {"state": {"$regex": escaped, "$options": "i"}},
                    {"address": {"$regex": escaped, "$options": "i"}},
                ])
            
            # Coordinate & Pincode bound checking based on Hub matching
            city_clean = location.strip().lower()
            for key, config in HUB_LOCATIONS.items():
                if city_clean == key or any(kw in city_clean for kw in config["keywords"]) or any(city_clean in kw for kw in config["keywords"]):
                    conditions.append({"pin_code": {"$in": list(config["pincodes"])}})
                    hub_lat, hub_lng = config["coords"]
                    rad = config["radius_km"]
                    lat_delta = rad / 111.0
                    lng_delta = rad / (111.0 * max(math.cos(math.radians(hub_lat)), 0.01))
                    conditions.append({
                        "latitude": {"$gte": hub_lat - lat_delta, "$lte": hub_lat + lat_delta},
                        "longitude": {"$gte": hub_lng - lng_delta, "$lte": hub_lng + lng_delta}
                    })
                    break
            return conditions

        def text_match_conditions(text: str) -> list:
            escaped = re.escape(text.strip())
            return [
                {"title": {"$regex": escaped, "$options": "i"}},
                {"description": {"$regex": escaped, "$options": "i"}},
                {"property_id": {"$regex": escaped, "$options": "i"}},
                {"city": {"$regex": escaped, "$options": "i"}},
                {"state": {"$regex": escaped, "$options": "i"}},
                {"address": {"$regex": escaped, "$options": "i"}},
                {"property_type": {"$regex": escaped, "$options": "i"}},
                {"bhk_type": {"$regex": escaped, "$options": "i"}},
            ]

        text_search = (search or q or "").strip()
        if city and not radius_search:
            query["$or"] = city_match_conditions(city)

        if text_search:
            search_filter = {"$or": text_match_conditions(text_search)}
            if "$or" in query:
                city_filter = {"$or": query.pop("$or")}
                query["$and"] = [city_filter, search_filter]
            else:
                query.update(search_filter)

        if property_type:
            if property_type.startswith("not:"):
                neg_val = property_type[4:]
                if "," in neg_val:
                    types = [t.strip() for t in neg_val.split(",") if t.strip()]
                    query["property_type"] = {"$nin": types}
                else:
                    query["property_type"] = {"$ne": neg_val.strip()}
            elif "," in property_type:
                types = [t.strip() for t in property_type.split(",") if t.strip()]
                query["property_type"] = {"$in": types}
            else:
                query["property_type"] = property_type

        if bhk_type:
            query["bhk_type"] = bhk_type

        if instant_booking is not None:
            query["instant_booking"] = instant_booking

        if pet_friendly is not None:
            query["pet_friendly"] = pet_friendly

        requested_guests = guests or max_guests
        if requested_guests is not None:
            query["max_guests"] = {"$gte": requested_guests}

        # Amenities filter
        if amenities:
            amenity_list = [a.strip() for a in amenities.split(",") if a.strip()]
            if amenity_list:
                query["amenities"] = {"$all": amenity_list}

        # Map viewport (bbox) filter
        if bbox:
            try:
                parts = [float(x) for x in bbox.split(",")]
                if len(parts) == 4:
                    min_lat, min_lng, max_lat, max_lng = parts
                    query["latitude"] = {"$gte": min_lat, "$lte": max_lat}
                    query["longitude"] = {"$gte": min_lng, "$lte": max_lng}
            except ValueError:
                pass

        if radius_search:
            lat_delta = radius_km / 111.0
            lng_delta = radius_km / (111.0 * max(math.cos(math.radians(latitude)), 0.01))
            query["latitude"] = {"$gte": latitude - lat_delta, "$lte": latitude + lat_delta}
            query["longitude"] = {"$gte": longitude - lng_delta, "$lte": longitude + lng_delta}

        # Date availability filter — exclude properties with overlapping confirmed/soft-locked bookings or blocked dates
        if check_in and check_out:
            if check_in >= check_out:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="check_out must be after check_in",
                )

            booked_props = await db.bookings.distinct(
                "property_id",
                {
                    "booking_status": {"$in": ["confirmed", "soft_lock"]},
                    "check_in_date": {"$lt": check_out},
                    "check_out_date": {"$gt": check_in},
                },
            )
            blocked_props = await db.blocked_dates.distinct(
                "property_id",
                {
                    "start_date": {"$lte": check_out},
                    "end_date": {"$gte": check_in},
                },
            )
            unavailable = list(set(booked_props) | set(blocked_props))
            if unavailable:
                query["property_id"] = {"$nin": unavailable}

        def numeric_price(prop: dict) -> float:
            try:
                return float(prop.get("base_price") if prop.get("base_price") not in (None, "") else prop.get("price_per_night") or 0)
            except (TypeError, ValueError):
                return 0

        projection = {
            "_id": 0,
            "property_id": 1,
            "owner_id": 1,
            "broker_id": 1,
            "broker_lg_code": 1,
            "broker_code": 1,
            "rm_id": 1,
            "employee_id": 1,
            "assigned_employee_id": 1,
            "rm_code": 1,
            "employee_code": 1,
            "branch_manager_id": 1,
            "managed_by_broker_id": 1,
            "created_by_user_id": 1,
            "title": 1,
            "property_type": 1,
            "category": 1,
            "bhk_type": 1,
            "city": 1,
            "address": 1,
            "state": 1,
            "latitude": 1,
            "longitude": 1,
            "max_guests": 1,
            "price_per_night": 1,
            "base_price": 1,
            "pricing_cycle": 1,
            "images": 1,
            "average_rating": 1,
            "reviews_count": 1,
            "rating": 1,
            "review_count": 1,
            "has_self_cook": 1,
            "status": 1,
            "subscription_id": 1,
            "is_boosted": 1,
            "boost_expires_at": 1,
            "boost_rank": 1,
            "created_at": 1
        }
        raw_properties = await db.properties.find(query, projection).to_list(length=1000)

        # Filter out properties whose subscription has expired (if they have subscription_id)
        sub_ids = [p["subscription_id"] for p in raw_properties if p.get("subscription_id")]
        if sub_ids:
            from datetime import date
            today_str = date.today().isoformat()
            cursor = db.subscriptions.find({
                "subscription_id": {"$in": sub_ids},
                "end_date": {"$lte": today_str}
            }, {"subscription_id": 1})
            expired_subs = await cursor.to_list(length=len(sub_ids))
            expired_sub_ids = {s["subscription_id"] for s in expired_subs}
            if expired_sub_ids:
                raw_properties = [p for p in raw_properties if p.get("subscription_id") not in expired_sub_ids]

        if min_price is not None:
            raw_properties = [p for p in raw_properties if numeric_price(p) >= min_price]
        if max_price is not None:
            raw_properties = [p for p in raw_properties if numeric_price(p) <= max_price]

        if radius_search:
            def distance_from_center(prop: dict) -> float:
                try:
                    prop_lat = float(prop.get("latitude"))
                    prop_lng = float(prop.get("longitude"))
                except (TypeError, ValueError):
                    return float("inf")
                d_lat = math.radians(prop_lat - latitude)
                d_lng = math.radians(prop_lng - longitude)
                lat1 = math.radians(latitude)
                lat2 = math.radians(prop_lat)
                a = (
                    math.sin(d_lat / 2) ** 2
                    + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
                )
                return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

            raw_properties = [
                {**p, "distance_km": round(distance_from_center(p), 2)}
                for p in raw_properties
                if distance_from_center(p) <= radius_km
            ]

            if not raw_properties and city:
                fallback_query = {
                    key: value
                    for key, value in query.items()
                    if key not in ("latitude", "longitude")
                }
                fallback_query["$or"] = city_match_conditions(city)
                raw_properties = await db.properties.find(fallback_query, projection).to_list(length=1000)

                fallback_sub_ids = [p["subscription_id"] for p in raw_properties if p.get("subscription_id")]
                if fallback_sub_ids:
                    from datetime import date
                    today_str = date.today().isoformat()
                    cursor = db.subscriptions.find({
                        "subscription_id": {"$in": fallback_sub_ids},
                        "end_date": {"$lte": today_str}
                    }, {"subscription_id": 1})
                    expired_subs = await cursor.to_list(length=len(fallback_sub_ids))
                    expired_sub_ids = {s["subscription_id"] for s in expired_subs}
                    if expired_sub_ids:
                        raw_properties = [p for p in raw_properties if p.get("subscription_id") not in expired_sub_ids]

                if min_price is not None:
                    raw_properties = [p for p in raw_properties if numeric_price(p) >= min_price]
                if max_price is not None:
                    raw_properties = [p for p in raw_properties if numeric_price(p) <= max_price]

        def is_property_boosted(p: dict) -> bool:
            is_b = p.get("is_boosted", False)
            if not is_b:
                return False
            expires_at = p.get("boost_expires_at")
            if expires_at:
                try:
                    from datetime import datetime, timezone
                    exp_dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                    if exp_dt < datetime.now(timezone.utc):
                        return False
                except Exception:
                    pass
            return True

        boosted = [p for p in raw_properties if is_property_boosted(p)]
        non_boosted = [p for p in raw_properties if not is_property_boosted(p)]

        # Sort boosted properties primarily by boost_rank ascending
        boosted.sort(key=lambda p: p.get("boost_rank") if p.get("boost_rank") is not None else 999999)

        if sort == "price_asc":
            non_boosted.sort(key=numeric_price)
        elif sort == "price_desc":
            non_boosted.sort(key=numeric_price, reverse=True)
        elif sort == "newest":
            non_boosted.sort(key=lambda p: p.get("created_at") or "", reverse=True)
        elif sort == "rating_desc":
            non_boosted.sort(
                key=lambda p: (
                    p.get("average_rating") or p.get("rating") or 0,
                    p.get("reviews_count") or p.get("review_count") or 0,
                ),
                reverse=True,
            )
        else:
            # Default / recommended: sort stably newest first (created_at descending)
            non_boosted.sort(key=lambda p: p.get("created_at") or "", reverse=True)

        raw_properties = boosted + non_boosted

        total = len(raw_properties)
        properties = raw_properties[skip: skip + limit]
        price_config = await get_booking_payment_config(db)
        for prop in properties:
            _sanitize_property_media(prop)
            if prop.get("base_price") not in (None, ""):
                prop["price_per_night"] = prop["base_price"]
            await _add_customer_display_price(db, prop, price_config)

        # Log search activity for analytics (admin dashboard)
        try:
            import uuid
            import asyncio
            log_doc = {
                "search_id": f"search_{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.now(timezone.utc),
                "city": city or "",
                "search": text_search,
                "category": category.value if category else None,
                "property_type": property_type,
                "min_price": min_price,
                "max_price": max_price,
                "bhk_type": bhk_type,
                "guests": requested_guests,
                "check_in": check_in,
                "check_out": check_out,
                "results_count": total
            }
            asyncio.create_task(db.search_logs.insert_one(log_doc))
        except Exception as log_err:
            logger.warning(f"Failed to save search log: {log_err}")

        # Listing state and availability can change immediately after moderation
        # or a booking, so clients must not reuse an older search response.
        response.headers["Cache-Control"] = "no-store"

        # Build search-specific SEO metadata
        seo_title = "Browse Stays & Venues | X-Space360"
        seo_desc = "Discover top short-term rentals, villas, offices, and venues in India."
        
        if city:
            city_lower = city.strip().lower()
            if city_lower == "nashik":
                seo_title = "X-Space360 | Luxury Short-term Rentals in Nashik, Maharashtra"
                seo_desc = "Book premium villas, commercial spaces & event venues in Nashik. Residential, co-working & banquet halls for short-term rent. Starts ₹6,000/night."
            else:
                seo_title = f"Properties in {city.strip().capitalize()} | X-Space360"
                seo_desc = f"Find and book the best villas, apartments, and commercial spaces in {city.strip().capitalize()} with transparent pricing."
        elif category:
            cat_label = "Residential Stays" if category.value == "residential" else "Commercial Spaces" if category.value == "commercial" else "Event Venues"
            seo_title = f"{cat_label} | X-Space360"
            seo_desc = f"Explore our premium selection of {cat_label} for your short-term stays, workspaces, and celebrations."

        canonical_params = []
        if city:
            canonical_params.append(f"city={city.strip()}")
        if category:
            canonical_params.append(f"category={category.value}")
        canonical_qs = ("?" + "&".join(canonical_params)) if canonical_params else ""
        
        seo_data = {
            "title": seo_title,
            "description": seo_desc,
            "keywords": "rental properties, short term stays, villas, venues, co-working",
            "canonical": f"https://x-space360.in/guest/browse{canonical_qs}",
            "image": "https://x-space360.in/favicon_rich.jpg",
            "robots": "index,follow"
        }

        return {
            "properties": properties,
            "total": total,
            "limit": limit,
            "skip": skip,
            "filters_applied": {
                "category": category.value if category else None,
                "city": city,
                "search": text_search,
                "property_type": property_type,
                "bhk_type": bhk_type,
                "min_price": min_price,
                "max_price": max_price,
                "amenities": amenities,
                "instant_booking": instant_booking,
                "pet_friendly": pet_friendly,
                "guests": requested_guests,
                "check_in": check_in,
                "check_out": check_out,
                "sort": sort,
            },
            "seo": seo_data
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search properties",
        )

@router.get("/{property_id}")
async def get_property(
    property_id: str,
    request: Request,
    response: Response,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get property details by ID (public endpoint). Includes safe host info."""
    try:
        resolved_property_id = extract_property_id(property_id) or property_id
        property_dict = await db.properties.find_one({"property_id": resolved_property_id}, {"_id": 0})
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        if property_dict.get("base_price") not in (None, ""):
            property_dict["price_per_night"] = property_dict["base_price"]
        _sanitize_property_media(property_dict)
        await _add_customer_display_price(db, property_dict)

        # Get optional user from Request headers (Authorization)
        current_user = None
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ")[1]
            try:
                from utils.auth import decode_access_token
                current_user = decode_access_token(token)
            except Exception as token_err:
                logger.warning(f"Failed to decode token in get_property: {token_err}")

        # Check if the guest has a confirmed booking for this property
        has_confirmed_booking = False
        is_owner_or_admin = False
        if current_user:
            user_id = current_user.get("user_id")
            existing_booking = await db.bookings.find_one({
                "property_id": resolved_property_id,
                "guest_id": user_id,
                "booking_status": "confirmed"
            })
            if existing_booking:
                has_confirmed_booking = True
            if property_dict.get("owner_id") == user_id or current_user.get("role") == "admin":
                has_confirmed_booking = True
                is_owner_or_admin = True

        # If the property status is not live, only allow owner or admin to view it
        if property_dict.get("status") != PropertyStatus.LIVE.value and not is_owner_or_admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        # Check if subscription has expired. Some older property rows may have
        # subscription_status but a blank subscription_id, so recover the active
        # subscription link from the subscriptions table before returning details.
        sub = None
        if property_dict.get("subscription_id"):
            sub = await db.subscriptions.find_one({"subscription_id": property_dict["subscription_id"]})
        else:
            sub = await db.subscriptions.find_one(
                {
                    "property_id": resolved_property_id,
                    "status": SubscriptionStatus.ACTIVE.value,
                },
                {"_id": 0},
            )
            if sub:
                property_dict["subscription_id"] = sub.get("subscription_id") or property_dict.get("subscription_id")

        if sub:
            property_dict["subscription_status"] = sub.get("status") or property_dict.get("subscription_status")
            from datetime import date
            end_date_str = sub.get("end_date")
            if isinstance(end_date_str, str):
                end_date = datetime.strptime(end_date_str.split('T')[0], "%Y-%m-%d").date()
            elif isinstance(end_date_str, date):
                end_date = end_date_str
            else:
                end_date = None

            if end_date and end_date <= date.today() and not is_owner_or_admin:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Property not found"
                )

        # Attach host profile (include phone and email if they have a confirmed booking, are owner, or admin)
        host_projection = {
            "_id": 0,
            "user_id": 1,
            "full_name": 1,
            "city": 1,
            "profile_image": 1,
            "created_at": 1,
            "kyc_status": 1,
            "role": 1,
        }
        if has_confirmed_booking:
            host_projection["phone"] = 1
            host_projection["email"] = 1

        host = await db.users.find_one(
            {"user_id": property_dict.get("owner_id")},
            host_projection,
        )
        if host:
            created_at = host.get("created_at")
            host["created_at"] = created_at.isoformat() if hasattr(created_at, "isoformat") else created_at
        property_dict["host"] = host or None

        # Set cache-control header for property details (30 minutes)
        response.headers["Cache-Control"] = "public, max-age=1800"

        # Generate SEO metadata dynamically with fallback
        title = property_dict.get("meta_title") or f"{property_dict.get('title')} in {property_dict.get('city')} | X-Space360"
        description = property_dict.get("meta_description") or f"Book {property_dict.get('title')} in {property_dict.get('city')} with instant confirmation on X-Space360. Best short-term rental."
        keywords = property_dict.get("meta_keywords") or f"{property_dict.get('property_type')}, {property_dict.get('city')}, holiday home, short term rental"
        property_dict["slug"] = build_property_slug(property_dict)
        property_dict["property_path"] = build_property_path(property_dict)
        canonical = property_dict.get("canonical_url") or f"https://x-space360.in{property_dict['property_path']}"
        
        images = property_dict.get("images") or []
        first_image = images[0] if images else "favicon_rich.jpg"
        image_url = property_dict.get("og_image") or (first_image if first_image.startswith("http") else f"https://x-space360.in/api/uploads/{first_image}")
        
        robots = property_dict.get("robots_index") or "index,follow"
        
        property_dict["seo"] = {
            "title": title,
            "description": description,
            "keywords": keywords,
            "canonical": canonical,
            "image": image_url,
            "robots": robots
        }

        return property_dict

    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch property"
        )

@router.get("/host/my-properties")
async def get_host_properties(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all properties owned by the current host, sorted by latest created first."""
    try:
        cursor = db.properties.find({"owner_id": current_user["user_id"]}, {"_id": 0}).sort("created_at", -1)
        properties = await cursor.to_list(length=100)
        sub_ids = [p.get("subscription_id") for p in properties if p.get("subscription_id")]
        subscriptions = {}
        plans = {}
        if sub_ids:
            sub_rows = await db.subscriptions.find(
                {"subscription_id": {"$in": sub_ids}},
                {"_id": 0},
            ).to_list(length=len(sub_ids))
            subscriptions = {s.get("subscription_id"): s for s in sub_rows}
            plan_ids = [s.get("plan_id") for s in sub_rows if s.get("plan_id")]
            if plan_ids:
                plan_rows = await db.subscription_plans.find(
                    {"plan_id": {"$in": plan_ids}},
                    {"_id": 0},
                ).to_list(length=len(plan_ids))
                plans = {p.get("plan_id"): p for p in plan_rows}

        for prop in properties:
            _normalize_booking_mode(prop)
            _sanitize_property_media(prop)
            sub = subscriptions.get(prop.get("subscription_id")) or {}
            plan = plans.get(sub.get("plan_id")) or {}
            prop["subscription_plan_name"] = plan.get("plan_name") or sub.get("plan_type") or "Trial"
            prop["subscription_purchase_date"] = sub.get("start_date") or sub.get("created_at")
            prop["subscription_renewal_date"] = sub.get("end_date") or sub.get("trial_end_date")
            prop["subscription_status"] = sub.get("status") or prop.get("subscription_status") or "trial"
        
        return {
            "properties": properties,
            "total": len(properties)
        }
    
    except Exception as e:
        logger.error(f"Error fetching host properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch properties"
        )

@router.patch("/{property_id}")
async def update_property(
    property_id: str,
    property_update: PropertyUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update property details (Host only)."""
    try:
        # Check property ownership
        property_dict = await db.properties.find_one({"property_id": property_id})
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_dict["owner_id"] != current_user["user_id"] and current_user["role"] != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this property"
            )
        
        # Hosts can manage only pricing/rules, amenities, and media after a
        # property has entered review or gone live. Admins keep full edit access.
        update_data = property_update.model_dump(exclude_unset=True)
        if "booking_mode" in update_data or "instant_booking" in update_data:
            update_data = _normalize_booking_mode(update_data)
        update_data = _sanitize_property_media(update_data)
        if (
            current_user["role"] != UserRole.ADMIN.value
            and property_dict.get("status") in HOST_MANAGE_EDITABLE_STATUSES
        ):
            update_data = {
                key: value
                for key, value in update_data.items()
                if key in HOST_MANAGE_EDITABLE_FIELDS
            }
            if not update_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Only pricing rules, amenities, and photos can be updated for submitted or live properties",
                )
            update_data["status"] = PropertyStatus.LIVE.value
            update_data["is_edited"] = True

        update_data["updated_at"] = datetime.now(timezone.utc)
        
        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": update_data}
        )
        
        logger.info(f"Property updated: {property_id}")
        return {"message": "Property updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update property"
        )


async def _delete_property_with_reason(
    property_id: str,
    payload: DeletePropertyRequest,
    current_user: dict,
    db: AsyncIOMotorDatabase,
):
    try:
        reason = (payload.reason or "").strip()
        if len(reason) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a deletion reason with at least 10 characters"
            )

        property_dict = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

        is_admin = current_user.get("role") == UserRole.ADMIN.value
        if not is_admin and property_dict.get("owner_id") != current_user.get("user_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this property"
            )

        active_booking_count = await db.bookings.count_documents({
            "property_id": property_id,
            "booking_status": {"$in": ["soft_lock", "confirmed"]},
        })
        if active_booking_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete property with active or confirmed bookings. Cancel/complete those bookings first."
            )

        deleted_at = datetime.now(timezone.utc)
        archive = {
            "property_id": property_id,
            "owner_id": property_dict.get("owner_id"),
            "title": property_dict.get("title"),
            "city": property_dict.get("city"),
            "status": property_dict.get("status"),
            "reason": reason,
            "deleted_by": current_user["user_id"],
            "deleted_by_role": current_user["role"],
            "deleted_at": deleted_at,
            "property_snapshot": property_dict,
        }
        await db.deleted_properties.update_one(
            {"property_id": property_id},
            {"$set": archive},
            upsert=True,
        )

        await db.properties.delete_one({"property_id": property_id})
        if await db.properties.find_one({"property_id": property_id}, {"_id": 0, "property_id": 1}):
            raise RuntimeError("Property record could not be removed from the database")

        cleanup_operations = [
            ("blocked dates", db.blocked_dates.delete_many({"property_id": property_id})),
            ("external calendars", db.external_calendars.delete_many({"property_id": property_id})),
            ("property verifications", db.property_verifications.delete_many({"property_id": property_id})),
        ]
        cleanup_results = await asyncio.gather(
            *(operation for _, operation in cleanup_operations),
            return_exceptions=True,
        )
        for (label, _), result in zip(cleanup_operations, cleanup_results):
            if isinstance(result, Exception):
                logger.warning(
                    "Property %s deleted but %s cleanup failed: %s",
                    property_id,
                    label,
                    result,
                )

        logger.info(
            "Property deleted: %s by %s reason=%s",
            property_id,
            current_user["user_id"],
            reason,
        )
        return {"message": "Property deleted successfully", "property_id": property_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error deleting property %s", property_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete property: {str(e)}"
        )


@router.delete("/{property_id}")
async def delete_property(
    property_id: str,
    payload: DeletePropertyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a host property after collecting a reason and checking active bookings."""
    return await _delete_property_with_reason(property_id, payload, current_user, db)


@router.post("/{property_id}/delete")
async def delete_property_post_fallback(
    property_id: str,
    payload: DeletePropertyRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """POST fallback for deployments/proxies that do not forward DELETE with a body."""
    return await _delete_property_with_reason(property_id, payload, current_user, db)

@router.post("/{property_id}/submit-verification")
async def submit_for_verification(
    property_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit property for verification (Host only). Auto-assigns a broker + fires notifications."""
    try:
        # Check property ownership
        property_dict = await db.properties.find_one({"property_id": property_id})
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_dict["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Update status to pending verification
        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": PropertyStatus.PENDING_VERIFICATION.value,
                "submitted_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )

        # Trigger workflow: broker auto-assignment + notifications
        try:
            from services.verification_workflow import on_host_submit
            updated = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
            broker_id = await on_host_submit(db, updated)
        except Exception as wf_err:
            logger.warning(f"Verification workflow trigger failed: {wf_err}")
            broker_id = None

        logger.info(f"Property submitted for verification: {property_id} (broker={broker_id})")
        return {"message": "Property submitted for verification", "broker_id": broker_id}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit property"
        )

@router.get("/expand-url")
async def expand_url(url: str = Query(...)):
    """Resolve short URLs (like maps.app.goo.gl) to their full URL."""
    try:
        import urllib.request
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        res = urllib.request.urlopen(req, timeout=10)
        return {"url": res.geturl()}
    except Exception as e:
        logger.error(f"Failed to expand URL: {str(e)}")
        return {"url": url}



@router.get("/nearby-places")
async def get_nearby_places(
    latitude: float = Query(..., description="Latitude of the property"),
    longitude: float = Query(..., description="Longitude of the property"),
):
    """Retrieve or generate famous landmarks near the given latitude and longitude coordinates."""
    places = []
    
    # 1. Mumbai region
    if 18.8 <= latitude <= 19.4 and 72.6 <= longitude <= 73.1:
        places = [
            "Gateway of India",
            "Marine Drive Promenade",
            "Juhu Beach",
            "Siddhivinayak Temple",
            "Bandra-Worli Sea Link",
            "Chhatrapati Shivaji Maharaj Terminus",
            "Colaba Causeway Shopping Market",
            "Sanjay Gandhi National Park",
        ]
    # 2. Pune region
    elif 18.3 <= latitude <= 18.7 and 73.6 <= longitude <= 74.1:
        places = [
            "Shaniwar Wada Palace",
            "Aga Khan Palace",
            "Sinhagad Fort View Point",
            "Osho Meditation Resort",
            "Dagadusheth Halwai Ganpati Temple",
            "Vetal Tekdi Hilltop View",
            "Phoenix Marketcity Viman Nagar",
            "FC Road Street Shopping",
        ]
    # 3. Goa region
    elif 14.8 <= latitude <= 15.9 and 73.5 <= longitude <= 74.3:
        places = [
            "Calangute Beach Coastline",
            "Historic Fort Aguada & Lighthouse",
            "Basilica of Bom Jesus (Old Goa)",
            "Dudhsagar Waterfalls Trail",
            "Anjuna Flea Market Ground",
            "Panaji Church & Latin Quarter",
            "Baga Beach Clubs & Nightlife",
            "Dona Paula View Point",
        ]
    # 4. Delhi region
    elif 28.3 <= latitude <= 28.9 and 76.9 <= longitude <= 77.4:
        places = [
            "Red Fort Heritage Monument",
            "Qutub Minar Complex",
            "India Gate War Memorial",
            "Lotus Temple Garden",
            "Humayun's Tomb",
            "Akshardham Temple",
            "Connaught Place Shopping Circle",
            "Chandni Chowk Food Street",
        ]
    # 5. Bangalore region
    elif 12.7 <= latitude <= 13.2 and 77.3 <= longitude <= 77.9:
        places = [
            "Lalbagh Botanical Garden",
            "Bangalore Palace",
            "Cubbon Park Walking Trail",
            "Bannerghatta Biological Park",
            "Nandi Hills Sunrise View",
            "Visvesvaraya Industrial Museum",
            "UB City Luxury Mall",
            "Commercial Street Bazaar",
        ]
    # Generic fallback: generate dynamic nearby landmarks using standard categories
    else:
        seed = int(abs(latitude * 1000) + abs(longitude * 1000))
        adjectives = ["Scenic", "Historic", "Central", "Popular", "Famous", "Golden", "Royal", "Sunset"]
        nouns = ["Park", "Marketplace", "View Point", "Lake Promenade", "Museum", "Heritage Site", "Metro Station", "Shopping Plaza"]
        
        import random
        r = random.Random(seed)
        
        places = []
        for i in range(5):
            if not adjectives or not nouns:
                break
            adj = r.choice(adjectives)
            noun = r.choice(nouns)
            adjectives.remove(adj)
            nouns.remove(noun)
            places.append(f"{adj} {noun}")
            
    return {"latitude": latitude, "longitude": longitude, "places": places}

class ReviewSubmit(BaseModel):
    rating: float
    comment: Optional[str] = None


@router.post("/{property_id}/reviews")
async def submit_review(
    property_id: str,
    review_data: ReviewSubmit,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit a review for a property after checkout."""
    try:
        property_obj = await db.properties.find_one({"property_id": property_id})
        if not property_obj:
            raise HTTPException(status_code=404, detail="Property not found")
            
        old_rating = property_obj.get("rating", 0.0)
        old_count = property_obj.get("review_count", 0)
        
        new_count = old_count + 1
        new_rating = ((old_rating * old_count) + review_data.rating) / new_count
        new_rating = round(new_rating, 1)
        
        import uuid
        review_doc = {
            "review_id": str(uuid.uuid4()),
            "property_id": property_id,
            "guest_id": current_user["user_id"],
            "overall_rating": review_data.rating,
            "comment": review_data.comment,
            "is_published": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.reviews.insert_one(review_doc)
        
        await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {"rating": new_rating, "review_count": new_count}}
        )
        
        return {"success": True, "new_rating": new_rating, "review_count": new_count}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit review")


class GenerateDescriptionRequest(BaseModel):
    title: Optional[str] = ""
    category: Optional[str] = ""
    property_type: Optional[str] = ""
    bhk_type: Optional[str] = ""
    city: Optional[str] = ""
    amenities: Optional[List[str]] = []
    area_sqft: Optional[int] = None
    max_guests: Optional[int] = None


@router.post("/generate-description")
async def generate_description(
    data: GenerateDescriptionRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        title = data.title or ""
        category = data.category or "residential"
        property_type = data.property_type or ""
        bhk_type = data.bhk_type or ""
        city = data.city or ""
        amenities = data.amenities or []
        area_sqft = data.area_sqft
        max_guests = data.max_guests

        import os
        import json
        import urllib.request
        import asyncio

        openai_key = os.environ.get("OPENAI_API_KEY")
        gemini_key = os.environ.get("GEMINI_API_KEY")

        # Define a helper function to perform sync HTTP requests in a separate thread
        def perform_request(url: str, payload: dict, headers: dict) -> dict:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as response:
                return json.loads(response.read().decode("utf-8"))

        if gemini_key:
            prompt = (
                f"Write an engaging, professional, and appealing short-term rental description (around 120-150 words) "
                f"for a property listing with these details:\n"
                f"- Title: {title}\n"
                f"- Category: {category}\n"
                f"- Property Type: {property_type}\n"
                f"- BHK / Size: {bhk_type}\n"
                f"- Location: {city}\n"
                f"- Area: {area_sqft} sq.ft\n"
                f"- Max Guests capacity: {max_guests}\n"
                f"- Amenities: {', '.join(amenities)}.\n"
                f"Output only the final description. Do not include markdown headers or greetings like 'Sure, here is...'."
            )
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={gemini_key}"
                payload = {"contents": [{"parts": [{"text": prompt}]}]}
                headers = {"Content-Type": "application/json"}
                
                result = await asyncio.to_thread(perform_request, url, payload, headers)
                desc_text = result["candidates"][0]["content"]["parts"][0]["text"].strip()
                if desc_text:
                    return {"description": desc_text}
            except Exception as ex:
                logger.error(f"Gemini API generation failed: {str(ex)}")

        if openai_key:
            prompt = (
                f"Write an engaging, professional, and appealing short-term rental description (around 120-150 words) "
                f"for a property listing with these details:\n"
                f"- Title: {title}\n"
                f"- Category: {category}\n"
                f"- Property Type: {property_type}\n"
                f"- BHK / Size: {bhk_type}\n"
                f"- Location: {city}\n"
                f"- Area: {area_sqft} sq.ft\n"
                f"- Max Guests capacity: {max_guests}\n"
                f"- Amenities: {', '.join(amenities)}.\n"
                f"Output only the final description. Do not include markdown headers or greetings like 'Sure, here is...'."
            )
            try:
                url = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7
                }
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                
                result = await asyncio.to_thread(perform_request, url, payload, headers)
                desc_text = result["choices"][0]["message"]["content"].strip()
                if desc_text:
                    return {"description": desc_text}
            except Exception as ex:
                logger.error(f"OpenAI API generation failed: {str(ex)}")

        # Fallback to local smart template generator
        clean_prop_type = property_type.replace("_", " ").title() if property_type else "property"
        clean_bhk = bhk_type.upper() if bhk_type else ""
        clean_city = city.title() if city else "our location"
        clean_title = title if title else f"Beautiful {clean_bhk} {clean_prop_type}"
        clean_amenities = [a.replace("_", " ").title() for a in amenities]

        intro = f"Welcome to our premium {clean_prop_type}! "
        if title:
            intro = f"Experience comfort and convenience at '{clean_title}', a premium {clean_prop_type} located in {clean_city}. "
        else:
            intro = f"Welcome to this elegant {clean_bhk} {clean_prop_type} nestled in the beautiful surroundings of {clean_city}. "

        details = f"This modern {category} space has been thoughtfully designed to offer a relaxing, stylish retreat. "
        if area_sqft:
            details += f"It features a spacious layout covering {area_sqft} sq.ft. of pristine design, "
        else:
            details += "It features an inviting layout with plenty of natural light, "

        if max_guests:
            details += f"comfortably accommodating up to {max_guests} guests. "
        else:
            details += "ideal for families, friends, or business travelers. "

        amenities_part = ""
        if clean_amenities:
            amenities_part = f"\n\nGuests will have access to a variety of modern amenities, including: {', '.join(clean_amenities)}. "

        closing = (
            f"\n\nWhether you're visiting {clean_city} for a short getaway or an extended business trip, "
            "this listing provides everything you need to feel right at home. "
            "Book now to secure your stay!"
        )

        final_desc = intro + details + amenities_part + closing
        return {"description": final_desc}

    except Exception as e:
        logger.error(f"Error in generate_description: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate description")


class GenerateTitleRequest(BaseModel):
    category: Optional[str] = ""
    property_type: Optional[str] = ""
    bhk_type: Optional[str] = ""
    city: Optional[str] = ""
    amenities: Optional[List[str]] = []
    area_sqft: Optional[int] = None
    max_guests: Optional[int] = None


@router.post("/generate-title")
async def generate_title(
    data: GenerateTitleRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        category = data.category or "residential"
        property_type = data.property_type or ""
        bhk_type = data.bhk_type or ""
        city = data.city or ""
        amenities = data.amenities or []
        area_sqft = data.area_sqft
        max_guests = data.max_guests

        import os
        import json
        import urllib.request
        import asyncio

        openai_key = os.environ.get("OPENAI_API_KEY")
        gemini_key = os.environ.get("GEMINI_API_KEY")

        # Define a helper function to perform sync HTTP requests in a separate thread
        def perform_request(url: str, payload: dict, headers: dict) -> dict:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10.0) as response:
                return json.loads(response.read().decode("utf-8"))

        prompt = (
            f"Generate a single, catchy, SEO-friendly title (around 5 to 8 words) for a short-term rental property listing with these details:\n"
            f"- Category: {category}\n"
            f"- Property Type: {property_type}\n"
            f"- BHK / Size: {bhk_type}\n"
            f"- Location: {city}\n"
            f"- Area: {area_sqft} sq.ft\n"
            f"- Max Guests capacity: {max_guests}\n"
            f"- Amenities: {', '.join(amenities)}.\n"
            f"Examples of good titles: 'Cozy 2BHK Apartment with Pool in Nashik', 'Modern 3BHK Villa near Beach, Goa', 'Elegant Office Space in Viman Nagar'.\n"
            f"Output only the final title. Do not include markdown headers, quotes, or greetings like 'Sure, here is...'."
        )

        if gemini_key:
            try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={gemini_key}"
                payload = {"contents": [{"parts": [{"text": prompt}]}]}
                headers = {"Content-Type": "application/json"}
                
                result = await asyncio.to_thread(perform_request, url, payload, headers)
                title_text = result["candidates"][0]["content"]["parts"][0]["text"].strip().replace('"', '').replace("'", "")
                if title_text:
                    return {"title": title_text}
            except Exception as ex:
                logger.error(f"Gemini API title generation failed: {str(ex)}")

        if openai_key:
            try:
                url = "https://api.openai.com/v1/chat/completions"
                payload = {
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.7
                }
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                
                result = await asyncio.to_thread(perform_request, url, payload, headers)
                title_text = result["choices"][0]["message"]["content"].strip().replace('"', '').replace("'", "")
                if title_text:
                    return {"title": title_text}
            except Exception as ex:
                logger.error(f"OpenAI API title generation failed: {str(ex)}")

        # Fallback to local smart template generator
        clean_prop_type = property_type.replace("_", " ").title() if property_type else "Property"
        clean_bhk = bhk_type.upper() if bhk_type else ""
        clean_city = city.title() if city else "Local"
        
        feature = ""
        if amenities:
            nice_amenities = [a for a in amenities if a in ["wifi", "ac", "pool", "gym", "parking", "kitchen"]]
            if nice_amenities:
                feature = f" with {nice_amenities[0].upper()}"
        
        fallback_title = f"Premium {clean_bhk} {clean_prop_type}{feature} in {clean_city}"
        if len(fallback_title) > 60:
            fallback_title = fallback_title[:60]
        return {"title": fallback_title}

    except Exception as e:
        logger.error(f"Error in generate_title: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to generate title")


@router.get("/pincode/{pincode}")
async def get_pincode_details(pincode: str):
    """Fetch location details (state, city/district, post offices/localities) for a 6-digit Indian pincode."""
    import httpx
    
    # 1. Validate pincode is a 6-digit Indian Pincode
    if not pincode.isdigit() or len(pincode) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pincode must be exactly 6 digits."
        )
    
    try:
        # 2. Call the public Indian pincode API
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"https://api.postalpincode.in/pincode/{pincode}")
            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Failed to fetch location details from pincode provider."
                )
            
            data = response.json()
            if not data or not isinstance(data, list) or len(data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No location data found for this pincode."
                )
                
            pincode_data = data[0]
            status_val = pincode_data.get("Status")
            post_offices = pincode_data.get("PostOffice")
            
            if status_val != "Success" or not post_offices:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="No location data found for this pincode."
                )
            
            # 3. Extract State, City/District, and unique localities
            first_po = post_offices[0]
            state = first_po.get("State")
            city = first_po.get("District") or first_po.get("Division")
            
            # Collect unique locality / post office names
            localities = []
            seen = set()
            for po in post_offices:
                name = po.get("Name")
                if name and name not in seen:
                    seen.add(name)
                    localities.append(name)
                    
            return {
                "state": state,
                "city": city,
                "localities": localities
            }
            
    except httpx.HTTPError as he:
        logger.error(f"HTTP error fetching pincode details: {str(he)}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Error connecting to pincode location provider."
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving pincode location: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve location details."
        )
        

