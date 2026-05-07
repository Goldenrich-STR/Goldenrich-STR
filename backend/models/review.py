"""Phase 18 — Reviews & Ratings.

A guest can review a property after their stay completes. Reviews carry an
overall rating plus optional sub-category ratings, all on a 1-5 scale. The
14-day eligibility window starts at check-out.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field, conint


class ReviewCreate(BaseModel):
    overall_rating: conint(ge=1, le=5)
    cleanliness: Optional[conint(ge=1, le=5)] = None
    communication: Optional[conint(ge=1, le=5)] = None
    check_in: Optional[conint(ge=1, le=5)] = None
    accuracy: Optional[conint(ge=1, le=5)] = None
    location: Optional[conint(ge=1, le=5)] = None
    value: Optional[conint(ge=1, le=5)] = None
    comment: Optional[str] = Field(default=None, max_length=2000)
    photo_url: Optional[str] = Field(
        default=None,
        max_length=2048,
        description="Optional reviewer photo (one image URL — typically the upload URL "
                    "returned by /api/upload/image).",
    )


class HostResponse(BaseModel):
    response: str = Field(min_length=1, max_length=1500)


class Review(BaseModel):
    review_id: str = Field(default_factory=lambda: f"rev_{uuid.uuid4().hex[:14].upper()}")
    booking_id: str
    property_id: str
    guest_id: str
    host_id: str

    overall_rating: int
    cleanliness: Optional[int] = None
    communication: Optional[int] = None
    check_in: Optional[int] = None
    accuracy: Optional[int] = None
    location: Optional[int] = None
    value: Optional[int] = None
    comment: Optional[str] = None
    photo_url: Optional[str] = None
    # Server-set: a review whose underlying booking was paid + confirmed is a
    # "verified stay". Set on the server during create — never trusted from the
    # client. Used to render a public badge that boosts trust.
    is_verified_stay: bool = True

    # Host can post a single response after the review is published
    host_response: Optional[str] = None
    host_response_at: Optional[datetime] = None

    is_published: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
