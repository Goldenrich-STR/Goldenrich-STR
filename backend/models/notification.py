from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from uuid import uuid4

class NotificationType(str, Enum):
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    BOOKING_PENDING_PAYMENT = "booking_pending_payment"
    BOOKING_REMINDER = "booking_reminder"
    PAYMENT_CONFIRMED = "payment_confirmed"
    NEW_BOOKING_RECEIVED = "new_booking_received"
    PROPERTY_APPROVED = "property_approved"
    PROPERTY_REJECTED = "property_rejected"
    KYC_APPROVED = "kyc_approved"
    KYC_REJECTED = "kyc_rejected"
    SUBSCRIPTION_EXPIRING = "subscription_expiring"
    SUBSCRIPTION_EXPIRED = "subscription_expired"
    VERIFICATION_ASSIGNED = "verification_assigned"
    VERIFICATION_SUBMITTED = "verification_submitted"
    VERIFICATION_REVIEWED = "verification_reviewed"
    PAYOUT_PROCESSED = "payout_processed"
    NEW_LEAD = "new_lead"
    OWNER_ASSIGNED = "owner_assigned"
    DISPUTE_RAISED = "dispute_raised"
    REVIEW_REQUEST = "review_request"
    REFUND_RECEIVED = "refund_received"
    SUPPORT_TICKET_CREATED = "support_ticket_created"
    SUPPORT_TICKET_UPDATED = "support_ticket_updated"

class NotificationChannel(str, Enum):
    SMS = "sms"
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    IN_APP = "in_app"

class NotificationStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"

class Notification(BaseModel):
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid4().hex[:14].upper()}")
    user_id: str
    
    # Notification details
    type: NotificationType
    channel: NotificationChannel
    title: str
    message: str
    
    # Metadata
    data: Optional[Dict[str, Any]] = {}  # Additional data like booking_id, property_id, etc.
    
    # Status
    status: NotificationStatus = NotificationStatus.PENDING
    
    # Delivery details
    recipient: str  # Phone, email, or user_id
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    
    # Provider details (for SMS/WhatsApp)
    provider_message_id: Optional[str] = None
    provider_response: Optional[Dict] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NotificationCreate(BaseModel):
    user_id: str
    type: NotificationType
    channel: NotificationChannel
    title: str
    message: str
    recipient: str
    data: Optional[Dict[str, Any]] = {}
