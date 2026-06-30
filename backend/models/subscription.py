from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date, timezone
from enum import Enum

class SubscriptionPlanType(str, Enum):
    STUDIO = "studio"
    ONE_BHK = "1bhk"
    TWO_BHK = "2bhk"
    THREE_BHK = "3bhk"
    FOUR_BHK = "4bhk"
    FOUR_BHK_PLUS = "4bhk_plus"
    COMMERCIAL = "commercial"
    BANQUET = "banquet"

class SubscriptionStatus(str, Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class SubscriptionPlan(BaseModel):
    plan_id: str = Field(default_factory=lambda: f"plan_{datetime.now(timezone.utc).timestamp()}")
    plan_type: SubscriptionPlanType
    plan_name: str
    price_monthly: float
    price_annual: float
    description: str
    validity_days: int = 30
    is_active: bool = True
    sqft_range: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Subscription(BaseModel):
    subscription_id: str = Field(default_factory=lambda: f"sub_{datetime.now(timezone.utc).timestamp()}")
    user_id: str
    property_id: Optional[str] = None
    plan_id: str
    
    # Subscription details
    plan_type: SubscriptionPlanType
    billing_cycle: str = "monthly"  # monthly, annual
    amount: float
    
    # Status
    status: SubscriptionStatus = SubscriptionStatus.TRIAL
    
    # Dates
    start_date: date
    end_date: date
    trial_end_date: Optional[date] = None
    
    # Payment
    razorpay_subscription_id: Optional[str] = None
    auto_renewal: bool = True
    coupon_code: Optional[str] = None
    discount_amount: float = 0.0
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cancelled_at: Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    plan_id: str
    property_id: Optional[str] = None
    billing_cycle: str = "monthly"
    coupon_code: Optional[str] = None