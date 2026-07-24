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

def _normalize(value: Optional[str]) -> Optional[str]:
    return value.strip().lower() if value else None

def _sqft_matches(range_text: Optional[str], area_sqft: Optional[float]) -> bool:
    if not range_text or area_sqft is None:
        return True

    text = range_text.strip().lower().replace("sqft", "").replace("sq.ft", "").replace(",", "")
    text = text.replace(" ", "")
    aliases = {
        "small": "<500",
        "medium": "500-2000",
        "large": "2000-5000",
        "extra_large": "5000+",
        "extralarge": "5000+",
    }
    text = aliases.get(text, text)
    try:
        if text.startswith("<="):
            return area_sqft <= float(text[2:])
        if text.startswith(">="):
            return area_sqft >= float(text[2:])
        if text.startswith("<"):
            return area_sqft < float(text[1:])
        if text.startswith(">"):
            return area_sqft > float(text[1:])
        if text.endswith("+"):
            return area_sqft >= float(text[:-1])
        if "-" in text:
            start, end = text.split("-", 1)
            return float(start) <= area_sqft <= float(end)
    except ValueError:
        return True

    return True

def _target_matches(
    item: dict,
    *,
    plan_type: Optional[str] = None,
    property_category: Optional[str] = None,
    bhk_type: Optional[str] = None,
    area_sqft: Optional[float] = None,
) -> bool:
    requested_plan_type = _normalize(plan_type)
    requested_category = _normalize(property_category)
    requested_bhk = _normalize(bhk_type)

    item_plan_type = _normalize(item.get("plan_type"))
    item_category = _normalize(item.get("property_category"))
    item_bhk = _normalize(item.get("bhk_type"))

    if requested_plan_type and item_plan_type and item_plan_type != requested_plan_type:
        return False
    if requested_category and item_category and item_category != requested_category:
        return False
    if requested_bhk and item_bhk and item_bhk != requested_bhk:
        return False
    return _sqft_matches(item.get("sqft_range"), area_sqft)

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
        if coupon_data.discount_type == "target_taxable" and coupon_data.coupon_type != "subscription":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Final taxable amount coupons are only supported for subscriptions"
            )
        
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
            property_id=coupon_data.property_id,
            plan_type=coupon_data.plan_type,
            property_category=coupon_data.property_category,
            bhk_type=coupon_data.bhk_type,
            sqft_range=coupon_data.sqft_range,
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
    plan_type: Optional[str] = None,
    property_category: Optional[str] = None,
    bhk_type: Optional[str] = None,
    area_sqft: Optional[float] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get active subscription coupons (Public)"""
    try:
        cursor = db.coupons.find({
            "is_active": True,
            "coupon_type": "subscription"
        }, {"_id": 0})
        coupons = await cursor.to_list(length=20)
        coupons = [
            coupon for coupon in coupons
            if _target_matches(
                coupon,
                plan_type=plan_type,
                property_category=property_category,
                bhk_type=bhk_type,
                area_sqft=area_sqft,
            )
        ]
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

@router.delete("/admin/{coupon_id}", response_model=dict)
async def delete_coupon(
    coupon_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a coupon (Admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can delete coupons"
            )

        result = await db.coupons.delete_one({"coupon_id": coupon_id})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Coupon not found"
            )

        logger.info(f"Coupon deleted: {coupon_id}")
        return {"message": "Coupon deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete coupon"
        )

