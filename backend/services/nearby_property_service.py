import math
from datetime import date
from typing import Any, Dict, List, Optional

from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.property import PropertyStatus


DEFAULT_RADIUS_METERS = 5000
MAX_RADIUS_METERS = 20000
EARTH_RADIUS_KM = 6371.0088


def validate_nearby_coordinates(lat: float, lng: float, radius: int) -> None:
    if not -90 <= lat <= 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lat must be between -90 and 90",
        )
    if not -180 <= lng <= 180:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="lng must be between -180 and 180",
        )
    if radius <= 0 or radius > MAX_RADIUS_METERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"radius must be between 1 and {MAX_RADIUS_METERS} meters",
        )


def haversine_distance_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    r_lat1 = math.radians(lat1)
    r_lat2 = math.radians(lat2)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 1000 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _numeric_price(prop: Dict[str, Any]) -> float:
    try:
        return float(
            prop.get("base_price")
            if prop.get("base_price") not in (None, "")
            else prop.get("price_per_night") or 0
        )
    except (TypeError, ValueError):
        return 0.0


def _valid_coordinate(value: Any) -> Optional[float]:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    return parsed


async def _exclude_unavailable_property_ids(
    db: AsyncIOMotorDatabase,
    check_in: Optional[str],
    check_out: Optional[str],
) -> List[str]:
    if not check_in or not check_out:
        return []
    if check_in >= check_out:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="checkOut must be after checkIn",
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
    return list(set(booked_props) | set(blocked_props))


async def find_nearby_properties(
    db: AsyncIOMotorDatabase,
    *,
    lat: float,
    lng: float,
    radius: int = DEFAULT_RADIUS_METERS,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    guests: Optional[int] = None,
    property_type: Optional[str] = None,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    instant_book: Optional[bool] = None,
    limit: int = 100,
) -> Dict[str, Any]:
    validate_nearby_coordinates(lat, lng, radius)
    limit = max(1, min(limit, 200))

    query: Dict[str, Any] = {
        "status": PropertyStatus.LIVE.value,
    }
    if property_type:
        query["property_type"] = property_type
    if category:
        query["category"] = category
    if guests is not None:
        query["max_guests"] = {"$gte": guests}
    if instant_book is not None:
        query["instant_booking"] = instant_book

    unavailable = await _exclude_unavailable_property_ids(db, check_in, check_out)
    if unavailable:
        query["property_id"] = {"$nin": unavailable}

    projection = {
        "_id": 0,
        "property_id": 1,
        "title": 1,
        "property_type": 1,
        "category": 1,
        "bhk_type": 1,
        "city": 1,
        "state": 1,
        "latitude": 1,
        "longitude": 1,
        "max_guests": 1,
        "price_per_night": 1,
        "base_price": 1,
        "pricing_cycle": 1,
        "pricing_display_mode": 1,
        "images": 1,
        "average_rating": 1,
        "reviews_count": 1,
        "rating": 1,
        "review_count": 1,
        "instant_booking": 1,
        "booking_mode": 1,
        "subscription_id": 1,
    }
    raw = await db.properties.find(query, projection).to_list(length=1000)

    sub_ids = [p["subscription_id"] for p in raw if p.get("subscription_id")]
    if sub_ids:
        today_str = date.today().isoformat()
        cursor = db.subscriptions.find(
            {"subscription_id": {"$in": sub_ids}, "end_date": {"$lte": today_str}},
            {"subscription_id": 1},
        )
        expired = await cursor.to_list(length=len(sub_ids))
        expired_ids = {s["subscription_id"] for s in expired}
        raw = [p for p in raw if p.get("subscription_id") not in expired_ids]

    results = []
    for prop in raw:
        prop_lat = _valid_coordinate(prop.get("latitude"))
        prop_lng = _valid_coordinate(prop.get("longitude"))
        if prop_lat is None or prop_lng is None:
            continue
        if prop_lat == 0 and prop_lng == 0:
            continue

        price = _numeric_price(prop)
        if min_price is not None and price < min_price:
            continue
        if max_price is not None and price > max_price:
            continue

        distance_m = haversine_distance_meters(lat, lng, prop_lat, prop_lng)
        if distance_m > radius:
            continue

        images = prop.get("images") or []
        rating = prop.get("average_rating") or prop.get("rating") or 0
        review_count = prop.get("reviews_count") or prop.get("review_count") or 0
        results.append(
            {
                "propertyId": prop.get("property_id"),
                "propertyName": prop.get("title") or "X-Space360 Property",
                "latitude": prop_lat,
                "longitude": prop_lng,
                "distanceMeters": round(distance_m),
                "distanceKm": round(distance_m / 1000, 2),
                "thumbnail": images[0] if images else None,
                "propertyType": prop.get("property_type"),
                "category": prop.get("category"),
                "price": price,
                "currency": "INR",
                "pricingCycle": prop.get("pricing_cycle") or "day",
                "rating": float(rating or 0),
                "reviewCount": int(review_count or 0),
                "instantBook": bool(prop.get("instant_booking", True)),
                "availabilityStatus": "available",
                "city": prop.get("city") or "",
                "state": prop.get("state") or "",
                "bhkType": prop.get("bhk_type") or "",
                "maxGuests": prop.get("max_guests") or 0,
            }
        )

    results.sort(key=lambda item: item["distanceMeters"])
    return {
        "center": {"lat": lat, "lng": lng},
        "radiusMeters": radius,
        "count": min(len(results), limit),
        "properties": results[:limit],
    }
