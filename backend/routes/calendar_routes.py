from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.calendar import BlockedDate, BlockDateRequest, ExternalCalendar, BlockedDateSource, CalendarEvent
from middleware.auth_middleware import get_current_user
from datetime import datetime, date, timedelta
import logging
import requests
from icalendar import Calendar as iCalendar, Event as iCalEvent
import uuid

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["Calendar"])

async def get_db():
    from server import db_instance
    return db_instance

# ========== BLOCKED DATES MANAGEMENT ==========

@router.get("/properties/{property_id}/blocked-dates")
async def get_blocked_dates(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get blocked dates for a property (public endpoint for availability check)."""
    try:
        query = {"property_id": property_id}
        
        if start_date and end_date:
            query["$or"] = [
                {
                    "start_date": {"$lte": end_date},
                    "end_date": {"$gte": start_date}
                }
            ]
        
        cursor = db.blocked_dates.find(query, {"_id": 0})
        blocked_dates = await cursor.to_list(length=1000)
        
        # Convert dates to ISO strings
        for blocked in blocked_dates:
            if isinstance(blocked["start_date"], date):
                blocked["start_date"] = blocked["start_date"].isoformat()
            if isinstance(blocked["end_date"], date):
                blocked["end_date"] = blocked["end_date"].isoformat()
        
        return {
            "blocked_dates": blocked_dates,
            "total": len(blocked_dates)
        }
    
    except Exception as e:
        logger.error(f"Error fetching blocked dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch blocked dates"
        )

@router.post("/properties/{property_id}/block-dates")
async def block_dates(
    property_id: str,
    block_request: BlockDateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Block dates for a property (host only)."""
    try:
        # Check property ownership
        property_data = await db.properties.find_one({"property_id": property_id})
        
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Validate dates
        if block_request.start_date > block_request.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before end date"
            )
        
        # Create blocked date entry
        blocked_date = BlockedDate(
            property_id=property_id,
            owner_id=current_user["user_id"],
            start_date=block_request.start_date,
            end_date=block_request.end_date,
            source=BlockedDateSource.MANUAL,
            reason=block_request.reason
        )
        
        blocked_dict = blocked_date.model_dump()
        blocked_dict["start_date"] = blocked_dict["start_date"].isoformat()
        blocked_dict["end_date"] = blocked_dict["end_date"].isoformat()
        
        await db.blocked_dates.insert_one(blocked_dict)
        
        logger.info(f"Dates blocked for property {property_id}: {block_request.start_date} to {block_request.end_date}")
        
        return {
            "message": "Dates blocked successfully",
            "blocked_date_id": blocked_date.blocked_date_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error blocking dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block dates"
        )

@router.delete("/blocked-dates/{blocked_date_id}")
async def unblock_dates(
    blocked_date_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Unblock dates (host only)."""
    try:
        # Check ownership
        blocked = await db.blocked_dates.find_one({"blocked_date_id": blocked_date_id})
        
        if not blocked:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Blocked date not found"
            )
        
        if blocked["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Don't allow deleting booking-blocked dates
        if blocked["source"] == BlockedDateSource.BOOKING.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot unblock dates blocked by confirmed booking"
            )
        
        # Delete blocked date
        await db.blocked_dates.delete_one({"blocked_date_id": blocked_date_id})
        
        logger.info(f"Dates unblocked: {blocked_date_id}")
        
        return {"message": "Dates unblocked successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unblocking dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock dates"
        )

# ========== UNIFIED CALENDAR VIEW ==========

@router.get("/properties/{property_id}/unified-view")
async def get_unified_calendar(
    property_id: str,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get unified calendar view with bookings, blocked dates, and external calendars."""
    try:
        # Check property ownership
        property_data = await db.properties.find_one({"property_id": property_id})
        
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Default to current month if not specified
        if not month or not year:
            today = date.today()
            month = today.month
            year = today.year
        
        # Calculate date range (entire month + buffer)
        start_of_month = date(year, month, 1)
        if month == 12:
            end_of_month = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_of_month = date(year, month + 1, 1) - timedelta(days=1)
        
        events = []
        
        # 1. Get confirmed bookings
        booking_cursor = db.bookings.find({
            "property_id": property_id,
            "booking_status": "confirmed",
            "check_in_date": {"$lte": end_of_month.isoformat()},
            "check_out_date": {"$gte": start_of_month.isoformat()}
        }, {"_id": 0})
        bookings = await booking_cursor.to_list(length=100)
        
        for booking in bookings:
            events.append(CalendarEvent(
                event_id=booking["booking_id"],
                property_id=property_id,
                title=f"Booking: {booking['booking_id'][:8]}",
                start_date=date.fromisoformat(booking["check_in_date"]) if isinstance(booking["check_in_date"], str) else booking["check_in_date"],
                end_date=date.fromisoformat(booking["check_out_date"]) if isinstance(booking["check_out_date"], str) else booking["check_out_date"],
                source=BlockedDateSource.BOOKING,
                source_id=booking["booking_id"],
                color="#10B981",  # Green
                details={"guest_id": booking["guest_id"], "total_amount": booking["total_amount"]}
            ).model_dump())
        
        # 2. Get manually blocked dates
        blocked_cursor = db.blocked_dates.find({
            "property_id": property_id,
            "source": BlockedDateSource.MANUAL.value,
            "start_date": {"$lte": end_of_month.isoformat()},
            "end_date": {"$gte": start_of_month.isoformat()}
        }, {"_id": 0})
        blocked_dates = await blocked_cursor.to_list(length=100)
        
        for blocked in blocked_dates:
            events.append(CalendarEvent(
                event_id=blocked["blocked_date_id"],
                property_id=property_id,
                title="Blocked",
                start_date=date.fromisoformat(blocked["start_date"]) if isinstance(blocked["start_date"], str) else blocked["start_date"],
                end_date=date.fromisoformat(blocked["end_date"]) if isinstance(blocked["end_date"], str) else blocked["end_date"],
                source=BlockedDateSource.MANUAL,
                source_id=blocked["blocked_date_id"],
                color="#EF4444",  # Red
                details={"reason": blocked.get("reason")}
            ).model_dump())
        
        # 3. Get external calendar events
        external_cursor = db.blocked_dates.find({
            "property_id": property_id,
            "source": BlockedDateSource.EXTERNAL.value,
            "start_date": {"$lte": end_of_month.isoformat()},
            "end_date": {"$gte": start_of_month.isoformat()}
        }, {"_id": 0})
        external_dates = await external_cursor.to_list(length=100)
        
        for external in external_dates:
            events.append(CalendarEvent(
                event_id=external["blocked_date_id"],
                property_id=property_id,
                title="External Calendar",
                start_date=date.fromisoformat(external["start_date"]) if isinstance(external["start_date"], str) else external["start_date"],
                end_date=date.fromisoformat(external["end_date"]) if isinstance(external["end_date"], str) else external["end_date"],
                source=BlockedDateSource.EXTERNAL,
                source_id=external.get("source_id"),
                color="#F59E0B",  # Orange
                details={}
            ).model_dump())
        
        # Convert dates to ISO strings
        for event in events:
            if isinstance(event["start_date"], date):
                event["start_date"] = event["start_date"].isoformat()
            if isinstance(event["end_date"], date):
                event["end_date"] = event["end_date"].isoformat()
        
        return {
            "property_id": property_id,
            "month": month,
            "year": year,
            "events": events,
            "total": len(events)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching unified calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch unified calendar"
        )

# ========== iCAL SYNC ==========

@router.post("/properties/{property_id}/external-calendars")
async def add_external_calendar(
    property_id: str,
    name: str,
    ical_url: str,
    color: str = "#3B82F6",
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add external calendar (iCal) for sync."""
    try:
        # Check property ownership
        property_data = await db.properties.find_one({"property_id": property_id})
        
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Create external calendar entry
        external_cal = ExternalCalendar(
            property_id=property_id,
            owner_id=current_user["user_id"],
            name=name,
            ical_url=ical_url,
            color=color
        )
        
        await db.external_calendars.insert_one(external_cal.model_dump())
        
        # Trigger initial sync
        # In production, this would be a background job
        # For now, we'll sync immediately
        await sync_external_calendar(external_cal.calendar_id, db)
        
        logger.info(f"External calendar added for property {property_id}: {name}")
        
        return {
            "message": "External calendar added successfully",
            "calendar_id": external_cal.calendar_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding external calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add external calendar"
        )

@router.get("/properties/{property_id}/ical-export")
async def export_ical(
    property_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Export property calendar as iCal file."""
    try:
        # Check property ownership
        property_data = await db.properties.find_one({"property_id": property_id})
        
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found"
            )
        
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized"
            )
        
        # Create iCal calendar
        cal = iCalendar()
        cal.add('prodid', '-//PropNest STR//Property Calendar//EN')
        cal.add('version', '2.0')
        cal.add('calscale', 'GREGORIAN')
        cal.add('method', 'PUBLISH')
        cal.add('x-wr-calname', f"PropNest - {property_data['title']}")
        cal.add('x-wr-timezone', 'Asia/Kolkata')
        
        # Get all bookings
        booking_cursor = db.bookings.find({
            "property_id": property_id,
            "booking_status": "confirmed"
        }, {"_id": 0})
        bookings = await booking_cursor.to_list(length=500)
        
        for booking in bookings:
            event = iCalEvent()
            event.add('uid', f"{booking['booking_id']}@propnest.com")
            event.add('summary', f"Booked - {booking['booking_id'][:8]}")
            event.add('dtstart', date.fromisoformat(booking['check_in_date']) if isinstance(booking['check_in_date'], str) else booking['check_in_date'])
            event.add('dtend', date.fromisoformat(booking['check_out_date']) if isinstance(booking['check_out_date'], str) else booking['check_out_date'])
            event.add('dtstamp', datetime.utcnow())
            event.add('status', 'CONFIRMED')
            cal.add_component(event)
        
        # Get blocked dates
        blocked_cursor = db.blocked_dates.find({
            "property_id": property_id,
            "source": BlockedDateSource.MANUAL.value
        }, {"_id": 0})
        blocked_dates = await blocked_cursor.to_list(length=500)
        
        for blocked in blocked_dates:
            event = iCalEvent()
            event.add('uid', f"{blocked['blocked_date_id']}@propnest.com")
            event.add('summary', 'Blocked')
            event.add('dtstart', date.fromisoformat(blocked['start_date']) if isinstance(blocked['start_date'], str) else blocked['start_date'])
            event.add('dtend', date.fromisoformat(blocked['end_date']) if isinstance(blocked['end_date'], str) else blocked['end_date'])
            event.add('dtstamp', datetime.utcnow())
            event.add('status', 'CONFIRMED')
            if blocked.get('reason'):
                event.add('description', blocked['reason'])
            cal.add_component(event)
        
        # Return as .ics file
        ical_data = cal.to_ical()
        
        return Response(
            content=ical_data,
            media_type="text/calendar",
            headers={
                "Content-Disposition": f"attachment; filename={property_id}_calendar.ics"
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting iCal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export calendar"
        )

async def sync_external_calendar(calendar_id: str, db: AsyncIOMotorDatabase):
    """Sync external calendar (background job)."""
    try:
        calendar = await db.external_calendars.find_one({"calendar_id": calendar_id})
        
        if not calendar:
            return
        
        # Fetch iCal data
        response = requests.get(calendar["ical_url"], timeout=10)
        
        if response.status_code != 200:
            await db.external_calendars.update_one(
                {"calendar_id": calendar_id},
                {"$set": {
                    "sync_status": "failed",
                    "sync_error": f"HTTP {response.status_code}",
                    "updated_at": datetime.utcnow()
                }}
            )
            return
        
        # Parse iCal
        cal = iCalendar.from_ical(response.content)
        
        # Remove old external blocked dates for this calendar
        await db.blocked_dates.delete_many({
            "property_id": calendar["property_id"],
            "source": BlockedDateSource.EXTERNAL.value,
            "source_id": calendar_id
        })
        
        # Add new blocked dates
        blocked_dates = []
        
        for component in cal.walk():
            if component.name == "VEVENT":
                dtstart = component.get('dtstart').dt
                dtend = component.get('dtend').dt
                
                # Convert datetime to date if needed
                if isinstance(dtstart, datetime):
                    dtstart = dtstart.date()
                if isinstance(dtend, datetime):
                    dtend = dtend.date()
                
                blocked_date = BlockedDate(
                    property_id=calendar["property_id"],
                    owner_id=calendar["owner_id"],
                    start_date=dtstart,
                    end_date=dtend,
                    source=BlockedDateSource.EXTERNAL,
                    source_id=calendar_id
                )
                
                blocked_dict = blocked_date.model_dump()
                blocked_dict["start_date"] = blocked_dict["start_date"].isoformat()
                blocked_dict["end_date"] = blocked_dict["end_date"].isoformat()
                
                blocked_dates.append(blocked_dict)
        
        if blocked_dates:
            await db.blocked_dates.insert_many(blocked_dates)
        
        # Update sync status
        await db.external_calendars.update_one(
            {"calendar_id": calendar_id},
            {"$set": {
                "sync_status": "success",
                "last_synced_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"External calendar synced: {calendar_id}, {len(blocked_dates)} events")
    
    except Exception as e:
        logger.error(f"Error syncing external calendar: {str(e)}")
        await db.external_calendars.update_one(
            {"calendar_id": calendar_id},
            {"$set": {
                "sync_status": "failed",
                "sync_error": str(e),
                "updated_at": datetime.utcnow()
            }}
        )