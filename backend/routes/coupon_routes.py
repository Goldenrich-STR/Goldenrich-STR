from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.coupon import Coupon, CouponCreate, CouponType
from middleware.auth_middleware import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/coupons", tags=["Coupons"])

async def get_db():
    from server import db_instance
    return db_instance

@router.post("/", response_model=dict)
async def create_coupon(
    coupon_data: CouponCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new coupon (Admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can create coupons"
            )
            
        code = coupon_data.code.strip().upper()
        
        # Check if code already exists
        existing = await db.coupons.find_one({"code": code})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Coupon code already exists"
            )
            
        coupon = Coupon(
            code=code,
            discount_type=coupon_data.discount_type,
            discount_value=coupon_data.discount_value,
            coupon_type=coupon_data.coupon_type,
            property_id=coupon_data.property_id
        )
        
        await db.coupons.insert_one(coupon.model_dump())
        
        return {"message": "Coupon created successfully", "coupon_id": coupon.coupon_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create coupon"
        )

@router.get("/", response_model=dict)
async def list_coupons(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all coupons (Admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can view all coupons"
            )
            
        cursor = db.coupons.find({}, {"_id": 0}).sort("created_at", -1)
        coupons = await cursor.to_list(length=100)
        
        return {"coupons": coupons}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing coupons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list coupons"
        )

@router.get("/property/{property_id}", response_model=dict)
async def get_property_coupons(
    property_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get active booking coupons for a specific property (Public)"""
    try:
        # Find active booking coupons specifically for this property
        # Also could include global booking coupons (property_id=None), but requirement specifies "for a specific property"
        cursor = db.coupons.find({
            "is_active": True,
            "coupon_type": "booking",
            "property_id": property_id
        }, {"_id": 0})
        
        coupons = await cursor.to_list(length=10)
        
        return {"coupons": coupons}
        
    except Exception as e:
        logger.error(f"Error fetching property coupons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch property coupons"
        )

@router.get("/subscription", response_model=dict)
async def get_subscription_coupons(
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get active subscription coupons (Public)"""
    try:
        cursor = db.coupons.find({
            "is_active": True,
            "coupon_type": "subscription"
        }, {"_id": 0})
        coupons = await cursor.to_list(length=20)
        return {"coupons": coupons}
    except Exception as e:
        logger.error(f"Error fetching subscription coupons: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch subscription coupons"
        )

@router.patch("/admin/{coupon_id}/toggle", response_model=dict)
async def toggle_coupon_status(
    coupon_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Toggle coupon active status (Admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can toggle coupon status"
            )
            
        coupon = await db.coupons.find_one({"coupon_id": coupon_id})
        if not coupon:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coupon not found"
            )
            
        new_status = not coupon.get("is_active", True)
        await db.coupons.update_one(
            {"coupon_id": coupon_id},
            {"$set": {"is_active": new_status}}
        )
        
        logger.info(f"Coupon status toggled to {new_status} for: {coupon_id}")
        return {"message": f"Coupon status updated to {'active' if new_status else 'inactive'}", "is_active": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling coupon status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to toggle coupon status"
        )

