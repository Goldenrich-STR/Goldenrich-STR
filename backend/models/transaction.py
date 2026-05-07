"""Phase 15 — Super Admin Account ledger, payouts, refunds.

All amounts are stored in PAISE (integer) — Razorpay convention.
Every money-movement writes a Transaction row so the admin ledger has a single
source of truth.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# --------------- Enums ----------------

class TransactionType(str, Enum):
    BOOKING_PAYMENT = "booking_payment"
    REGISTRATION_FEE = "registration_fee"
    SUBSCRIPTION = "subscription"
    REFUND = "refund"
    PAYOUT = "payout"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class PayoutStatus(str, Enum):
    ELIGIBLE = "eligible"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"


class RefundStatus(str, Enum):
    PENDING = "pending"
    PROCESSED = "processed"
    FAILED = "failed"


class PayoutDestinationType(str, Enum):
    UPI = "upi"
    BANK = "bank"


# --------------- Host payout preference ----------------

class HostPayoutPreference(BaseModel):
    """Stored inline on users doc under `payout_preference`."""
    preferred: PayoutDestinationType = PayoutDestinationType.UPI
    upi_vpa: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None


class HostPayoutPreferenceUpdate(BaseModel):
    preferred: PayoutDestinationType
    upi_vpa: Optional[str] = None
    bank_account_holder: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None


# --------------- Transaction ledger ----------------

class Transaction(BaseModel):
    transaction_id: str = Field(
        default_factory=lambda: f"txn_{uuid.uuid4().hex[:16].upper()}"
    )
    type: TransactionType
    amount: int  # paise
    currency: str = "INR"
    status: TransactionStatus = TransactionStatus.SUCCESS

    # Razorpay identifiers (any may be present depending on type)
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_refund_id: Optional[str] = None
    razorpay_payout_id: Optional[str] = None

    # Linked entities
    user_id: Optional[str] = None           # guest or host or whoever
    host_id: Optional[str] = None
    booking_id: Optional[str] = None
    subscription_id: Optional[str] = None
    payout_id: Optional[str] = None
    refund_id: Optional[str] = None

    notes: Optional[str] = None
    is_mock: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --------------- Host Payout ----------------

class Payout(BaseModel):
    payout_id: str = Field(
        default_factory=lambda: f"pyo_{uuid.uuid4().hex[:16].upper()}"
    )
    host_id: str
    booking_id: str
    property_id: str

    gross_amount: int           # total paid by guest (paise) — excludes tax/service since those are platform revenue
    platform_fee: int           # platform take (paise)
    net_amount: int             # what host actually receives (paise)

    destination_type: PayoutDestinationType
    destination_ref: str        # VPA or masked bank account
    destination_holder: Optional[str] = None
    destination_ifsc: Optional[str] = None

    status: PayoutStatus = PayoutStatus.ELIGIBLE

    razorpay_payout_id: Optional[str] = None
    failure_reason: Optional[str] = None
    is_mock: bool = False

    eligible_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# --------------- Refund ----------------

class Refund(BaseModel):
    refund_id: str = Field(
        default_factory=lambda: f"rfd_{uuid.uuid4().hex[:16].upper()}"
    )
    booking_id: str
    guest_id: str
    host_id: str

    original_amount: int        # what was paid (paise)
    refund_amount: int          # refunded (paise)
    refund_percent: float       # 0, 50, 100 from policy
    policy_tier: str            # "full" | "partial_50" | "no_refund" | "admin_override"

    reason: str
    initiated_by: str           # user_id of admin or host (or 'system')
    initiated_by_role: str      # 'admin' | 'host' | 'system'

    razorpay_payment_id: Optional[str] = None
    razorpay_refund_id: Optional[str] = None
    status: RefundStatus = RefundStatus.PENDING
    failure_reason: Optional[str] = None
    is_mock: bool = False

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None


# --------------- Request/response DTOs ----------------

class InitiateRefundRequest(BaseModel):
    reason: str
    override_amount: Optional[int] = None    # if set, skips policy tier
    override_percent: Optional[float] = None  # alternative to amount


class ProcessPayoutRequest(BaseModel):
    notes: Optional[str] = None
