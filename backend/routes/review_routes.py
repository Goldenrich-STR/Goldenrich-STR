"""Phase 18 — Review & rating routes.

Eligibility:
- Booking must be `confirmed` and paid.
- Guest must own the booking.
- 14-day window: today >= check_out_date AND today <= check_out_date + 14 days.
- One review per booking (unique constraint on booking_id).

After write, denormalize an aggregate `(rating_avg, rating_count, sub_avgs)` onto
the property document so search/listings can render stars without joining.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from middleware.auth_middleware import get_current_user
from models.review import HostResponse, Review, ReviewCreate

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Reviews"])

REVIEW_WINDOW_DAYS = 14
SUB_FIELDS = ("cleanliness", "communication", "check_in", "accuracy", "location", "value")


async def get_db():
    from server import db_instance
    return db_instance


def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def _recompute_property_rating(db: AsyncIOMotorDatabase, property_id: str) -> dict:
    """Aggregate published reviews for a property and persist on the property doc."""
    pipeline = [
        {"$match": {"property_id": property_id, "is_published": True}},
        {"$group": {
            "_id": None,
            "rating_count": {"$sum": 1},
            "rating_avg": {"$avg": "$overall_rating"},
            **{f"{f}_avg": {"$avg": f"${f}"} for f in SUB_FIELDS},
        }},
    ]
    rows = await db.reviews.aggregate(pipeline).to_list(length=1)
    if rows:
        r = rows[0]
        update = {
            "rating_count": int(r["rating_count"]),
            "rating_avg": round(float(r["rating_avg"]), 2) if r["rating_avg"] else 0.0,
        }
        for f in SUB_FIELDS:
            v = r.get(f"{f}_avg")
            if v is not None:
                update[f"rating_{f}_avg"] = round(float(v), 2)
    else:
        update = {"rating_count": 0, "rating_avg": 0.0}

    await db.properties.update_one({"property_id": property_id}, {"$set": update})
    return update


@router.get("/properties/{property_id}/reviews")
async def list_property_reviews(
    property_id: str,
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Public — list published reviews for a property, newest first."""
    cursor = (
        db.reviews.find(
            {"property_id": property_id, "is_published": True},
            {"_id": 0},
        )
        .sort("created_at", -1)
        .skip(skip)
        .limit(limit)
    )
    reviews = await cursor.to_list(length=limit)
    # Enrich with guest first name + initial only — never expose email
    for r in reviews:
        guest = await db.users.find_one(
            {"user_id": r["guest_id"]}, {"_id": 0, "full_name": 1}
        )
        if guest and guest.get("full_name"):
            parts = guest["full_name"].strip().split()
            r["guest_display_name"] = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")
        else:
            r["guest_display_name"] = "Guest"

    total = await db.reviews.count_documents(
        {"property_id": property_id, "is_published": True}
    )

    # Pull the latest aggregate from the property doc
    prop = await db.properties.find_one(
        {"property_id": property_id},
        {"_id": 0, "rating_avg": 1, "rating_count": 1,
         **{f"rating_{f}_avg": 1 for f in SUB_FIELDS}},
    ) or {}

    return {
        "reviews": reviews,
        "total": total,
        "summary": {
            "rating_avg": prop.get("rating_avg", 0.0),
            "rating_count": prop.get("rating_count", 0),
            "sub_avgs": {f: prop.get(f"rating_{f}_avg") for f in SUB_FIELDS},
        },
    }


@router.get("/bookings/{booking_id}/review-eligibility")
async def review_eligibility(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Tell the frontend whether the guest can review this booking and by when."""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, detail="Booking not found")
    if booking["guest_id"] != current_user["user_id"]:
        raise HTTPException(403, detail="Not your booking")

    existing = await db.reviews.find_one(
        {"booking_id": booking_id}, {"_id": 0, "review_id": 1}
    )
    if existing:
        return {"eligible": False, "reason": "already_reviewed", "review_id": existing["review_id"]}

    if booking.get("booking_status") != "confirmed":
        return {"eligible": False, "reason": "booking_not_confirmed"}

    check_out_str = booking.get("check_out_date")
    if not check_out_str:
        return {"eligible": False, "reason": "no_check_out_date"}
    check_out = date.fromisoformat(check_out_str)
    today = date.today()
    if today < check_out:
        return {"eligible": False, "reason": "stay_not_completed", "available_from": check_out_str}
    deadline = check_out + timedelta(days=REVIEW_WINDOW_DAYS)
    if today > deadline:
        return {"eligible": False, "reason": "window_expired", "deadline": deadline.isoformat()}

    return {
        "eligible": True,
        "deadline": deadline.isoformat(),
        "days_remaining": (deadline - today).days,
    }


@router.post("/bookings/{booking_id}/review")
async def create_review(
    booking_id: str,
    payload: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Create a review for a completed booking. One per booking."""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(404, detail="Booking not found")
    if booking["guest_id"] != current_user["user_id"]:
        raise HTTPException(403, detail="Not your booking")
    if booking.get("booking_status") != "confirmed":
        raise HTTPException(400, detail="Only confirmed bookings can be reviewed")

    check_out = date.fromisoformat(booking["check_out_date"])
    today = date.today()
    if today < check_out:
        raise HTTPException(400, detail="You can only review after check-out")
    if today > check_out + timedelta(days=REVIEW_WINDOW_DAYS):
        raise HTTPException(400, detail=f"Review window expired ({REVIEW_WINDOW_DAYS} days after check-out)")

    if await db.reviews.find_one({"booking_id": booking_id}):
        raise HTTPException(400, detail="You have already reviewed this booking")

    review = Review(
        booking_id=booking_id,
        property_id=booking["property_id"],
        guest_id=booking["guest_id"],
        host_id=booking["host_id"],
        **payload.model_dump(),
    )
    await db.reviews.insert_one(review.model_dump())
    summary = await _recompute_property_rating(db, booking["property_id"])

    logger.info(
        f"Review created review_id={review.review_id} property={booking['property_id']} "
        f"rating={review.overall_rating} new_avg={summary.get('rating_avg')} count={summary.get('rating_count')}"
    )
    return {"message": "Review posted", "review": _strip(review.model_dump()), "summary": summary}


@router.post("/reviews/{review_id}/host-response")
async def respond_to_review(
    review_id: str,
    payload: HostResponse,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Allow the host (and only the host) to post a single response per review."""
    review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(404, detail="Review not found")
    if review["host_id"] != current_user["user_id"]:
        raise HTTPException(403, detail="Only the host can respond to this review")
    if review.get("host_response"):
        raise HTTPException(400, detail="You have already responded to this review")

    now = datetime.utcnow()
    await db.reviews.update_one(
        {"review_id": review_id},
        {"$set": {
            "host_response": payload.response,
            "host_response_at": now,
            "updated_at": now,
        }},
    )
    review["host_response"] = payload.response
    review["host_response_at"] = now
    return {"message": "Response posted", "review": review}


@router.get("/host/reviews")
async def list_host_reviews(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Show every review across all of this host's properties (newest first)."""
    cursor = (
        db.reviews.find({"host_id": current_user["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
        .limit(200)
    )
    items = await cursor.to_list(length=200)
    for r in items:
        prop = await db.properties.find_one(
            {"property_id": r["property_id"]},
            {"_id": 0, "title": 1, "city": 1},
        )
        r["property"] = prop or {}
    return {"reviews": items, "total": len(items)}


@router.get("/guest/my-reviews")
async def list_my_reviews(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    cursor = (
        db.reviews.find({"guest_id": current_user["user_id"]}, {"_id": 0})
        .sort("created_at", -1)
    )
    items = await cursor.to_list(length=200)
    return {"reviews": items, "total": len(items)}
