from fastapi import APIRouter, HTTPException, status, Depends, Query
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import List, Optional
from models.calendar import (
    BlockedDate,
    BlockDateRequest,
    ExternalCalendar,
    BlockedDateSource,
    CalendarEvent,
)
from middleware.auth_middleware import get_current_user
from datetime import datetime, date, timedelta
import logging
import requests
from icalendar import Calendar as iCalendar, Event as iCalEvent

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/calendar", tags=["Calendar"])

async def get_db():
    from server import db_instance
    return db_instance



class ExternalCalendarRequest(BaseModel):
    name: str
    ical_url: str
    color: str = "#3B82F6"


def _ranges_overlap(a_start: str, a_end: str, b_start: str, b_end: str) -> bool:
    """Inclusive overlap check on ISO date strings."""
    return a_start <= b_end and b_start <= a_end


# ========== BLOCKED DATES MANAGEMENT ==========

@router.get("/properties/{property_id}/blocked-dates")
async def get_blocked_dates(
    property_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get blocked dates for a property (public availability check)."""
    try:
        query = {"property_id": property_id}

        if start_date and end_date:
            query["start_date"] = {"$lte": end_date}
            query["end_date"] = {"$gte": start_date}

        cursor = db.blocked_dates.find(query, {"_id": 0})
        blocked_dates = await cursor.to_list(length=1000)

        return {"blocked_dates": blocked_dates, "total": len(blocked_dates)}

    except Exception as e:
        logger.error(f"Error fetching blocked dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch blocked dates",
        )


@router.post("/properties/{property_id}/block-dates")
async def block_dates(
    property_id: str,
    block_request: BlockDateRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Block dates for a property (host only)."""
    try:
        property_data = await db.properties.find_one(
            {"property_id": property_id}, {"_id": 0}
        )

        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Property not found"
            )

        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        if block_request.start_date > block_request.end_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Start date must be before or equal to end date",
            )

        if block_request.start_date < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot block dates in the past",
            )

        start_iso = block_request.start_date.isoformat()
        end_iso = block_request.end_date.isoformat()

        # Conflict: check active bookings for the property in the same window
        booking_conflict = await db.bookings.find_one(
            {
                "property_id": property_id,
                "booking_status": {"$in": ["confirmed", "soft_lock"]},
                "check_in_date": {"$lte": end_iso},
                "check_out_date": {"$gte": start_iso},
            }
        )
        if booking_conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An active booking already exists in this date range",
            )

        # Conflict: check existing manual blocks overlapping
        existing_block = await db.blocked_dates.find_one(
            {
                "property_id": property_id,
                "source": BlockedDateSource.MANUAL.value,
                "start_date": {"$lte": end_iso},
                "end_date": {"$gte": start_iso},
            }
        )
        if existing_block:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="These dates overlap with an existing manual block",
            )

        blocked_date = BlockedDate(
            property_id=property_id,
            owner_id=current_user["user_id"],
            start_date=block_request.start_date,
            end_date=block_request.end_date,
            source=BlockedDateSource.MANUAL,
            reason=block_request.reason,
        )

        blocked_dict = blocked_date.model_dump()
        blocked_dict["start_date"] = start_iso
        blocked_dict["end_date"] = end_iso

        await db.blocked_dates.insert_one(blocked_dict)
        blocked_dict.pop("_id", None)

        logger.info(
            f"Dates blocked for property {property_id}: {start_iso} to {end_iso}"
        )

        return {
            "message": "Dates blocked successfully",
            "blocked_date_id": blocked_date.blocked_date_id,
            "blocked_date": blocked_dict,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error blocking dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to block dates",
        )


@router.delete("/blocked-dates/{blocked_date_id}")
async def unblock_dates(
    blocked_date_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Unblock dates (host only). Booking-sourced blocks cannot be removed manually."""
    try:
        blocked = await db.blocked_dates.find_one(
            {"blocked_date_id": blocked_date_id}, {"_id": 0}
        )

        if not blocked:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Blocked date not found"
            )

        if blocked["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        if blocked["source"] == BlockedDateSource.BOOKING.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot unblock dates blocked by confirmed booking",
            )

        await db.blocked_dates.delete_one({"blocked_date_id": blocked_date_id})

        logger.info(f"Dates unblocked: {blocked_date_id}")

        return {"message": "Dates unblocked successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unblocking dates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unblock dates",
        )


# ========== UNIFIED CALENDAR VIEW ==========

@router.get("/properties/{property_id}/unified-view")
async def get_unified_calendar(
    property_id: str,
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None, ge=2000, le=3000),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Get unified calendar (bookings + manual blocks + external) for a host."""
    try:
        property_data = await db.properties.find_one(
            {"property_id": property_id}, {"_id": 0}
        )

        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Property not found"
            )

        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        if not month or not year:
            today = date.today()
            month = today.month
            year = today.year

        start_of_month = date(year, month, 1)
        if month == 12:
            end_of_month = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_of_month = date(year, month + 1, 1) - timedelta(days=1)

        start_iso = start_of_month.isoformat()
        end_iso = end_of_month.isoformat()

        events = []

        # 1. Confirmed bookings
        booking_cursor = db.bookings.find(
            {
                "property_id": property_id,
                "booking_status": "confirmed",
                "check_in_date": {"$lte": end_iso},
                "check_out_date": {"$gte": start_iso},
            },
            {"_id": 0},
        )
        bookings = await booking_cursor.to_list(length=200)

        for booking in bookings:
            events.append(
                {
                    "event_id": booking["booking_id"],
                    "property_id": property_id,
                    "title": f"Booking {booking['booking_id'][:8]}",
                    "start_date": booking["check_in_date"],
                    "end_date": booking["check_out_date"],
                    "source": BlockedDateSource.BOOKING.value,
                    "source_id": booking["booking_id"],
                    "color": "#10B981",
                    "details": {
                        "guest_id": booking.get("guest_id"),
                        "total_amount": booking.get("total_amount"),
                        "booking_status": booking.get("booking_status"),
                    },
                }
            )

        # 2. Manual blocked dates
        blocked_cursor = db.blocked_dates.find(
            {
                "property_id": property_id,
                "source": BlockedDateSource.MANUAL.value,
                "start_date": {"$lte": end_iso},
                "end_date": {"$gte": start_iso},
            },
            {"_id": 0},
        )
        blocked_dates = await blocked_cursor.to_list(length=200)

        for blocked in blocked_dates:
            events.append(
                {
                    "event_id": blocked["blocked_date_id"],
                    "property_id": property_id,
                    "title": "Blocked",
                    "start_date": blocked["start_date"],
                    "end_date": blocked["end_date"],
                    "source": BlockedDateSource.MANUAL.value,
                    "source_id": blocked["blocked_date_id"],
                    "color": "#EF4444",
                    "details": {"reason": blocked.get("reason")},
                }
            )

        # 3. External calendar entries
        external_cursor = db.blocked_dates.find(
            {
                "property_id": property_id,
                "source": BlockedDateSource.EXTERNAL.value,
                "start_date": {"$lte": end_iso},
                "end_date": {"$gte": start_iso},
            },
            {"_id": 0},
        )
        external_dates = await external_cursor.to_list(length=200)

        for external in external_dates:
            events.append(
                {
                    "event_id": external["blocked_date_id"],
                    "property_id": property_id,
                    "title": "External Calendar",
                    "start_date": external["start_date"],
                    "end_date": external["end_date"],
                    "source": BlockedDateSource.EXTERNAL.value,
                    "source_id": external.get("source_id"),
                    "color": "#F59E0B",
                    "details": {},
                }
            )

        return {
            "property_id": property_id,
            "month": month,
            "year": year,
            "range": {"start": start_iso, "end": end_iso},
            "events": events,
            "total": len(events),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching unified calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch unified calendar",
        )


# ========== EXTERNAL CALENDAR (iCAL) MANAGEMENT ==========

@router.get("/properties/{property_id}/external-calendars")
async def list_external_calendars(
    property_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """List external calendars attached to a property."""
    try:
        property_data = await db.properties.find_one(
            {"property_id": property_id}, {"_id": 0}
        )
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Property not found"
            )
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        cursor = db.external_calendars.find(
            {"property_id": property_id, "owner_id": current_user["user_id"]},
            {"_id": 0},
        )
        calendars = await cursor.to_list(length=100)

        return {"calendars": calendars, "total": len(calendars)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing external calendars: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list external calendars",
        )


@router.post("/properties/{property_id}/external-calendars")
async def add_external_calendar(
    property_id: str,
    payload: ExternalCalendarRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Add an external iCal feed for sync."""
    try:
        property_data = await db.properties.find_one(
            {"property_id": property_id}, {"_id": 0}
        )
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Property not found"
            )
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        if not payload.ical_url.startswith(("http://", "https://", "webcal://")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="iCal URL must start with http://, https://, or webcal://",
            )

        external_cal = ExternalCalendar(
            property_id=property_id,
            owner_id=current_user["user_id"],
            name=payload.name,
            ical_url=payload.ical_url,
            color=payload.color,
        )

        cal_dict = external_cal.model_dump()
        await db.external_calendars.insert_one(cal_dict)

        # Trigger one-shot sync (best-effort, errors captured in record)
        try:
            await sync_external_calendar(external_cal.calendar_id, db)
        except Exception as sync_err:
            logger.warning(f"Initial sync failed for {external_cal.calendar_id}: {sync_err}")

        logger.info(f"External calendar added for property {property_id}: {payload.name}")

        # Return latest record (after sync update)
        latest = await db.external_calendars.find_one(
            {"calendar_id": external_cal.calendar_id}, {"_id": 0}
        )
        return {"message": "External calendar added", "calendar": latest}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding external calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add external calendar",
        )


@router.post("/external-calendars/{calendar_id}/sync")
async def trigger_external_sync(
    calendar_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Manually trigger sync for an external calendar."""
    try:
        cal = await db.external_calendars.find_one({"calendar_id": calendar_id}, {"_id": 0})
        if not cal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="External calendar not found"
            )
        if cal["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        await sync_external_calendar(calendar_id, db)
        latest = await db.external_calendars.find_one(
            {"calendar_id": calendar_id}, {"_id": 0}
        )
        return {"message": "Sync completed", "calendar": latest}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error triggering sync: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to sync external calendar",
        )


@router.delete("/external-calendars/{calendar_id}")
async def remove_external_calendar(
    calendar_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Remove an external calendar and its synced blocks."""
    try:
        cal = await db.external_calendars.find_one({"calendar_id": calendar_id}, {"_id": 0})
        if not cal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="External calendar not found"
            )
        if cal["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        await db.blocked_dates.delete_many(
            {
                "property_id": cal["property_id"],
                "source": BlockedDateSource.EXTERNAL.value,
                "source_id": calendar_id,
            }
        )
        await db.external_calendars.delete_one({"calendar_id": calendar_id})

        return {"message": "External calendar removed"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing external calendar: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove external calendar",
        )


@router.get("/properties/{property_id}/ical-export")
async def export_ical(
    property_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Export property calendar as a downloadable .ics file."""
    try:
        property_data = await db.properties.find_one(
            {"property_id": property_id}, {"_id": 0}
        )
        if not property_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Property not found"
            )
        if property_data["owner_id"] != current_user["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized"
            )

        cal = iCalendar()
        cal.add("prodid", "-//PropNest STR//Property Calendar//EN")
        cal.add("version", "2.0")
        cal.add("calscale", "GREGORIAN")
        cal.add("method", "PUBLISH")
        cal.add("x-wr-calname", f"PropNest - {property_data.get('title', property_id)}")
        cal.add("x-wr-timezone", "Asia/Kolkata")

        booking_cursor = db.bookings.find(
            {"property_id": property_id, "booking_status": "confirmed"}, {"_id": 0}
        )
        bookings = await booking_cursor.to_list(length=500)

        for booking in bookings:
            event = iCalEvent()
            event.add("uid", f"{booking['booking_id']}@propnest.com")
            event.add("summary", f"Booked - {booking['booking_id'][:8]}")
            ci = booking["check_in_date"]
            co = booking["check_out_date"]
            event.add("dtstart", date.fromisoformat(ci) if isinstance(ci, str) else ci)
            event.add("dtend", date.fromisoformat(co) if isinstance(co, str) else co)
            event.add("dtstamp", datetime.utcnow())
            event.add("status", "CONFIRMED")
            cal.add_component(event)

        blocked_cursor = db.blocked_dates.find(
            {
                "property_id": property_id,
                "source": BlockedDateSource.MANUAL.value,
            },
            {"_id": 0},
        )
        blocked_dates = await blocked_cursor.to_list(length=500)

        for blocked in blocked_dates:
            event = iCalEvent()
            event.add("uid", f"{blocked['blocked_date_id']}@propnest.com")
            event.add("summary", "Blocked")
            sd = blocked["start_date"]
            ed = blocked["end_date"]
            event.add("dtstart", date.fromisoformat(sd) if isinstance(sd, str) else sd)
            event.add("dtend", date.fromisoformat(ed) if isinstance(ed, str) else ed)
            event.add("dtstamp", datetime.utcnow())
            event.add("status", "CONFIRMED")
            if blocked.get("reason"):
                event.add("description", blocked["reason"])
            cal.add_component(event)

        ical_data = cal.to_ical()
        return Response(
            content=ical_data,
            media_type="text/calendar",
            headers={
                "Content-Disposition": f"attachment; filename={property_id}_calendar.ics"
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting iCal: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export calendar",
        )


async def sync_external_calendar(calendar_id: str, db: AsyncIOMotorDatabase):
    """Pull external iCal feed and persist as EXTERNAL blocked dates."""
    try:
        calendar = await db.external_calendars.find_one(
            {"calendar_id": calendar_id}, {"_id": 0}
        )
        if not calendar:
            return

        ical_url = calendar["ical_url"]
        if ical_url.startswith("webcal://"):
            ical_url = "https://" + ical_url[len("webcal://"):]

        response = requests.get(ical_url, timeout=15)
        if response.status_code != 200:
            await db.external_calendars.update_one(
                {"calendar_id": calendar_id},
                {
                    "$set": {
                        "sync_status": "failed",
                        "sync_error": f"HTTP {response.status_code}",
                        "updated_at": datetime.utcnow(),
                    }
                },
            )
            return

        cal = iCalendar.from_ical(response.content)

        await db.blocked_dates.delete_many(
            {
                "property_id": calendar["property_id"],
                "source": BlockedDateSource.EXTERNAL.value,
                "source_id": calendar_id,
            }
        )

        blocked_dates = []
        for component in cal.walk():
            if component.name != "VEVENT":
                continue
            dtstart_field = component.get("dtstart")
            dtend_field = component.get("dtend")
            if not dtstart_field or not dtend_field:
                continue
            dtstart = dtstart_field.dt
            dtend = dtend_field.dt
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
                source_id=calendar_id,
            )
            blocked_dict = blocked_date.model_dump()
            blocked_dict["start_date"] = dtstart.isoformat()
            blocked_dict["end_date"] = dtend.isoformat()
            blocked_dates.append(blocked_dict)

        if blocked_dates:
            await db.blocked_dates.insert_many(blocked_dates)

        await db.external_calendars.update_one(
            {"calendar_id": calendar_id},
            {
                "$set": {
                    "sync_status": "success",
                    "sync_error": None,
                    "last_synced_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        logger.info(f"External calendar synced: {calendar_id}, {len(blocked_dates)} events")

    except Exception as e:
        logger.error(f"Error syncing external calendar {calendar_id}: {str(e)}")
        await db.external_calendars.update_one(
            {"calendar_id": calendar_id},
            {
                "$set": {
                    "sync_status": "failed",
                    "sync_error": str(e),
                    "updated_at": datetime.utcnow(),
                }
            },
        )
