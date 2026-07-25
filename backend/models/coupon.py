from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum

class DiscountType(str, Enum):
    FIXED = "fixed"
    PERCENTAGE = "percentage"
    TARGET_TAXABLE = "target_taxable"

class CouponType(str, Enum):
    BOOKING = "booking"
    SUBSCRIPTION = "subscription"

class Coupon(BaseModel):
    coupon_id: str = Field(default_factory=lambda: f"coup_{datetime.now(timezone.utc).timestamp()}")
    code: str
    discount_type: DiscountType
    discount_value: float
    coupon_type: CouponType
    property_id: Optional[str] = None
    plan_type: Optional[str] = None
    property_category: Optional[str] = None
    bhk_type: Optional[str] = None
    sqft_range: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponCreate(BaseModel):
    code: str
    discount_type: DiscountType
    discount_value: float
    coupon_type: CouponType
    property_id: Optional[str] = None
    plan_type: Optional[str] = None
    property_category: Optional[str] = None
    bhk_type: Optional[str] = None
    sqft_range: Optional[str] = None
