from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid

class VerificationStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"

class GeoTaggedPhoto(BaseModel):
    photo_url: str
    latitude: float
    longitude: float
    timestamp: datetime
    description: Optional[str] = None

class VerificationChecklist(BaseModel):
    property_owner_verification: bool = False
    ownership_verification: bool = False
    property_location_verification: bool = False
    amenities_verification: bool = False
    safety_security_verification: bool = False
    property_photos_verification: bool = False
    pricing_verification: bool = False
    guest_capacity_rules: bool = False
    legal_compliance_verification: bool = False
    employee_verification_declaration: bool = False

class PropertyVerification(BaseModel):
    verification_id: str = Field(default_factory=lambda: f"verify_{uuid.uuid4().hex[:14].upper()}")
    property_id: str
    broker_id: str
    owner_id: str
    
    # Verification data
    checklist: VerificationChecklist = VerificationChecklist()
    geo_tagged_photos: List[GeoTaggedPhoto] = []
    video_url: Optional[str] = None
    broker_remarks: Optional[str] = None
    
    # RM Review
    rm_reviewed: bool = False
    rm_approved: bool = False
    rm_remarks: Optional[str] = None
    rm_id: Optional[str] = None
    
    # Status
    status: VerificationStatus = VerificationStatus.PENDING
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

class VerificationSubmit(BaseModel):
    checklist: VerificationChecklist
    geo_tagged_photos: List[GeoTaggedPhoto]
    video_url: Optional[str] = None
    broker_remarks: Optional[str] = None
