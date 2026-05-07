from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date, timezone
from enum import Enum

class BlockedDateSource(str, Enum):
    MANUAL = "manual"  # Host manually blocked
    BOOKING = "booking"  # Blocked by confirmed booking
    EXTERNAL = "external"  # From external calendar (iCal)

class BlockedDate(BaseModel):
    blocked_date_id: str = Field(default_factory=lambda: f"blocked_{int(datetime.now(timezone.utc).timestamp())}")
    property_id: str
    owner_id: str
    
    # Date range
    start_date: date
    end_date: date
    
    # Source
    source: BlockedDateSource = BlockedDateSource.MANUAL
    source_id: Optional[str] = None  # booking_id or external_calendar_id
    
    # Details
    reason: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlockDateRequest(BaseModel):
    start_date: date
    end_date: date
    reason: Optional[str] = None

class ExternalCalendar(BaseModel):
    calendar_id: str = Field(default_factory=lambda: f"cal_{int(datetime.now(timezone.utc).timestamp())}")
    property_id: str
    owner_id: str
    
    # Calendar details
    name: str
    ical_url: str
    color: str = "#3B82F6"  # Blue
    is_active: bool = True
    
    # Sync details
    last_synced_at: Optional[datetime] = None
    sync_status: str = "pending"  # pending, success, failed
    sync_error: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CalendarEvent(BaseModel):
    event_id: str
    property_id: str
    title: str
    start_date: date
    end_date: date
    source: BlockedDateSource
    source_id: Optional[str] = None
    color: str
    details: Optional[dict] = {}