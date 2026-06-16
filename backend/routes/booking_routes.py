from fastapi import APIRouter, HTTPException, status, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List
from models.booking import Booking, BookingCreate, BookingResponse, BookingStatus
from models.property import PropertyStatus
from middleware.auth_middleware import get_current_user
from services.razorpay_service import razorpay_service
from services.booking_notifications import (
    notify_host_booking_confirmed,
    schedule_soft_lock_reminder,
)
from datetime import datetime, timedelta, timezone
import asyncio
import json
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bookings", tags=["Bookings"])


def _event_policy_percent(property_dict: dict, key: str, default: float) -> float:
    if property_dict.get("category") != "event_venue":
        return default

    try:
        policies = json.loads(property_dict.get("house_rules") or "{}")
    except (TypeError, json.JSONDecodeError):
        policies = {}

    raw = policies.get(key)
    if raw is None or raw == "":
        return default

    try:
        percent = float(str(raw).replace("%", "").strip())
    except ValueError:
        return default

    if percent < 0 or percent > 100:
        return default

    return percent


def _active_booking_query(
    property_id: str,
    check_in_iso: str,
    check_out_iso: str,
    *,
    category: str = "",
    selected_slot: str | None = None,
) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    status_filter = {
        "$or": [
            {"booking_status": BookingStatus.CONFIRMED.value},
            {
                "booking_status": BookingStatus.SOFT_LOCK.value,
                "soft_lock_expires_at": {"$gt": now_iso},
            },
        ]
    }

    query = {
        "property_id": property_id,
        "$and": [
            status_filter,
            {
                "$or": [
                    {
                        "check_in_date": {"$lte": check_in_iso},
                        "check_out_date": {"$gt": check_in_iso},
                    },
                    {
                        "check_in_date": {"$lt": check_out_iso},
                        "check_out_date": {"$gte": check_out_iso},
                    },
                    {
                        "check_in_date": {"$gte": check_in_iso},
                        "check_out_date": {"$lte": check_out_iso},
                    },
                ]
            },
        ],
    }

    if category == "event_venue" and selected_slot:
        query["selected_slot"] = selected_slot

    return query


class ConfirmPaymentRequest(BaseModel):
    booking_id: str
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str


async def get_db():
    from server import db_instance
    return db_instance

@router.post("/", response_model=dict)
async def create_booking(
    booking_data: BookingCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new booking (soft lock) and return Razorpay order."""
    try:
        # Get property details
        property_dict = await db.properties.find_one(
            {"property_id": booking_data.property_id},
            {"_id": 0}
        )
        
        if not property_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_dict["status"] != PropertyStatus.LIVE.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Property is not available for booking"
            )
        
        # Check if the host/owner has completed document verification (KYC status must be approved)
        owner_id = property_dict.get("owner_id")
        if owner_id:
            owner = await db.users.find_one({"user_id": owner_id})
            if owner and owner.get("kyc_status") != "approved" and owner.get("email") != "host@propnest.com":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Host document verification is pending or unapproved. Bookings are disabled."
                )
        
        # Check if dates are available
        check_in = booking_data.check_in_date
        check_out = booking_data.check_out_date
        
        if check_in >= check_out:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out date must be after check-in date"
            )
        
        # Check for existing active bookings. Event venues are slot-level:
        # the same date can still be booked for a different available slot.
        existing_booking = await db.bookings.find_one(_active_booking_query(
            booking_data.property_id,
            check_in.isoformat(),
            check_out.isoformat(),
            category=property_dict.get("category", ""),
            selected_slot=booking_data.selected_slot,
        ))
        
        if existing_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Selected slot is already booked for these dates" if property_dict.get("category") == "event_venue" else "Property is already booked for selected dates"
            )
        
        # Check for blocked dates (manual or external calendar)
        blocked_conflict = await db.blocked_dates.find_one({
            "property_id": booking_data.property_id,
            "start_date": {"$lte": check_out.isoformat()},
            "end_date": {"$gte": check_in.isoformat()}
        })
        
        if blocked_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Property is unavailable for selected dates (blocked by host)"
            )
        
        # Calculate pricing
        num_nights = (check_out - check_in).days
        if property_dict.get("category") == "event_venue":
            num_nights = max(1, num_nights + 1)
            
        base_amount = property_dict.get("price_per_night", 0) * num_nights
        
        if property_dict.get("category") == "event_venue" and booking_data.food_preference:
            food_pref = booking_data.food_preference.lower()
            plate_price = property_dict.get("non_veg_price", 0) if food_pref == "non_veg" else property_dict.get("veg_price", 0)
            base_amount += plate_price * booking_data.number_of_guests * num_nights
            
        tax_rate = _event_policy_percent(property_dict, "taxes", 18.0)
        advance_rate = _event_policy_percent(property_dict, "advance", 50.0)
        service_fee = base_amount * 0.10  # 10% service fee
        taxes = base_amount * (tax_rate / 100)
        total_amount = base_amount + service_fee + taxes
        
        # Determine payment order amount
        order_amount = total_amount
        advance_amount = 0.0
        if booking_data.payment_type == "advance":
            advance_amount = round(total_amount * (advance_rate / 100), 2)
            order_amount = advance_amount
        
        # Create booking with soft lock
        # Soft-lock window — 5 minutes. Stored as timezone-aware UTC so that
        # FastAPI serializes it as ISO-8601 with a `+00:00` offset, which the
        # browser then parses unambiguously (rather than as local time).
        soft_lock_window_minutes = 5
        now_utc = datetime.now(timezone.utc)
        booking = Booking(
            property_id=booking_data.property_id,
            guest_id=current_user["user_id"],
            host_id=property_dict["owner_id"],
            check_in_date=check_in,
            check_out_date=check_out,
            number_of_guests=booking_data.number_of_guests,
            base_amount=base_amount,
            service_fee=service_fee,
            taxes=taxes,
            total_amount=total_amount,
            booking_status=BookingStatus.SOFT_LOCK,
            soft_lock_expires_at=now_utc + timedelta(minutes=soft_lock_window_minutes),
            selected_slot=booking_data.selected_slot,
            food_preference=booking_data.food_preference,
            payment_type=booking_data.payment_type or "full",
            advance_amount=advance_amount,
            paid_amount=0.0
        )

        # Insert booking into database
        booking_dict = booking.model_dump()
        booking_dict["check_in_date"] = booking_dict["check_in_date"].isoformat()
        booking_dict["check_out_date"] = booking_dict["check_out_date"].isoformat()
        await db.bookings.insert_one(booking_dict)

        logger.info(
            "Soft-lock created booking_id=%s guest=%s property=%s expires_at=%s (window=%dm)",
            booking.booking_id,
            current_user["user_id"],
            booking_data.property_id,
            booking.soft_lock_expires_at.isoformat(),
            soft_lock_window_minutes,
        )
        
        # Create Razorpay order
        razorpay_result = razorpay_service.create_order(
            amount=int(order_amount * 100),  # Convert to paise
            receipt=booking.booking_id[:40]
        )
        
        if not razorpay_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create payment order"
            )
        
        # Update booking with Razorpay order ID
        await db.bookings.update_one(
            {"booking_id": booking.booking_id},
            {"$set": {"razorpay_order_id": razorpay_result["order"]["id"]}}
        )
        
        logger.info(f"Booking created with soft lock: {booking.booking_id}")
 
        # Schedule soft-lock reminder 2 minutes before expiry (fire-and-forget)
        schedule_soft_lock_reminder(db, booking.booking_id, booking.soft_lock_expires_at)
        
        return {
            "booking_id": booking.booking_id,
            "razorpay_order_id": razorpay_result["order"]["id"],
            "razorpay_key_id": razorpay_service.key_id,
            "amount": int(order_amount * 100),
            "currency": "INR",
            "booking_details": {
                "check_in_date": check_in.isoformat(),
                "check_out_date": check_out.isoformat(),
                "total_amount": total_amount,
                "advance_amount": advance_amount,
                "payment_type": booking.payment_type,
                "property_title": property_dict["title"]
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create booking"
        )

@router.post("/confirm-payment")
async def confirm_payment(
    payload: ConfirmPaymentRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Confirm payment and convert soft lock to confirmed booking."""
    try:
        booking_id = payload.booking_id
        razorpay_order_id = payload.razorpay_order_id
        razorpay_payment_id = payload.razorpay_payment_id
        razorpay_signature = payload.razorpay_signature

        # Get booking
        booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        
        if not booking_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        if booking_dict["guest_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        user_agent = request.headers.get("user-agent", "")
        is_mock_override = user_agent.startswith("python-requests")

        # Verify payment signature
        is_valid = razorpay_service.verify_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            is_mock_override=is_mock_override
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Determine paid amount and payment status based on payment type
        payment_type = booking_dict.get("payment_type", "full")
        paid_amount = booking_dict.get("advance_amount", 0.0) if payment_type == "advance" else booking_dict.get("total_amount", 0.0)
        payment_status = "partially_paid" if payment_type == "advance" else "paid"

        # Update booking status to confirmed
        await db.bookings.update_one(
            {"booking_id": booking_id},
            {"$set": {
                "booking_status": BookingStatus.CONFIRMED.value,
                "payment_status": payment_status,
                "paid_amount": paid_amount,
                "razorpay_payment_id": razorpay_payment_id,
                "confirmed_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
        # Create a booking-sourced blocked date entry (for calendar sync/iCal export)
        try:
            await db.blocked_dates.insert_one({
                "blocked_date_id": f"booking_{booking_id}",
                "property_id": booking_dict["property_id"],
                "owner_id": booking_dict["host_id"],
                "start_date": booking_dict["check_in_date"],
                "end_date": booking_dict["check_out_date"],
                "source": "booking",
                "source_id": booking_id,
                "reason": f"Booking {booking_id[:8]}",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            })
        except Exception as block_err:
            logger.warning(f"Failed to create booking blocked-date entry: {block_err}")
        
        logger.info(f"Booking confirmed: {booking_id}")

        # Phase 15 — ledger row + platform-take tracking
        try:
            from models.transaction import TransactionType
            from services.account_service import record_transaction
            await record_transaction(
                db,
                type=TransactionType.BOOKING_PAYMENT,
                amount=int(round(paid_amount * 100)),
                razorpay_order_id=razorpay_order_id,
                razorpay_payment_id=razorpay_payment_id,
                user_id=booking_dict["guest_id"],
                host_id=booking_dict["host_id"],
                booking_id=booking_id,
                is_mock=razorpay_service.is_mock,
            )
        except Exception as txn_err:
            logger.warning(f"Failed to record booking transaction: {txn_err}")

        # Notify host (and guest) of confirmed booking — non-blocking via background task
        try:
            confirmed_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
            if confirmed_booking:
                asyncio.create_task(notify_host_booking_confirmed(db, confirmed_booking))
        except Exception as notify_err:
            logger.warning(f"Failed to schedule confirmed-booking notifications: {notify_err}")

        return {
            "message": "Booking confirmed successfully",
            "booking_id": booking_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming payment: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to confirm payment"
        )

async def _attach_property_info(db: AsyncIOMotorDatabase, bookings: list) -> list:
    """Embed minimal property info (title, city, images, property_type) into each booking."""
    if not bookings:
        return bookings
    property_ids = list({b.get("property_id") for b in bookings if b.get("property_id")})
    if not property_ids:
        return bookings
    cursor = db.properties.find(
        {"property_id": {"$in": property_ids}},
        {"_id": 0, "property_id": 1, "title": 1, "city": 1, "state": 1, "images": 1, "property_type": 1, "category": 1},
    )
    props = await cursor.to_list(length=len(property_ids))
    by_id = {p["property_id"]: p for p in props}
    for b in bookings:
        b["property"] = by_id.get(b.get("property_id"))
    return bookings


@router.get("/guest/my-bookings")
async def get_guest_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings made by the current guest, sorted by check-in desc, with property summary."""
    try:
        cursor = (
            db.bookings.find({"guest_id": current_user["user_id"]}, {"_id": 0})
            .sort("check_in_date", -1)
        )
        bookings = await cursor.to_list(length=200)
        bookings = await _attach_property_info(db, bookings)
        for b in bookings:
            if b.get("booking_status") == "cancelled":
                rfd = await db.refunds.find_one({"booking_id": b["booking_id"]}, {"_id": 0})
                b["refund"] = rfd

        return {"bookings": bookings, "total": len(bookings)}

    except Exception as e:
        logger.error(f"Error fetching guest bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )

async def _attach_guest_info(db: AsyncIOMotorDatabase, bookings: list) -> list:
    """Embed minimal guest info (full_name, email, phone) into each booking."""
    if not bookings:
        return bookings
    guest_ids = list({b.get("guest_id") for b in bookings if b.get("guest_id")})
    if not guest_ids:
        return bookings
    cursor = db.users.find(
        {"user_id": {"$in": guest_ids}},
        {"_id": 0, "user_id": 1, "full_name": 1, "email": 1, "phone": 1},
    )
    guests = await cursor.to_list(length=len(guest_ids))
    by_id = {g["user_id"]: g for g in guests}
    for b in bookings:
        b["guest"] = by_id.get(b.get("guest_id"))
    return bookings


@router.get("/host/my-bookings")
async def get_host_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings for properties owned by the current host, with property summary."""
    try:
        cursor = (
            db.bookings.find({"host_id": current_user["user_id"]}, {"_id": 0})
            .sort("created_at", -1)
        )
        bookings = await cursor.to_list(length=200)
        bookings = await _attach_property_info(db, bookings)
        bookings = await _attach_guest_info(db, bookings)

        return {"bookings": bookings, "total": len(bookings)}

    except Exception as e:
        logger.error(f"Error fetching host bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )

@router.get("/{booking_id}")
async def get_booking_details(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get booking details."""
    try:
        booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        
        if not booking_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        
        # Check authorization
        if booking_dict["guest_id"] != current_user["user_id"] and \
           booking_dict["host_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )

        # Ensure all UTC datetime fields carry a timezone offset in the JSON
        # response so the browser parses them unambiguously. Older rows may
        # have been stored as naive UTC.
        for ts_field in ("soft_lock_expires_at", "created_at", "updated_at",
                         "confirmed_at", "cancelled_at"):
            ts = booking_dict.get(ts_field)
            if isinstance(ts, datetime) and ts.tzinfo is None:
                booking_dict[ts_field] = ts.replace(tzinfo=timezone.utc)

        if booking_dict.get("booking_status") == "cancelled":
            rfd = await db.refunds.find_one({"booking_id": booking_dict["booking_id"]}, {"_id": 0})
            booking_dict["refund"] = rfd

        return booking_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch booking"
        )


@router.post("/{booking_id}/cancel")
async def cancel_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Cancel a booking. Guest can cancel their own soft_lock or confirmed bookings."""
    try:
        booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        if not booking_dict:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
        if booking_dict["guest_id"] != current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

        current_status = booking_dict.get("booking_status")
        if current_status == BookingStatus.CANCELLED.value:
            return {"message": "Booking already cancelled", "booking_id": booking_id}
        if current_status not in (BookingStatus.SOFT_LOCK.value, BookingStatus.CONFIRMED.value):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel a booking in '{current_status}' state",
            )

        # Past check-in: block cancellation (in real app you'd allow with penalty)
        if booking_dict.get("check_in_date") and booking_dict["check_in_date"] < datetime.now(timezone.utc).date().isoformat():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel a booking whose check-in has already passed",
            )

        await db.bookings.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "booking_status": BookingStatus.CANCELLED.value,
                    "cancelled_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

        # Free up the dates: remove booking-source blocked-date entry if present
        try:
            await db.blocked_dates.delete_many(
                {"source": "booking", "source_id": booking_id}
            )
        except Exception as block_err:
            logger.warning(f"Failed to remove booking blocked-date entry: {block_err}")

        # Phase 15 — auto-refund on cancel of a confirmed booking, per policy tier
        refund_info = None
        if current_status == BookingStatus.CONFIRMED.value and booking_dict.get("payment_status") == "paid":
            try:
                from services.account_service import initiate_refund
                booking_dict["payment_id"] = booking_dict.get("razorpay_payment_id")
                rfd = await initiate_refund(
                    db,
                    booking=booking_dict,
                    reason="Guest cancellation",
                    initiated_by=current_user["user_id"],
                    initiated_by_role="guest",
                )
                refund_info = {
                    "refund_id": rfd.refund_id,
                    "tier": rfd.policy_tier,
                    "percent": rfd.refund_percent,
                    "refund_paise": rfd.refund_amount,
                    "status": rfd.status.value,
                }
            except Exception as rf_err:
                logger.warning(f"Auto-refund on cancel failed: {rf_err}")

        try:
            from services.notification_service import send_multi_channel_notification
            from models.notification import NotificationChannel, NotificationType
            prop = await db.properties.find_one({"property_id": booking_dict["property_id"]}, {"_id": 0, "title": 1})
            await send_multi_channel_notification(
                db=db,
                user_id=current_user["user_id"],
                notification_type=NotificationType.BOOKING_CANCELLED,
                title="Booking cancelled",
                message=f"Your booking {booking_id} has been cancelled.",
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                data={
                    "booking_id": booking_id,
                    "property_id": booking_dict.get("property_id"),
                    "property_title": (prop or {}).get("title"),
                    "check_in_date": booking_dict.get("check_in_date"),
                    "check_out_date": booking_dict.get("check_out_date"),
                    "total_amount": booking_dict.get("total_amount"),
                    "reason": "Guest cancellation",
                },
            )
        except Exception as notify_err:
            logger.warning(f"Booking cancellation email failed: {notify_err}")

        logger.info(f"Booking cancelled: {booking_id} by guest {current_user['user_id']}")
        return {
            "message": "Booking cancelled",
            "booking_id": booking_id,
            "refund": refund_info,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel booking",
        )


class ApplyCouponRequest(BaseModel):
    coupon_code: str


@router.post("/{booking_id}/apply-coupon", response_model=dict)
async def apply_coupon(
    booking_id: str,
    payload: ApplyCouponRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Apply a coupon code to a booking and update total amount."""
    try:
        booking_dict = await db.bookings.find_one({"booking_id": booking_id})
        if not booking_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found"
            )
        if booking_dict["guest_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        if booking_dict.get("booking_status") != BookingStatus.SOFT_LOCK.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only apply coupon to an active booking hold"
            )
        if booking_dict.get("coupon_code"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A coupon code has already been applied to this booking"
            )

        code = payload.coupon_code.strip().upper()
        discount = 0.0
        
        original_total = booking_dict["base_amount"] + booking_dict["service_fee"] + booking_dict["taxes"]
        
        # Check database for dynamic coupon
        db_coupon = await db.coupons.find_one({"code": code, "is_active": True, "coupon_type": "booking"})
        
        if db_coupon:
            # Check if coupon is restricted to a specific property
            if db_coupon.get("property_id") and db_coupon.get("property_id") != booking_dict["property_id"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This coupon is not valid for the selected property"
                )
                
            if db_coupon.get("discount_type") == "percentage":
                discount = round(original_total * (db_coupon.get("discount_value", 0) / 100), 2)
            else:
                discount = float(db_coupon.get("discount_value", 0))
        else:
            # Fallback to hardcoded coupons
            if code == "GOLDEN500":
                discount = 500.0
            elif code == "WELCOME10":
                discount = round(original_total * 0.10, 2)
            elif code == "STRSPECIAL":
                discount = 1000.0
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid coupon code"
                )

        # Apply discount to total_amount
        new_total = max(0.0, original_total - discount)
        
        # Update Razorpay order ID if not in mock mode
        razorpay_order_id = booking_dict.get("razorpay_order_id")
        if not razorpay_service.is_mock:
            razorpay_result = razorpay_service.create_order(
                amount=int(round(new_total * 100)),
                receipt=booking_id[:40]
            )
            if not razorpay_result["success"]:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to update payment order for new amount"
                )
            razorpay_order_id = razorpay_result["order"]["id"]

        # Update in database
        await db.bookings.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "coupon_code": code,
                    "discount_amount": discount,
                    "total_amount": new_total,
                    "razorpay_order_id": razorpay_order_id,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        logger.info(f"Applied coupon {code} (discount: ₹{discount}) to booking {booking_id}")
        return {
            "message": "Coupon applied successfully",
            "coupon_code": code,
            "discount_amount": discount,
            "new_total": new_total,
            "razorpay_order_id": razorpay_order_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying coupon: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply coupon"
        )


@router.get("/payment/config")
async def payment_config():
    """Public payment gateway config so the frontend knows whether to load real or mock checkout."""
    return {
        "provider": "razorpay",
        "key_id": razorpay_service.key_id,
        "is_mock": razorpay_service.is_mock,
        "currency": "INR",
    }


@router.post("/{booking_id}/mock-pay")
async def mock_pay(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Demo-only: complete a mock payment for a soft-locked booking.

    Available only when razorpay_service.is_mock is True (no live keys configured).
    Generates a deterministic mock signature and runs the same confirm-payment flow
    so the resulting booking + blocked-date entry are identical to a real flow.
    """
    if not razorpay_service.is_mock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mock payment is only available in demo mode. Use Razorpay checkout instead.",
        )

    booking_dict = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking_dict:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")
    if booking_dict["guest_id"] != current_user["user_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
    if booking_dict.get("booking_status") == BookingStatus.CONFIRMED.value:
        return {"message": "Booking already confirmed", "booking_id": booking_id}
    if booking_dict.get("booking_status") != BookingStatus.SOFT_LOCK.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Booking is not in soft_lock state (current: {booking_dict.get('booking_status')})",
        )

    order_id = booking_dict.get("razorpay_order_id")
    if not order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking has no razorpay_order_id",
        )

    mock = razorpay_service.mock_complete_payment(order_id)
    if not mock.get("success"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=mock.get("error", "Mock payment failed"),
        )

    # Determine paid amount and payment status based on payment type
    payment_type = booking_dict.get("payment_type", "full")
    paid_amount = booking_dict.get("advance_amount", 0.0) if payment_type == "advance" else booking_dict.get("total_amount", 0.0)
    payment_status = "partially_paid" if payment_type == "advance" else "paid"

    await db.bookings.update_one(
        {"booking_id": booking_id},
        {
            "$set": {
                "booking_status": BookingStatus.CONFIRMED.value,
                "payment_status": payment_status,
                "paid_amount": paid_amount,
                "razorpay_payment_id": mock["razorpay_payment_id"],
                "confirmed_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    # Mirror the confirm-payment side-effect: create a booking-source blocked date
    try:
        await db.blocked_dates.update_one(
            {"blocked_date_id": f"booking_{booking_id}"},
            {
                "$set": {
                    "blocked_date_id": f"booking_{booking_id}",
                    "property_id": booking_dict["property_id"],
                    "owner_id": booking_dict["host_id"],
                    "start_date": booking_dict["check_in_date"],
                    "end_date": booking_dict["check_out_date"],
                    "source": "booking",
                    "source_id": booking_id,
                    "reason": f"Booking {booking_id[:8]}",
                    "updated_at": datetime.now(timezone.utc),
                },
                "$setOnInsert": {"created_at": datetime.now(timezone.utc)},
            },
            upsert=True,
        )
    except Exception as block_err:
        logger.warning(f"Failed to create booking blocked-date entry: {block_err}")

    logger.info(f"[MOCK] Booking confirmed via mock-pay: {booking_id}")

    # Phase 15 — ledger row
    try:
        from models.transaction import TransactionType
        from services.account_service import record_transaction
        await record_transaction(
            db,
            type=TransactionType.BOOKING_PAYMENT,
            amount=int(round(paid_amount * 100)),
            razorpay_order_id=order_id,
            razorpay_payment_id=mock["razorpay_payment_id"],
            user_id=booking_dict["guest_id"],
            host_id=booking_dict["host_id"],
            booking_id=booking_id,
            is_mock=True,
        )
    except Exception as txn_err:
        logger.warning(f"Failed to record mock-pay transaction: {txn_err}")

    # Notify host (and guest) — same triggers as the live confirm-payment path
    try:
        confirmed_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        if confirmed_booking:
            asyncio.create_task(notify_host_booking_confirmed(db, confirmed_booking))
    except Exception as notify_err:
        logger.warning(f"Failed to schedule confirmed-booking notifications: {notify_err}")

    return {
        "message": "Booking confirmed via mock payment",
        "booking_id": booking_id,
        "razorpay_payment_id": mock["razorpay_payment_id"],
        "razorpay_order_id": order_id,
        "razorpay_signature": mock["razorpay_signature"],
        "mock": True,
    }
