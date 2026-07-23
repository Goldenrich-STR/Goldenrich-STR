from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4


class SupportTicketStatus(str, Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class SupportTicketPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class SupportTicket(BaseModel):
    ticket_id: str = Field(default_factory=lambda: f"ticket_{uuid4().hex[:12].upper()}")
    user_id: str
    user_name: str
    user_email: str
    user_phone: str = ""
    user_role: str
    user_lg_code: Optional[str] = None
    user_employee_code: Optional[str] = None
    user_uid: Optional[str] = None
    user_broker_id: Optional[str] = None
    user_rm_id: Optional[str] = None
    subject: str
    message: str
    category: str = "general"
    priority: SupportTicketPriority = SupportTicketPriority.NORMAL
    status: SupportTicketStatus = SupportTicketStatus.OPEN
    admin_response: Optional[str] = None
    assigned_admin_id: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=160)
    message: str = Field(..., min_length=5, max_length=2000)
    category: str = Field(default="general", max_length=60)
    priority: SupportTicketPriority = SupportTicketPriority.NORMAL


class SupportTicketUpdate(BaseModel):
    status: Optional[SupportTicketStatus] = None
    admin_response: Optional[str] = Field(default=None, max_length=2000)
    priority: Optional[SupportTicketPriority] = None
