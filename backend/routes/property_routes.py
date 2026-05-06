from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.property import Property, PropertyCreate, PropertyUpdate, PropertyStatus, PropertyCategory
from models.user import UserRole
from middleware.auth_middleware import get_current_user, require_role
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/properties", tags=["Properties"])

@router.post("/", response_model=Property)
async def create_property(
    property_data: PropertyCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends()
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
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bhk_type: Optional[str] = None,
    amenities: Optional[str] = Query(None, description="Comma-separated amenities"),
    instant_booking: Optional[bool] = None,
    limit: int = 20,
    skip: int = 0,
    db: AsyncIOMotorDatabase = Depends()
):
    """Search properties with filters (public endpoint)."""
    try:
        # Build query
        query = {"status": PropertyStatus.LIVE.value}
        
        if category:
            query["category"] = category.value
        
        if city:
            query["city"] = {"$regex": city, "$options": "i"}
        
        if bhk_type:
            query["bhk_type"] = bhk_type
        
        if instant_booking is not None:
            query["instant_booking"] = instant_booking
        
        # Price filter
        if min_price or max_price:
            price_query = {}
            if min_price:
                price_query["$gte"] = min_price
            if max_price:
                price_query["$lte"] = max_price
            query["price_per_night"] = price_query
        
        # Amenities filter
        if amenities:
            amenity_list = [a.strip() for a in amenities.split(",")]
            query["amenities"] = {"$all": amenity_list}
        
        # Execute query
        cursor = db.properties.find(query, {"_id": 0}).skip(skip).limit(limit)
        properties = await cursor.to_list(length=limit)
        
        # Get total count
        total = await db.properties.count_documents(query)
        
        return {
            "properties": properties,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error searching properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search properties"
        )

@router.get("/{property_id}")
async def get_property(
    property_id: str,
    db: AsyncIOMotorDatabase = Depends()
):
    """Get property details by ID (public endpoint)."""
    try:
        property_dict = await db.properties.find_one({"property_id": property_id}, {"_id": 0})
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
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
    db: AsyncIOMotorDatabase = Depends()
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
    db: AsyncIOMotorDatabase = Depends()
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
        update_data["updated_at"] = datetime.utcnow()
        
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
    db: AsyncIOMotorDatabase = Depends()
):
    """Submit property for verification (Host only)."""
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
                "submitted_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"Property submitted for verification: {property_id}")
        return {"message": "Property submitted for verification"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit property"
        )