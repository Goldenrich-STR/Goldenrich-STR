from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
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
    address_matches_gps: bool = False
    structural_condition_good: bool = False
    amenities_verified: bool = False
    compliance_docs_present: bool = False
    all_rooms_photographed: bool = False
    entrance_photographed: bool = False
    video_walkthrough_uploaded: bool = False
    no_discrepancies: bool = False

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
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    completed_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None

class VerificationSubmit(BaseModel):
    checklist: VerificationChecklist
    geo_tagged_photos: List[GeoTaggedPhoto]
    video_url: Optional[str] = None
    broker_remarks: Optional[str] = None