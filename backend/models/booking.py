from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from enum import Enum

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    SOFT_LOCK = "soft_lock"

class CancellationPolicy(str, Enum):
    FLEXIBLE = "flexible"
    MODERATE = "moderate"
    STRICT = "strict"
    NON_REFUNDABLE = "non_refundable"

class Booking(BaseModel):
    booking_id: str = Field(default_factory=lambda: f"BK{int(datetime.utcnow().timestamp())}")
    property_id: str
    guest_id: str
    host_id: str
    
    # Booking details
    check_in_date: date
    check_out_date: date
    number_of_guests: int
    
    # Pricing
    base_amount: float
    service_fee: float
    taxes: float
    total_amount: float
    
    # Payment
    payment_status: str = "pending"  # pending, paid, failed, refunded
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    
    # Status
    booking_status: BookingStatus = BookingStatus.PENDING
    cancellation_policy: CancellationPolicy = CancellationPolicy.MODERATE
    
    # Security deposit
    security_deposit: float = 0.0
    security_deposit_refunded: bool = False
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    confirmed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    soft_lock_expires_at: Optional[datetime] = None

class BookingCreate(BaseModel):
    property_id: str
    check_in_date: date
    check_out_date: date
    number_of_guests: int

class BookingResponse(BaseModel):
    booking_id: str
    property_id: str
    check_in_date: date
    check_out_date: date
    total_amount: float
    booking_status: BookingStatus
    payment_status: str
    created_at: datetime