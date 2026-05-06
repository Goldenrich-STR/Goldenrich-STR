from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    GUEST = "guest"
    HOST = "host"
    BROKER = "broker"
    EMPLOYEE = "employee"
    ADMIN = "admin"

class KYCStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class KYCDocument(BaseModel):
    document_type: str
    document_url: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.utcnow())

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{datetime.utcnow().timestamp()}")
    email: EmailStr
    phone: str
    password_hash: str
    full_name: str
    role: UserRole
    
    # Profile fields
    city: Optional[str] = None
    profile_image: Optional[str] = "https://images.unsplash.com/photo-1655249493799-9cee4fe983bb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwcm9maWxlJTIwcG9ydHJhaXR8ZW58MHx8fHwxNzc4MDYyMDg1fDA&ixlib=rb-4.1.0&q=85"
    
    # Host-specific fields
    lg_code: Optional[str] = None  # Broker LG Code
    broker_id: Optional[str] = None  # Assigned broker user_id
    kyc_status: KYCStatus = KYCStatus.PENDING
    kyc_documents: List[KYCDocument] = []
    
    # Broker-specific fields
    region: Optional[str] = None
    
    # Employee-specific fields
    employee_region: Optional[str] = None
    
    # Common fields
    is_active: bool = True
    is_email_verified: bool = False
    is_phone_verified: bool = False
    registration_fee_paid: bool = False
    terms_accepted: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())

class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    full_name: str
    role: UserRole
    city: Optional[str] = None
    lg_code: Optional[str] = None
    terms_accepted: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: str
    email: str
    phone: str
    full_name: str
    role: UserRole
    city: Optional[str] = None
    profile_image: Optional[str] = None
    kyc_status: Optional[KYCStatus] = None
    is_active: bool
    created_at: datetime