from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.property import Property, PropertyCreate, PropertyUpdate, PropertyStatus, PropertyCategory
from models.user import UserRole
from middleware.auth_middleware import get_current_user, require_role
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/properties", tags=["Properties"])

async def get_db():
    from server import db_instance
    return db_instance

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
        
        # Create property object
        property_obj = Property(
            owner_id=current_user["user_id"],
            **property_data.model_dump()
        )
        
        # Insert into database
        property_dict = property_obj.model_dump()
        await db.properties.insert_one(property_dict)
        
        logger.info(f"Property created: {property_obj.property_id} by {current_user['user_id']}")
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
    category: Optional[PropertyCategory] = None,
    city: Optional[str] = None,
    property_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bhk_type: Optional[str] = None,
    amenities: Optional[str] = Query(None, description="Comma-separated amenities"),
    instant_booking: Optional[bool] = None,
    pet_friendly: Optional[bool] = None,
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
        query = {"status": PropertyStatus.LIVE.value}

        if category:
            query["category"] = category.value

        if city:
            query["city"] = {"$regex": city, "$options": "i"}

        if property_type:
            query["property_type"] = property_type

        if bhk_type:
            query["bhk_type"] = bhk_type

        if instant_booking is not None:
            query["instant_booking"] = instant_booking

        if pet_friendly is not None:
            query["pet_friendly"] = pet_friendly

        # Price filter
        if min_price is not None or max_price is not None:
            price_query = {}
            if min_price is not None:
                price_query["$gte"] = min_price
            if max_price is not None:
                price_query["$lte"] = max_price
            query["price_per_night"] = price_query

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

        # Sort
        sort_map = {
            "price_asc": [("price_per_night", 1)],
            "price_desc": [("price_per_night", -1)],
            "newest": [("created_at", -1)],
            "recommended": [("instant_booking", -1), ("created_at", -1)],
        }
        sort_spec = sort_map.get(sort, sort_map["recommended"])

        cursor = db.properties.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
        properties = await cursor.to_list(length=limit)

        total = await db.properties.count_documents(query)

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
                "check_in": check_in,
                "check_out": check_out,
                "sort": sort,
            },
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

        # Attach safe host profile (no email/phone/password)
        host = await db.users.find_one(
            {"user_id": property_dict.get("owner_id")},
            {"_id": 0, "user_id": 1, "full_name": 1, "city": 1, "profile_image": 1, "created_at": 1, "kyc_status": 1, "role": 1},
        )
        if host:
            host["created_at"] = host["created_at"].isoformat() if host.get("created_at") else None
        property_dict["host"] = host or None

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
    """Get all properties owned by the current host."""
    try:
        cursor = db.properties.find({"owner_id": current_user["user_id"]}, {"_id": 0})
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