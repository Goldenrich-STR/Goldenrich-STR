from fastapi import APIRouter, HTTPException, status, Depends, Query, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from pydantic import BaseModel
from models.property import Property, PropertyCreate, PropertyUpdate, PropertyStatus, PropertyCategory
from models.user import UserRole
from middleware.auth_middleware import get_current_user, require_role
from datetime import datetime, timezone
import logging
import re

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/properties", tags=["Properties"])

async def get_db():
    from server import db_instance
    return db_instance


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
        
        # Fetch the host's profile to retrieve their registered broker_id (from LG Code registration)
        host_user = await db.users.find_one({"user_id": current_user["user_id"]})
        host_broker_id = host_user.get("broker_id") if host_user else None
        
        # Create property object
        property_obj = Property(
            owner_id=current_user["user_id"],
            broker_id=host_broker_id,
            **property_data.model_dump()
        )
        
        # Insert into database
        property_dict = property_obj.model_dump()
        await db.properties.insert_one(property_dict)
        
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

        if category:
            query["category"] = category.value

        if city:
            keyword = re.escape(city.strip())
            query["$or"] = [
                {"city": {"$regex": keyword, "$options": "i"}},
                {"state": {"$regex": keyword, "$options": "i"}},
                {"title": {"$regex": keyword, "$options": "i"}},
                {"address": {"$regex": keyword, "$options": "i"}},
            ]

        if property_type:
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
                return float(prop.get("price_per_night") or 0)
            except (TypeError, ValueError):
                return 0

        projection = {
            "_id": 0,
            "property_id": 1,
            "owner_id": 1,
            "title": 1,
            "property_type": 1,
            "category": 1,
            "bhk_type": 1,
            "city": 1,
            "latitude": 1,
            "longitude": 1,
            "max_guests": 1,
            "price_per_night": 1,
            "pricing_cycle": 1,
            "images": 1,
            "average_rating": 1,
            "reviews_count": 1,
            "has_self_cook": 1,
            "status": 1
        }
        raw_properties = await db.properties.find(query, projection).to_list(length=1000)

        if min_price is not None:
            raw_properties = [p for p in raw_properties if numeric_price(p) >= min_price]
        if max_price is not None:
            raw_properties = [p for p in raw_properties if numeric_price(p) <= max_price]

        if sort == "price_asc":
            raw_properties.sort(key=numeric_price)
        elif sort == "price_desc":
            raw_properties.sort(key=numeric_price, reverse=True)
        elif sort == "newest":
            raw_properties.sort(key=lambda p: p.get("created_at") or "", reverse=True)
        elif sort == "rating_desc":
            raw_properties.sort(
                key=lambda p: (p.get("rating") or 0, p.get("review_count") or 0),
                reverse=True,
            )
        else:
            raw_properties.sort(
                key=lambda p: (bool(p.get("instant_booking")), p.get("created_at") or ""),
                reverse=True,
            )

        total = len(raw_properties)
        properties = raw_properties[skip: skip + limit]

        # Log search activity for analytics (admin dashboard)
        try:
            import uuid
            import asyncio
            log_doc = {
                "search_id": f"search_{uuid.uuid4().hex[:12]}",
                "timestamp": datetime.now(timezone.utc),
                "city": city or "",
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

        # Set cache-control header for property search listings (15 minutes)
        response.headers["Cache-Control"] = "public, max-age=900"

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
        property_dict = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )

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
        if current_user:
            user_id = current_user.get("user_id")
            existing_booking = await db.bookings.find_one({
                "property_id": property_id,
                "guest_id": user_id,
                "booking_status": "confirmed"
            })
            if existing_booking:
                has_confirmed_booking = True
            elif property_dict.get("owner_id") == user_id or current_user.get("role") == "admin":
                has_confirmed_booking = True

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
        canonical = property_dict.get("canonical_url") or f"https://x-space360.in/property/{property_dict.get('property_id')}"
        
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
        
        # Update property
        update_data = property_update.model_dump(exclude_unset=True)
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

        if property_dict["owner_id"] != current_user["user_id"] and current_user["role"] != UserRole.ADMIN.value:
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
        await db.deleted_properties.insert_one({
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
        })

        await db.properties.delete_one({"property_id": property_id})
        await db.blocked_dates.delete_many({"property_id": property_id})
        await db.external_calendars.delete_many({"property_id": property_id})
        await db.property_verifications.delete_many({"property_id": property_id})

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
        

