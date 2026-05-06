"""Booking-specific notification triggers and the soft-lock reminder scheduler."""
import asyncio
import logging
from datetime import datetime, timedelta

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.notification import NotificationChannel, NotificationType
from services.notification_service import send_multi_channel_notification
from services.email_service import email_service

logger = logging.getLogger(__name__)


# ----------------- Email templates -----------------

def _host_booking_html(payload: dict) -> str:
    return f"""
    <!DOCTYPE html><html><body style="font-family:Manrope,Arial,sans-serif;background:#FDFCF8;">
      <div style="max-width:560px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;">
        <div style="background:#788574;color:#fff;padding:18px;border-radius:10px 10px 0 0;text-align:center;">
          <h2 style="margin:0;">New booking received!</h2>
        </div>
        <div style="padding:18px;">
          <p>Hi {payload.get('host_name', 'there')},</p>
          <p><strong>{payload.get('guest_name', 'A guest')}</strong> just booked your property
            <strong>{payload.get('property_title', '')}</strong>.</p>
          <div style="background:#F5F5F0;padding:12px;border-radius:8px;margin:14px 0;">
            <p style="margin:4px 0;"><strong>Booking ID:</strong> {payload.get('booking_id')}</p>
            <p style="margin:4px 0;"><strong>Check-in:</strong> {payload.get('check_in_date')}</p>
            <p style="margin:4px 0;"><strong>Check-out:</strong> {payload.get('check_out_date')}</p>
            <p style="margin:4px 0;"><strong>Guests:</strong> {payload.get('number_of_guests')}</p>
            <p style="margin:4px 0;"><strong>Payout (estimated):</strong> ₹{payload.get('payout_amount', 0):,.0f}</p>
          </div>
          <p>Get the property ready and welcome them warmly. Payment has been received and held with PropNest.</p>
        </div>
        <div style="text-align:center;color:#8C8C8C;font-size:12px;padding-top:14px;">
          &copy; 2026 PropNest STR
        </div>
      </div>
    </body></html>
    """


def _soft_lock_reminder_html(payload: dict) -> str:
    return f"""
    <!DOCTYPE html><html><body style="font-family:Manrope,Arial,sans-serif;background:#FDFCF8;">
      <div style="max-width:560px;margin:0 auto;background:#fff;padding:24px;border-radius:12px;">
        <div style="background:#C05C4F;color:#fff;padding:18px;border-radius:10px 10px 0 0;text-align:center;">
          <h2 style="margin:0;">Your reservation is about to expire</h2>
        </div>
        <div style="padding:18px;">
          <p>Hi {payload.get('guest_name', 'there')},</p>
          <p>Your hold on <strong>{payload.get('property_title', '')}</strong> expires in
            <strong>2 minutes</strong>. Complete your payment now to lock in these dates.</p>
          <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:12px;margin:14px 0;border-radius:6px;">
            <strong>Booking ID:</strong> {payload.get('booking_id')}<br/>
            {payload.get('check_in_date')} &rarr; {payload.get('check_out_date')} &middot;
            ₹{payload.get('total_amount', 0):,.0f}
          </div>
          <p style="text-align:center;">
            <a href="{payload.get('continue_url', '#')}"
               style="background:#C05C4F;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">
              Complete payment
            </a>
          </p>
        </div>
      </div>
    </body></html>
    """


# Patch email_service with the two new templates (in-place; idempotent).
def _send_host_booking_email(to_email: str, payload: dict):
    html = _host_booking_html(payload)
    return email_service.send_email(
        to_email,
        f"New booking · {payload.get('property_title', 'Your property')}",
        html,
    )


def _send_soft_lock_reminder_email(to_email: str, payload: dict):
    html = _soft_lock_reminder_html(payload)
    return email_service.send_email(
        to_email,
        f"Hold expiring soon · {payload.get('property_title', 'PropNest')}",
        html,
    )


# ----------------- Triggers -----------------

async def notify_host_booking_confirmed(db: AsyncIOMotorDatabase, booking: dict) -> None:
    """Send WhatsApp + Email + In-App to host when a booking is confirmed."""
    try:
        host = await db.users.find_one({"user_id": booking["host_id"]}, {"_id": 0})
        guest = await db.users.find_one({"user_id": booking["guest_id"]}, {"_id": 0})
        prop = await db.properties.find_one({"property_id": booking["property_id"]}, {"_id": 0})
        if not host:
            logger.warning(f"Host not found for booking {booking.get('booking_id')}")
            return

        property_title = (prop or {}).get("title", "your property")
        guest_name = (guest or {}).get("full_name", "A guest")
        host_name = host.get("full_name", "there")
        payout = (booking.get("base_amount", 0) or 0) - (booking.get("service_fee", 0) or 0)

        message = (
            f"PropNest: New booking by {guest_name} for {property_title} "
            f"({booking.get('check_in_date')} → {booking.get('check_out_date')}). "
            f"Booking ID {booking.get('booking_id')}."
        )

        data = {
            "booking_id": booking.get("booking_id"),
            "property_id": booking.get("property_id"),
            "property_title": property_title,
            "guest_name": guest_name,
            "host_name": host_name,
            "check_in_date": booking.get("check_in_date"),
            "check_out_date": booking.get("check_out_date"),
            "number_of_guests": booking.get("number_of_guests"),
            "total_amount": booking.get("total_amount"),
            "payout_amount": payout,
        }

        # In-App + WhatsApp + SMS via the standard path
        await send_multi_channel_notification(
            db=db,
            user_id=host["user_id"],
            notification_type=NotificationType.NEW_BOOKING_RECEIVED,
            title="New booking received",
            message=message,
            channels=[
                NotificationChannel.IN_APP,
                NotificationChannel.WHATSAPP,
                NotificationChannel.SMS,
            ],
            data=data,
        )

        # Email with the dedicated template
        if host.get("email"):
            _send_host_booking_email(host["email"], data)
            logger.info(f"Host booking email sent for {booking.get('booking_id')} to {host['email']}")

        # Also send a confirmation receipt to the guest (in-app + email)
        if guest:
            guest_msg = (
                f"PropNest: Your booking for {property_title} is confirmed! "
                f"{booking.get('check_in_date')} → {booking.get('check_out_date')}."
            )
            await send_multi_channel_notification(
                db=db,
                user_id=guest["user_id"],
                notification_type=NotificationType.BOOKING_CONFIRMED,
                title="Booking confirmed",
                message=guest_msg,
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                data={
                    **data,
                    "property_title": property_title,
                },
            )

    except Exception as e:
        logger.error(f"notify_host_booking_confirmed failed: {e}")


async def _soft_lock_reminder_task(db: AsyncIOMotorDatabase, booking_id: str, delay_seconds: int):
    """Scheduled task: after `delay_seconds`, if booking is still soft_lock, ping the guest."""
    try:
        await asyncio.sleep(delay_seconds)

        booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        if not booking:
            return
        if booking.get("booking_status") != "soft_lock":
            return  # already paid or cancelled
        # Don't ping if the lock already expired
        lock_exp = booking.get("soft_lock_expires_at")
        if lock_exp and lock_exp < datetime.utcnow():
            return

        guest = await db.users.find_one({"user_id": booking["guest_id"]}, {"_id": 0})
        prop = await db.properties.find_one({"property_id": booking["property_id"]}, {"_id": 0})
        if not guest:
            return

        property_title = (prop or {}).get("title", "your selected property")
        message = (
            f"PropNest: Your hold on {property_title} expires in 2 minutes. "
            f"Complete payment now to lock in {booking['check_in_date']} → {booking['check_out_date']}. "
            f"Booking {booking_id}."
        )

        data = {
            "booking_id": booking_id,
            "property_id": booking["property_id"],
            "property_title": property_title,
            "guest_name": guest.get("full_name", "there"),
            "check_in_date": booking["check_in_date"],
            "check_out_date": booking["check_out_date"],
            "total_amount": booking.get("total_amount"),
            "continue_url": f"/guest/booking-confirmation?booking_id={booking_id}",
        }

        await send_multi_channel_notification(
            db=db,
            user_id=guest["user_id"],
            notification_type=NotificationType.BOOKING_PENDING_PAYMENT,
            title="Your reservation is expiring",
            message=message,
            channels=[
                NotificationChannel.IN_APP,
                NotificationChannel.WHATSAPP,
                NotificationChannel.SMS,
            ],
            data=data,
        )

        if guest.get("email"):
            _send_soft_lock_reminder_email(guest["email"], data)

        logger.info(f"Soft-lock reminder sent for booking {booking_id}")

    except asyncio.CancelledError:
        logger.info(f"Soft-lock reminder cancelled for booking {booking_id}")
    except Exception as e:
        logger.error(f"_soft_lock_reminder_task failed for {booking_id}: {e}")


def schedule_soft_lock_reminder(db: AsyncIOMotorDatabase, booking_id: str, expires_at: datetime) -> None:
    """Fire-and-forget: schedule a guest reminder 2 minutes before soft-lock expiry."""
    try:
        delay = (expires_at - datetime.utcnow()).total_seconds() - 120
        if delay <= 0:
            logger.info(f"Soft-lock reminder skipped (expiry too close) for {booking_id}")
            return
        asyncio.create_task(_soft_lock_reminder_task(db, booking_id, int(delay)))
        logger.info(f"Soft-lock reminder scheduled for {booking_id} in {int(delay)}s")
    except Exception as e:
        logger.error(f"Failed to schedule soft-lock reminder: {e}")
