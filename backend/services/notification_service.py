from models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus
from services.msg91_service import msg91_service
from services.email_service import email_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import logging
import os

logger = logging.getLogger(__name__)


WHATSAPP_TEMPLATE_ENV_KEYS = (
    "MSG91_WHATSAPP_TEMPLATE_HOST_REGISTRATION",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_REGISTRATION",
    "MSG91_WHATSAPP_TEMPLATE_PROPERTY_APPROVED",
    "MSG91_WHATSAPP_TEMPLATE_BOOKING_CONFIRMED_GUEST",
    "MSG91_WHATSAPP_TEMPLATE_NEW_BOOKING_HOST",
    "MSG91_WHATSAPP_TEMPLATE_HOST_SUBSCRIPTION_SUCCESS",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_CANCELLED",
    "MSG91_WHATSAPP_TEMPLATE_HOST_BOOKING_CANCELLED",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_INVOICE",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_REFUND_PROCESSED",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_CHECKIN_REMINDER",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_CHECKOUT_REMINDER",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_STAY_COMPLETED",
    "MSG91_WHATSAPP_TEMPLATE_GUEST_PAYMENT_FAILED",
)


def log_whatsapp_configuration() -> dict:
    missing = []
    if not os.getenv("MSG91_AUTHKEY", "").strip():
        missing.append("MSG91_AUTHKEY")
    if not os.getenv("MSG91_WHATSAPP_INTEGRATED_NUMBER", "").strip():
        missing.append("MSG91_WHATSAPP_INTEGRATED_NUMBER")
    missing.extend(key for key in WHATSAPP_TEMPLATE_ENV_KEYS if not os.getenv(key, "").strip())
    demo_mode = os.getenv("MSG91_DEMO_MODE", "").strip().lower() in {"1", "true", "yes", "on"}
    report = {"configured": not missing and not demo_mode, "demo_mode": demo_mode, "missing": missing}
    if report["configured"]:
        logger.info("MSG91 WhatsApp production configuration is complete (%s templates)", len(WHATSAPP_TEMPLATE_ENV_KEYS))
    else:
        logger.error("MSG91 WhatsApp production configuration is incomplete: demo_mode=%s missing=%s", demo_mode, missing)
    return report


def _public_media_url(value: str | None) -> str | None:
    if not value:
        return None
    value = str(value).strip()
    if value.startswith(("https://", "http://")):
        return value
    backend_url = os.getenv("PUBLIC_BACKEND_URL", "https://x-space360.in").rstrip("/")
    return f"{backend_url}/{value.lstrip('/')}"

class NotificationService:
    """Unified notification service for all channels."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        """Initialize notification service."""
        self.db = db
    
    async def send_notification(
        self,
        user_id: str,
        notification_type: NotificationType,
        channels: list[NotificationChannel],
        title: str,
        message: str,
        data: dict = None
    ) -> dict:
        """Send notification via multiple channels.
        
        Args:
            user_id: User ID to send notification to
            notification_type: Type of notification
            channels: List of channels (SMS, WhatsApp, Email, In-App)
            title: Notification title
            message: Notification message
            data: Additional data dictionary
        """
        try:
            # Get user details
            user = await self.db.users.find_one({"user_id": user_id}, {"_id": 0})
            if not user:
                logger.error(f"User not found: {user_id}")
                return {"success": False, "error": "User not found"}
            
            results = {}
            
            # Send via each channel
            for channel in channels:
                try:
                    if channel == NotificationChannel.SMS:
                        result = await self._send_sms(user, title, message, notification_type, data)
                        results["sms"] = result
                    
                    elif channel == NotificationChannel.WHATSAPP:
                        result = await self._send_whatsapp(user, title, message, notification_type, data)
                        results["whatsapp"] = result
                    
                    elif channel == NotificationChannel.EMAIL:
                        result = await self._send_email(user, title, message, notification_type, data)
                        results["email"] = result
                    
                    elif channel == NotificationChannel.IN_APP:
                        result = await self._send_in_app(user, title, message, notification_type, data)
                        results["in_app"] = result
                
                except Exception as e:
                    logger.error(f"Error sending {channel} notification: {str(e)}")
                    results[channel.value] = {"success": False, "error": str(e)}
            
            return {
                "success": True,
                "results": results
            }
        
        except Exception as e:
            logger.error(f"Error in send_notification: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _send_sms(self, user: dict, title: str, message: str, notification_type: NotificationType, data: dict) -> dict:
        """Send SMS notification."""
        phone = user.get("phone")
        if not phone:
            logger.warning(
                "WhatsApp skipped: user_id=%s type=%s has no phone number",
                user.get("user_id"),
                notification_type.value,
            )
            return {"success": False, "error": "No phone number"}
        
        # Send SMS via MSG91
        result = msg91_service.send_sms(phone, message)
        
        # Store notification
        notification = Notification(
            user_id=user["user_id"],
            type=notification_type,
            channel=NotificationChannel.SMS,
            title=title,
            message=message,
            recipient=phone,
            data=data or {},
            status=NotificationStatus.SENT if result["success"] else NotificationStatus.FAILED,
            provider_message_id=result.get("message_id"),
            provider_response=result,
            sent_at=datetime.now(timezone.utc) if result["success"] else None
        )
        
        await self.db.notifications.insert_one(notification.model_dump())
        
        return result
    
    async def _send_whatsapp(self, user: dict, title: str, message: str, notification_type: NotificationType, data: dict) -> dict:
        """Send WhatsApp notification."""
        phone = user.get("phone")
        if not phone:
            return {"success": False, "error": "No phone number"}

        data = data or {}
        template_name = None
        template_parameters = None
        button_url_parameters = None
        header_media_url = None
        header_media_type = "image"
        header_filename = None

        if notification_type == NotificationType.HOST_REGISTRATION_SUCCESS:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_HOST_REGISTRATION", "").strip()
            template_parameters = [
                data.get("host_name") or data.get("name") or user.get("full_name") or "Host",
            ]
        elif notification_type == NotificationType.GUEST_REGISTRATION_SUCCESS:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_REGISTRATION", "").strip()
            template_parameters = [
                data.get("guest_name") or data.get("customer_name") or data.get("name") or user.get("full_name") or "Guest",
            ]
        elif notification_type == NotificationType.PROPERTY_LISTED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_PROPERTY_LISTED", "").strip()
            template_parameters = [
                data.get("host_name") or user.get("full_name") or "Host",
                data.get("property_title") or data.get("property_name") or data.get("title") or "Your property",
                data.get("property_id") or "",
                data.get("location") or data.get("property_address") or "",
                data.get("status") or "Listed",
            ]
        elif notification_type == NotificationType.PROPERTY_APPROVED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_PROPERTY_APPROVED", "").strip()
            template_parameters = [
                data.get("host_name") or user.get("full_name") or "Host",
                data.get("property_title") or data.get("property_name") or data.get("title") or "Your property",
            ]
            header_media_url = _public_media_url(data.get("property_image"))
        elif notification_type == NotificationType.BOOKING_CONFIRMED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_BOOKING_CONFIRMED_GUEST", "").strip()
            template_parameters = [
                data.get("guest_name") or data.get("customer_name") or user.get("full_name") or "Guest",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("check_in_date") or "",
                data.get("check_out_date") or "",
                data.get("guest_count") or data.get("guests") or data.get("number_of_guests") or "",
                data.get("total_amount") or data.get("amount") or "",
                data.get("host_name") or "Host",
                data.get("host_mobile") or "",
                data.get("property_address") or data.get("location") or "",
            ]
            header_media_url = _public_media_url(data.get("property_image"))
        elif notification_type == NotificationType.NEW_BOOKING_RECEIVED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_NEW_BOOKING_HOST", "").strip()
            template_parameters = [
                data.get("host_name") or user.get("full_name") or "Host",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("guest_name") or data.get("customer_name") or "Guest",
                data.get("check_in_date") or "",
                data.get("check_out_date") or "",
                data.get("guest_count") or data.get("guests") or data.get("number_of_guests") or "",
                data.get("total_amount") or data.get("amount") or "",
            ]
        elif notification_type == NotificationType.SUBSCRIPTION_SUCCESS:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_HOST_SUBSCRIPTION_SUCCESS", "").strip()
            template_parameters = [
                data.get("host_name") or user.get("full_name") or "Host",
                data.get("plan_name") or data.get("plan_type") or "Subscription plan",
                data.get("start_date") or "",
                data.get("end_date") or "",
                data.get("amount") or "",
                data.get("transaction_id") or data.get("payment_id") or "",
            ]
        elif notification_type == NotificationType.GUEST_BOOKING_CANCELLED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_CANCELLED", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("check_in_date") or "",
                data.get("check_out_date") or "",
                data.get("reason") or "Booking cancelled",
            ]
        elif notification_type == NotificationType.HOST_BOOKING_CANCELLED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_HOST_BOOKING_CANCELLED", "").strip()
            template_parameters = [
                data.get("host_name") or user.get("full_name") or "Host",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("guest_name") or "Guest",
                data.get("check_in_date") or "",
                data.get("check_out_date") or "",
                data.get("reason") or "Booking cancelled",
            ]
        elif notification_type == NotificationType.BOOKING_INVOICE:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_BOOKING_INVOICE", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("booking_id") or "",
                data.get("invoice_number") or data.get("invoice_no") or "",
                data.get("invoice_date") or "",
                data.get("property_title") or "Your property",
                data.get("taxable_amount") or "",
                data.get("gstin") or "N/A",
                data.get("gst_amount") or "",
                data.get("total_invoice_amount") or data.get("total_amount") or "",
            ]
            header_media_url = _public_media_url(data.get("invoice_document_url"))
            header_media_type = "document"
            header_filename = data.get("invoice_filename") or "X-Space360-Invoice.pdf"
        elif notification_type == NotificationType.REFUND_RECEIVED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_REFUND_PROCESSED", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("booking_id") or "",
                data.get("property_title") or data.get("property_name") or "Your property",
                data.get("refund_amount") or "",
                data.get("refund_date") or "",
                data.get("payment_method") or "Original payment method",
                data.get("refund_reference_number") or data.get("refund_id") or "",
            ]
        elif notification_type == NotificationType.BOOKING_REMINDER:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_CHECKIN_REMINDER", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("check_in_date_time") or data.get("check_in_date") or "",
                data.get("check_out_date_time") or data.get("check_out_date") or "",
                data.get("map_url") or data.get("property_location") or data.get("property_address") or "",
            ]
        elif notification_type == NotificationType.GUEST_CHECKOUT_REMINDER:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_CHECKOUT_REMINDER", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("property_title") or "Your property",
                data.get("check_out_date_time") or data.get("check_out_date") or "",
                data.get("booking_id") or "",
            ]
        elif notification_type == NotificationType.GUEST_STAY_COMPLETED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_STAY_COMPLETED", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("check_out_date_time") or data.get("check_out_date") or "",
            ]
        elif notification_type == NotificationType.GUEST_PAYMENT_FAILED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_GUEST_PAYMENT_FAILED", "").strip()
            template_parameters = [
                data.get("guest_name") or user.get("full_name") or "Guest",
                data.get("property_title") or "Your property",
                data.get("booking_id") or "",
                data.get("amount") or data.get("total_amount") or "",
            ]
        elif notification_type == NotificationType.PROPERTY_REJECTED:
            template_name = os.getenv("MSG91_WHATSAPP_TEMPLATE_PROPERTY_REJECTED", "").strip()
            template_parameters = [
                data.get("host_name") or user.get("full_name") or "Host",
                data.get("property_title") or data.get("property_name") or data.get("title") or "Your property",
                data.get("property_id") or "",
                data.get("reason") or data.get("remarks") or "Please check remarks",
            ]
        
        # Use approved WhatsApp templates when configured; otherwise keep the
        # older generic path useful for demo/local testing.
        configured_template_types = {
            NotificationType.HOST_REGISTRATION_SUCCESS,
            NotificationType.GUEST_REGISTRATION_SUCCESS,
            NotificationType.PROPERTY_LISTED,
            NotificationType.PROPERTY_APPROVED,
            NotificationType.BOOKING_CONFIRMED,
            NotificationType.NEW_BOOKING_RECEIVED,
            NotificationType.SUBSCRIPTION_SUCCESS,
            NotificationType.GUEST_BOOKING_CANCELLED,
            NotificationType.HOST_BOOKING_CANCELLED,
            NotificationType.BOOKING_INVOICE,
            NotificationType.REFUND_RECEIVED,
            NotificationType.BOOKING_REMINDER,
            NotificationType.GUEST_CHECKOUT_REMINDER,
            NotificationType.GUEST_STAY_COMPLETED,
            NotificationType.GUEST_PAYMENT_FAILED,
            NotificationType.PROPERTY_REJECTED,
        }
        if notification_type == NotificationType.BOOKING_INVOICE and not header_media_url:
            result = {
                "success": False,
                "error": "Booking invoice WhatsApp template requires a public PDF document URL",
            }
        elif template_name and template_parameters is not None:
            result = msg91_service.send_whatsapp_template(
                phone,
                template_name,
                template_parameters,
                button_url_parameters=button_url_parameters,
                header_media_url=header_media_url,
                header_media_type=header_media_type,
                header_filename=header_filename,
            )
        elif notification_type in configured_template_types:
            result = {
                "success": False,
                "error": f"WhatsApp template is not configured for {notification_type.value}",
            }
        else:
            result = msg91_service.send_whatsapp(phone, message)

        logger.info(
            "WhatsApp result: user_id=%s type=%s template=%s result=%s",
            user.get("user_id"),
            notification_type.value,
            template_name,
            result,
        )
        
        # Store notification
        notification = Notification(
            user_id=user["user_id"],
            type=notification_type,
            channel=NotificationChannel.WHATSAPP,
            title=title,
            message=message,
            recipient=phone,
            data=data or {},
            status=NotificationStatus.SENT if result["success"] else NotificationStatus.FAILED,
            provider_message_id=result.get("message_id"),
            provider_response=result,
            sent_at=datetime.now(timezone.utc) if result["success"] else None
        )
        
        await self.db.notifications.insert_one(notification.model_dump())
        
        return result
    
    async def _send_email(self, user: dict, title: str, message: str, notification_type: NotificationType, data: dict) -> dict:
        """Send email notification."""
        email = user.get("email")
        if not email:
            return {"success": False, "error": "No email address"}
        
        data = dict(data or {})
        if notification_type == NotificationType.PROPERTY_REJECTED:
            property_title = (
                data.get("property_title")
                or data.get("property_name")
                or data.get("title")
            )
            property_id = data.get("property_id")
            if not property_title and property_id:
                property_record = await self.db.properties.find_one(
                    {"property_id": property_id},
                    {"_id": 0, "title": 1, "property_name": 1},
                )
                property_record = property_record or {}
                property_title = (
                    property_record.get("title")
                    or property_record.get("property_name")
                )
            data["property_title"] = property_title or "Your property"

        email_data = {
            **data,
            "name": user.get("full_name") or user.get("email") or "there",
            "message": message,
        }

        # Use appropriate email template based on type
        if notification_type == NotificationType.BOOKING_CONFIRMED:
            result = email_service.send_template(email, "booking_confirmation", email_data)
        elif notification_type == NotificationType.BOOKING_REMINDER:
            result = email_service.send_template(email, "booking_reminder", email_data)
        elif notification_type == NotificationType.PAYMENT_CONFIRMED:
            result = email_service.send_template(email, "payment_confirmation", email_data)
        elif notification_type == NotificationType.NEW_BOOKING_RECEIVED:
            result = email_service.send_template(email, "new_booking", email_data)
        elif notification_type in {
            NotificationType.BOOKING_CANCELLED,
            NotificationType.GUEST_BOOKING_CANCELLED,
            NotificationType.HOST_BOOKING_CANCELLED,
        }:
            result = email_service.send_template(email, "booking_cancellation", email_data)
        elif notification_type in {NotificationType.REVIEW_REQUEST, NotificationType.GUEST_STAY_COMPLETED}:
            result = email_service.send_template(email, "review_reminder", email_data)
        elif notification_type == NotificationType.REFUND_RECEIVED:
            result = email_service.send_template(email, "refund", email_data)
        elif notification_type == NotificationType.PROPERTY_APPROVED:
            result = email_service.send_template(email, "property_approved", email_data)
        elif notification_type == NotificationType.PROPERTY_REJECTED:
            result = email_service.send_template(email, "property_rejected", email_data)
        elif notification_type == NotificationType.KYC_APPROVED:
            result = email_service.send_template(email, "host_approved", email_data)
        elif notification_type == NotificationType.KYC_REJECTED:
            result = email_service.send_template(email, "host_documents_rejected", email_data)
        elif notification_type == NotificationType.SUBSCRIPTION_EXPIRING:
            result = email_service.send_subscription_reminder(email, data.get("days_remaining", 5), email_data)
        elif notification_type == NotificationType.SUBSCRIPTION_EXPIRED:
            result = email_service.send_template(email, "subscription_failed", email_data)
        else:
            # Generic email
            result = email_service.send_template(email, "generic", {**email_data, "subject": title})
        
        # Store notification
        notification = Notification(
            user_id=user["user_id"],
            type=notification_type,
            channel=NotificationChannel.EMAIL,
            title=title,
            message=message,
            recipient=email,
            data=data or {},
            status=NotificationStatus.SENT if result["success"] else NotificationStatus.FAILED,
            provider_message_id=result.get("message_id"),
            provider_response=result,
            sent_at=datetime.now(timezone.utc) if result["success"] else None
        )
        
        await self.db.notifications.insert_one(notification.model_dump())
        
        return result
    
    async def _send_in_app(self, user: dict, title: str, message: str, notification_type: NotificationType, data: dict) -> dict:
        """Send in-app notification."""
        # Store notification in database for in-app display
        notification = Notification(
            user_id=user["user_id"],
            type=notification_type,
            channel=NotificationChannel.IN_APP,
            title=title,
            message=message,
            recipient=user["user_id"],
            data=data or {},
            status=NotificationStatus.SENT,
            sent_at=datetime.now(timezone.utc)
        )
        
        await self.db.notifications.insert_one(notification.model_dump())
        
        return {"success": True, "notification_id": notification.notification_id}
    
    async def mark_as_read(self, notification_id: str, user_id: str) -> bool:
        """Mark notification as read."""
        try:
            result = await self.db.notifications.update_one(
                {"notification_id": notification_id, "user_id": user_id},
                {"$set": {
                    "status": NotificationStatus.READ.value,
                    "read_at": datetime.now(timezone.utc)
                }}
            )
            return result.modified_count > 0
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return False
    
    async def get_user_notifications(self, user_id: str, limit: int = 50, unread_only: bool = False) -> list:
        """Get user's notifications."""
        try:
            query = {"user_id": user_id, "channel": NotificationChannel.IN_APP.value}
            
            if unread_only:
                query["status"] = {"$ne": NotificationStatus.READ.value}
            
            cursor = self.db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
            notifications = await cursor.to_list(length=limit)
            
            return notifications
        except Exception as e:
            logger.error(f"Error getting user notifications: {str(e)}")
            return []
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get count of unread notifications."""
        try:
            count = await self.db.notifications.count_documents({
                "user_id": user_id,
                "channel": NotificationChannel.IN_APP.value,
                "status": {"$ne": NotificationStatus.READ.value}
            })
            return count
        except Exception as e:
            logger.error(f"Error getting unread count: {str(e)}")
            return 0

# Helper function to send notifications
async def send_multi_channel_notification(
    db: AsyncIOMotorDatabase,
    user_id: str,
    notification_type: NotificationType,
    title: str,
    message: str,
    channels: list[NotificationChannel] = None,
    data: dict = None
):
    """Helper to send notifications."""
    if channels is None:
        # Default: Send via all channels
        channels = [
            NotificationChannel.IN_APP,
            NotificationChannel.SMS,
            NotificationChannel.WHATSAPP,
            NotificationChannel.EMAIL
        ]
    
    service = NotificationService(db)
    return await service.send_notification(
        user_id=user_id,
        notification_type=notification_type,
        channels=channels,
        title=title,
        message=message,
        data=data
    )
