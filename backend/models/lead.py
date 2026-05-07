from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum

class LeadStatus(str, Enum):
    NEW = "new"
    CONTACTED = "contacted"
    CONVERTED = "converted"
    LOST = "lost"

class Lead(BaseModel):
    lead_id: str = Field(default_factory=lambda: f"lead_{int(datetime.now(timezone.utc).timestamp())}")
    broker_id: str
    
    # Lead details
    full_name: str
    phone: str
    email: Optional[str] = None
    city: str
    property_type: str  # residential, commercial, event_venue
    
    # Status
    status: LeadStatus = LeadStatus.NEW
    notes: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    contacted_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None

class LeadCreate(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    city: str
    property_type: str
    notes: Optional[str] = None

class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None