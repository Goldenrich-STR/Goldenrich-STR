from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum

class UserRole(str, Enum):
    GUEST = "guest"
    HOST = "host"
    BROKER = "broker"
    EMPLOYEE = "employee"
    ADMIN = "admin"

class KYCStatus(str, Enum):
    UNVERIFIED = "unverified"
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class KYCDocument(BaseModel):
    document_type: str
    document_url: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: Optional[str] = "pending"
    rejection_reason: Optional[str] = None

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: f"user_{datetime.now(timezone.utc).timestamp()}")
    email: EmailStr
    phone: str
    password_hash: str
    full_name: str
    role: UserRole
    
    # Profile fields
    city: Optional[str] = None
    state: Optional[str] = None
    franchise: Optional[str] = None
    branch: Optional[str] = None
    birthdate: Optional[str] = None
    uid: Optional[str] = None
    profile_image: Optional[str] = None
    
    # Host-specific fields
    lg_code: Optional[str] = None  # Broker LG Code
    broker_id: Optional[str] = None  # Assigned broker user_id
    kyc_status: KYCStatus = KYCStatus.UNVERIFIED
    kyc_documents: List[KYCDocument] = []
    
    # Agreement fields
    agreement_owner_name: Optional[str] = None
    agreement_owner_address: Optional[str] = None
    agreement_signature: Optional[str] = None
    agreement_signed_at: Optional[str] = None
    
    # Broker-specific fields
    region: Optional[str] = None
    rm_id: Optional[str] = None
    
    # Employee-specific fields
    employee_region: Optional[str] = None
    employee_code: Optional[str] = None
    
    # Common fields
    is_active: bool = True
    is_email_verified: bool = False
    is_phone_verified: bool = False
    registration_fee_paid: bool = False
    terms_accepted: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    phone: str
    password: str
    full_name: str
    role: UserRole
    city: Optional[str] = None
    state: Optional[str] = None
    franchise: Optional[str] = None
    branch: Optional[str] = None
    birthdate: Optional[str] = None
    uid: Optional[str] = None
    lg_code: Optional[str] = None
    employee_code: Optional[str] = None
    profile_image: Optional[str] = None
    terms_accepted: bool = False

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    city: Optional[str] = None
    state: Optional[str] = None
    franchise: Optional[str] = None
    branch: Optional[str] = None
    birthdate: Optional[str] = None
    lg_code: Optional[str] = None
    employee_code: Optional[str] = None
    broker_id: Optional[str] = None
    rm_id: Optional[str] = None
    profile_image: Optional[str] = None
    is_active: Optional[bool] = None

class UserLogin(BaseModel):
    email: str
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
