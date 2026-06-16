from models.notification import Notification, NotificationType, NotificationChannel, NotificationStatus
from services.msg91_service import msg91_service
from services.email_service import email_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

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
        
        # Send WhatsApp via MSG91
        result = msg91_service.send_whatsapp(phone, message)
        
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
        
        # Use appropriate email template based on type
        if data and "subscription_id" in data:
            result = email_service.send_subscription_invoice(email, data)
        elif notification_type == NotificationType.BOOKING_CONFIRMED:
            result = email_service.send_booking_confirmation(email, data or {})
        elif notification_type == NotificationType.PROPERTY_APPROVED:
            result = email_service.send_property_approved(email, data or {})
        elif notification_type == NotificationType.SUBSCRIPTION_EXPIRING:
            result = email_service.send_subscription_reminder(email, data.get("days_remaining", 5), data or {})
        else:
            # Generic email
            result = email_service.send_email(email, title, f"<p>{message}</p>")
        
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