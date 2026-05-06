from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum
from uuid import uuid4

class PropertyType(str, Enum):
    APARTMENT = "apartment"
    VILLA = "villa"
    STUDIO = "studio"
    INDEPENDENT_HOUSE = "independent_house"
    PG = "pg"
    CO_LIVING = "co_living"
    PRIVATE_OFFICE = "private_office"
    CO_WORKING = "co_working"
    MEETING_ROOM = "meeting_room"
    BANQUET_HALL = "banquet_hall"
    FARMHOUSE = "farmhouse"
    ROOFTOP = "rooftop"
    HOTEL_BALLROOM = "hotel_ballroom"

class PropertyCategory(str, Enum):
    RESIDENTIAL = "residential"
    COMMERCIAL = "commercial"
    EVENT_VENUE = "event_venue"

class PropertyStatus(str, Enum):
    DRAFT = "draft"
    PENDING_VERIFICATION = "pending_verification"
    UNDER_REVIEW = "under_review"
    LIVE = "live"
    REJECTED = "rejected"
    BLOCKED = "blocked"

class BHKType(str, Enum):
    STUDIO = "studio"
    ONE_BHK = "1bhk"
    TWO_BHK = "2bhk"
    THREE_BHK = "3bhk"
    FOUR_BHK = "4bhk"
    COMMERCIAL = "commercial"
    BANQUET = "banquet"

class Property(BaseModel):
    property_id: str = Field(default_factory=lambda: f"prop_{uuid4().hex[:14]}")
    owner_id: str
    broker_id: Optional[str] = None
    
    # Basic details
    title: str
    description: str
    property_type: PropertyType
    category: PropertyCategory
    bhk_type: BHKType
    
    # Location
    address: str
    city: str
    state: str
    pin_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    
    # Property details
    area_sqft: int
    
    # Pricing
    price_per_night: Optional[float] = None
    price_per_week: Optional[float] = None
    price_per_month: Optional[float] = None
    minimum_stay_days: int = 1
    
    # Amenities
    amenities: List[str] = []
    
    # Media
    images: List[str] = []
    virtual_tour_link: Optional[str] = None
    
    # Policies
    house_rules: Optional[str] = None
    pet_friendly: bool = False
    smoking_allowed: bool = False
    instant_booking: bool = False
    
    # Status
    status: PropertyStatus = PropertyStatus.DRAFT
    verification_remarks: Optional[str] = None
    
    # Availability
    blocked_dates: List[str] = []  # ISO date strings
    
    # Subscription
    subscription_id: Optional[str] = None
    subscription_status: str = "trial"  # trial, active, expired
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None

class PropertyCreate(BaseModel):
    title: str
    description: str
    property_type: PropertyType
    category: PropertyCategory
    bhk_type: BHKType
    address: str
    city: str
    state: str
    pin_code: str
    area_sqft: int
    price_per_night: Optional[float] = None
    price_per_week: Optional[float] = None
    price_per_month: Optional[float] = None
    minimum_stay_days: int = 1
    amenities: List[str] = []
    images: List[str] = []
    house_rules: Optional[str] = None
    pet_friendly: bool = False
    smoking_allowed: bool = False
    instant_booking: bool = False

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price_per_night: Optional[float] = None
    price_per_week: Optional[float] = None
    price_per_month: Optional[float] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    blocked_dates: Optional[List[str]] = None
    instant_booking: Optional[bool] = None