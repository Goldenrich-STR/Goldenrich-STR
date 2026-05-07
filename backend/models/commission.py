from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional

class Commission(BaseModel):
    commission_id: str = Field(default_factory=lambda: f"comm_{int(datetime.now(timezone.utc).timestamp())}")
    broker_id: str
    booking_id: str
    property_id: str
    
    # Commission details
    booking_amount: float
    commission_percentage: float
    commission_amount: float
    
    # Payment status
    payment_status: str = "pending"  # pending, paid
    payment_date: Optional[datetime] = None
    payment_reference: Optional[str] = None
    
    # Source
    booking_source: str  # platform, offline
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))