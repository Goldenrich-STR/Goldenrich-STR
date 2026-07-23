from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone
from enum import Enum
from uuid import uuid4

class PropertyType(str, Enum):
    APARTMENT = "apartment"
    VILLA = "villa"
    STUDIO = "studio"
    INDEPENDENT_HOUSE = "independent_house"
    CO_LIVING = "co_living"
    PRIVATE_OFFICE = "private_office"
    CO_WORKING = "co_working"
    MEETING_ROOM = "meeting_room"
    BANQUET_HALL = "banquet_hall"
    FARMHOUSE = "farmhouse"
    ROOFTOP = "rooftop"
    HOTEL_BALLROOM = "hotel_ballroom"
    RESORT = "resort"

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
    FIVE_BHK = "5bhk"
    COMMERCIAL = "commercial"
    BANQUET = "banquet"
    
    # Commercial sizes
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    EXTRA_LARGE = "extra_large"
    CUSTOM = "custom"
    
    # Event sizes
    SMALL_EVENT = "small_event"
    MEDIUM_EVENT = "medium_event"
    LARGE_EVENT = "large_event"
    MEGA_EVENT = "mega_event"

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
    google_maps_url: Optional[str] = None
    nearby_places: List[str] = []
    
    # Property details
    area_sqft: int
    max_guests: int = 6
    
    # Pricing
    price_per_night: Optional[float] = None
    pricing_cycle: Optional[str] = "day"
    pricing_display_mode: Optional[str] = "per_night"
    price_per_week: Optional[float] = None
    price_per_month: Optional[float] = None
    per_person_price: Optional[float] = None
    extra_guest_price: Optional[float] = None
    minimum_stay_days: int = 1
    
    # Amenities
    amenities: List[str] = []
    
    # Media
    images: List[str] = []
    video_url: Optional[str] = None
    youtube_short_url: Optional[str] = None
    youtube_long_url: Optional[str] = None
    virtual_tour_link: Optional[str] = None
    
    # Policies
    house_rules: Optional[str] = None
    pet_friendly: bool = False
    smoking_allowed: bool = False
    instant_booking: bool = False
    
    # Cook Option
    has_cook: bool = False
    cook_price: Optional[float] = None
    has_self_cook: bool = False
    has_taxi: bool = False
    
    # Status
    status: PropertyStatus = PropertyStatus.DRAFT
    verification_remarks: Optional[str] = None
    is_edited: Optional[bool] = False
    
    # Availability
    blocked_dates: List[str] = []  # ISO date strings
    
    # Subscription
    subscription_id: Optional[str] = None
    subscription_status: str = "trial"  # trial, active, expired
    
    # Rating
    rating: float = 0.0
    review_count: int = 0
    
    # Event Venue Specific
    veg_price: Optional[float] = None
    non_veg_price: Optional[float] = None
    guest_size: Optional[int] = None
    packages: Optional[List[dict]] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
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
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None
    nearby_places: List[str] = []
    area_sqft: int
    max_guests: int = 6
    price_per_night: Optional[float] = None
    pricing_cycle: Optional[str] = "day"
    pricing_display_mode: Optional[str] = "per_night"
    price_per_week: Optional[float] = None
    price_per_month: Optional[float] = None
    per_person_price: Optional[float] = None
    extra_guest_price: Optional[float] = None
    minimum_stay_days: int = 1
    amenities: List[str] = []
    images: List[str] = []
    video_url: Optional[str] = None
    youtube_short_url: Optional[str] = None
    youtube_long_url: Optional[str] = None
    house_rules: Optional[str] = None
    pet_friendly: bool = False
    smoking_allowed: bool = False
    instant_booking: bool = False
    has_cook: bool = False
    cook_price: Optional[float] = None
    has_self_cook: bool = False
    has_taxi: bool = False
    veg_price: Optional[float] = None
    non_veg_price: Optional[float] = None
    guest_size: Optional[int] = None
    packages: Optional[list] = None
    subscription_id: Optional[str] = None

class PropertyUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[PropertyType] = None
    category: Optional[PropertyCategory] = None
    bhk_type: Optional[BHKType] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pin_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    google_maps_url: Optional[str] = None
    nearby_places: Optional[List[str]] = None
    area_sqft: Optional[int] = None
    max_guests: Optional[int] = None
    price_per_night: Optional[float] = None
    pricing_cycle: Optional[str] = None
    pricing_display_mode: Optional[str] = None
    price_per_week: Optional[float] = None
    price_per_month: Optional[float] = None
    per_person_price: Optional[float] = None
    extra_guest_price: Optional[float] = None
    minimum_stay_days: Optional[int] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    video_url: Optional[str] = None
    youtube_short_url: Optional[str] = None
    youtube_long_url: Optional[str] = None
    house_rules: Optional[str] = None
    pet_friendly: Optional[bool] = None
    smoking_allowed: Optional[bool] = None
    instant_booking: Optional[bool] = None
    has_cook: Optional[bool] = None
    cook_price: Optional[float] = None
    has_self_cook: Optional[bool] = None
    has_taxi: Optional[bool] = None
    veg_price: Optional[float] = None
    non_veg_price: Optional[float] = None
    guest_size: Optional[int] = None
    packages: Optional[list] = None
    subscription_id: Optional[str] = None
    blocked_dates: Optional[List[str]] = None
    is_edited: Optional[bool] = None
