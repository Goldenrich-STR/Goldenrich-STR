from fastapi import APIRouter, HTTPException, status, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.user import User, UserRole, KYCStatus
from models.property import PropertyStatus
from middleware.auth_middleware import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])

async def require_admin(current_user: dict = Depends(get_current_user)):
    """Dependency to check if user is admin."""
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# ========== USER MANAGEMENT ==========

@router.get("/users")
async def get_all_users(
    role: Optional[UserRole] = None,
    search: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get all users with filters."""
    try:
        query = {}
        
        if role:
            query["role"] = role.value
        
        if search:
            query["$or"] = [
                {"full_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        cursor = db.users.find(query, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit)
        users = await cursor.to_list(length=limit)
        total = await db.users.count_documents(query)
        
        return {
            "users": users,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get detailed user information."""
    try:
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get additional stats
        if user["role"] == "host":
            property_count = await db.properties.count_documents({"owner_id": user_id})
            booking_count = await db.bookings.count_documents({"host_id": user_id})
            user["stats"] = {
                "properties": property_count,
                "bookings": booking_count
            }
        elif user["role"] == "guest":
            booking_count = await db.bookings.count_documents({"guest_id": user_id})
            user["stats"] = {
                "bookings": booking_count
            }
        
        return user
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user details: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch user details"
        )

@router.patch("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    is_active: bool,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Activate or deactivate user account."""
    try:
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "is_active": is_active,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"User {user_id} status updated to {is_active} by admin {current_user['user_id']}")
        return {"message": "User status updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user status"
        )

@router.patch("/users/{user_id}/kyc")
async def update_kyc_status(
    user_id: str,
    kyc_status: KYCStatus,
    remarks: Optional[str] = None,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Approve or reject user KYC."""
    try:
        update_data = {
            "kyc_status": kyc_status.value,
            "updated_at": datetime.utcnow()
        }
        
        if remarks:
            update_data["kyc_remarks"] = remarks
        
        result = await db.users.update_one(
            {"user_id": user_id},
            {"$set": update_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        logger.info(f"KYC status for user {user_id} updated to {kyc_status.value}")
        return {"message": "KYC status updated successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating KYC status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update KYC status"
        )

# ========== PROPERTY MODERATION ==========

@router.get("/properties")
async def get_all_properties(
    status_filter: Optional[PropertyStatus] = None,
    category: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get all properties with filters."""
    try:
        query = {}
        
        if status_filter:
            query["status"] = status_filter.value
        
        if category:
            query["category"] = category
        
        cursor = db.properties.find(query, {"_id": 0}).skip(skip).limit(limit)
        properties = await cursor.to_list(length=limit)
        total = await db.properties.count_documents(query)
        
        return {
            "properties": properties,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error fetching properties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch properties"
        )

@router.get("/properties/pending-verification")
async def get_pending_verifications(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get all properties pending verification."""
    try:
        cursor = db.properties.find(
            {"status": {"$in": [PropertyStatus.PENDING_VERIFICATION.value, PropertyStatus.UNDER_REVIEW.value]}},
            {"_id": 0}
        )
        properties = await cursor.to_list(length=100)
        
        return {
            "properties": properties,
            "total": len(properties)
        }
    
    except Exception as e:
        logger.error(f"Error fetching pending verifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch pending verifications"
        )

@router.post("/properties/{property_id}/approve")
async def approve_property(
    property_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Approve property listing (final approval)."""
    try:
        result = await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": PropertyStatus.LIVE.value,
                "approved_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        logger.info(f"Property {property_id} approved by admin {current_user['user_id']}")
        return {"message": "Property approved successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error approving property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to approve property"
        )

@router.post("/properties/{property_id}/reject")
async def reject_property(
    property_id: str,
    reason: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Reject property listing."""
    try:
        result = await db.properties.update_one(
            {"property_id": property_id},
            {"$set": {
                "status": PropertyStatus.REJECTED.value,
                "verification_remarks": reason,
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        logger.info(f"Property {property_id} rejected by admin {current_user['user_id']}")
        return {"message": "Property rejected successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error rejecting property: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reject property"
        )

# ========== DASHBOARD ANALYTICS ==========

@router.get("/dashboard/stats")
async def get_dashboard_stats(
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get dashboard statistics."""
    try:
        # User stats
        total_users = await db.users.count_documents({})
        total_hosts = await db.users.count_documents({"role": "host"})
        total_guests = await db.users.count_documents({"role": "guest"})
        
        # Property stats
        total_properties = await db.properties.count_documents({})
        live_properties = await db.properties.count_documents({"status": PropertyStatus.LIVE.value})
        pending_verification = await db.properties.count_documents(
            {"status": {"$in": [PropertyStatus.PENDING_VERIFICATION.value, PropertyStatus.UNDER_REVIEW.value]}}
        )
        
        # Booking stats
        total_bookings = await db.bookings.count_documents({})
        confirmed_bookings = await db.bookings.count_documents({"booking_status": "confirmed"})
        
        # Revenue calculation
        booking_cursor = db.bookings.find({"payment_status": "paid"}, {"total_amount": 1})
        bookings = await booking_cursor.to_list(length=10000)
        total_revenue = sum(b.get("total_amount", 0) for b in bookings)
        
        return {
            "users": {
                "total": total_users,
                "hosts": total_hosts,
                "guests": total_guests
            },
            "properties": {
                "total": total_properties,
                "live": live_properties,
                "pending_verification": pending_verification
            },
            "bookings": {
                "total": total_bookings,
                "confirmed": confirmed_bookings
            },
            "revenue": {
                "total": total_revenue,
                "currency": "INR"
            }
        }
    
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard stats"
        )

# ========== BOOKING MANAGEMENT ==========

@router.get("/bookings")
async def get_all_bookings(
    status_filter: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends()
):
    """Get all bookings with filters."""
    try:
        query = {}
        
        if status_filter:
            query["booking_status"] = status_filter
        
        cursor = db.bookings.find(query, {"_id": 0}).skip(skip).limit(limit).sort("created_at", -1)
        bookings = await cursor.to_list(length=limit)
        total = await db.bookings.count_documents(query)
        
        return {
            "bookings": bookings,
            "total": total,
            "limit": limit,
            "skip": skip
        }
    
    except Exception as e:
        logger.error(f"Error fetching bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )
