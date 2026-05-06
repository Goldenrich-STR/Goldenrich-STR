from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List
from models.booking import Booking, BookingCreate, BookingResponse, BookingStatus
from models.property import PropertyStatus
from middleware.auth_middleware import get_current_user
from services.razorpay_service import razorpay_service
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/bookings", tags=["Bookings"])


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
        
        # Check if dates are available
        check_in = booking_data.check_in_date
        check_out = booking_data.check_out_date
        
        if check_in >= check_out:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Check-out date must be after check-in date"
            )
        
        # Check for existing bookings (overlap)
        existing_booking = await db.bookings.find_one({
            "property_id": booking_data.property_id,
            "booking_status": {"$in": [BookingStatus.CONFIRMED.value, BookingStatus.SOFT_LOCK.value]},
            "$or": [
                {
                    "check_in_date": {"$lte": check_in.isoformat()},
                    "check_out_date": {"$gt": check_in.isoformat()}
                },
                {
                    "check_in_date": {"$lt": check_out.isoformat()},
                    "check_out_date": {"$gte": check_out.isoformat()}
                },
                {
                    "check_in_date": {"$gte": check_in.isoformat()},
                    "check_out_date": {"$lte": check_out.isoformat()}
                }
            ]
        })
        
        if existing_booking:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Property is already booked for selected dates"
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
        base_amount = property_dict.get("price_per_night", 0) * num_nights
        service_fee = base_amount * 0.10  # 10% service fee
        taxes = base_amount * 0.18  # 18% GST
        total_amount = base_amount + service_fee + taxes
        
        # Create booking with soft lock
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
            soft_lock_expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        # Insert booking into database
        booking_dict = booking.model_dump()
        booking_dict["check_in_date"] = booking_dict["check_in_date"].isoformat()
        booking_dict["check_out_date"] = booking_dict["check_out_date"].isoformat()
        await db.bookings.insert_one(booking_dict)
        
        # Create Razorpay order
        razorpay_result = razorpay_service.create_order(
            amount=int(total_amount * 100),  # Convert to paise
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
        
        return {
            "booking_id": booking.booking_id,
            "razorpay_order_id": razorpay_result["order"]["id"],
            "razorpay_key_id": razorpay_service.key_id,
            "amount": int(total_amount * 100),
            "currency": "INR",
            "booking_details": {
                "check_in_date": check_in.isoformat(),
                "check_out_date": check_out.isoformat(),
                "total_amount": total_amount,
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
        
        # Verify payment signature
        is_valid = razorpay_service.verify_payment_signature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        )
        
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payment signature"
            )
        
        # Update booking status to confirmed
        await db.bookings.update_one(
            {"booking_id": booking_id},
            {"$set": {
                "booking_status": BookingStatus.CONFIRMED.value,
                "payment_status": "paid",
                "razorpay_payment_id": razorpay_payment_id,
                "confirmed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
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
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            })
        except Exception as block_err:
            logger.warning(f"Failed to create booking blocked-date entry: {block_err}")
        
        logger.info(f"Booking confirmed: {booking_id}")
        
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

@router.get("/guest/my-bookings")
async def get_guest_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings made by the current guest."""
    try:
        cursor = db.bookings.find({"guest_id": current_user["user_id"]}, {"_id": 0})
        bookings = await cursor.to_list(length=100)
        
        return {
            "bookings": bookings,
            "total": len(bookings)
        }
    
    except Exception as e:
        logger.error(f"Error fetching guest bookings: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch bookings"
        )

@router.get("/host/my-bookings")
async def get_host_bookings(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all bookings for properties owned by the current host."""
    try:
        cursor = db.bookings.find({"host_id": current_user["user_id"]}, {"_id": 0})
        bookings = await cursor.to_list(length=100)
        
        return {
            "bookings": bookings,
            "total": len(bookings)
        }
    
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
        
        return booking_dict
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch booking"
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

    await db.bookings.update_one(
        {"booking_id": booking_id},
        {
            "$set": {
                "booking_status": BookingStatus.CONFIRMED.value,
                "payment_status": "paid",
                "razorpay_payment_id": mock["razorpay_payment_id"],
                "confirmed_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
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
                    "updated_at": datetime.utcnow(),
                },
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )
    except Exception as block_err:
        logger.warning(f"Failed to create booking blocked-date entry: {block_err}")

    logger.info(f"[MOCK] Booking confirmed via mock-pay: {booking_id}")
    return {
        "message": "Booking confirmed via mock payment",
        "booking_id": booking_id,
        "razorpay_payment_id": mock["razorpay_payment_id"],
        "razorpay_order_id": order_id,
        "razorpay_signature": mock["razorpay_signature"],
        "mock": True,
    }