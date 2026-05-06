from fastapi import APIRouter, HTTPException, status, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from models.notification import NotificationType, NotificationChannel
from services.notification_service import NotificationService
from middleware.auth_middleware import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])

async def get_db():
    from server import db_instance
    return db_instance

# ========== IN-APP NOTIFICATIONS ==========

@router.get("/my-notifications")
async def get_my_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get current user's in-app notifications."""
    try:
        service = NotificationService(db)
        notifications = await service.get_user_notifications(
            user_id=current_user["user_id"],
            limit=limit,
            unread_only=unread_only
        )
        
        unread_count = await service.get_unread_count(current_user["user_id"])
        
        return {
            "notifications": notifications,
            "total": len(notifications),
            "unread_count": unread_count
        }
    
    except Exception as e:
        logger.error(f"Error fetching notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch notifications"
        )

@router.get("/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get count of unread notifications."""
    try:
        service = NotificationService(db)
        count = await service.get_unread_count(current_user["user_id"])
        
        return {"unread_count": count}
    
    except Exception as e:
        logger.error(f"Error fetching unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch unread count"
        )

@router.post("/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark notification as read."""
    try:
        service = NotificationService(db)
        success = await service.mark_as_read(notification_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        
        return {"message": "Notification marked as read"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )

@router.post("/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark all notifications as read for current user."""
    try:
        from datetime import datetime
        from models.notification import NotificationStatus
        
        result = await db.notifications.update_many(
            {
                "user_id": current_user["user_id"],
                "channel": NotificationChannel.IN_APP.value,
                "status": {"$ne": NotificationStatus.READ.value}
            },
            {"$set": {
                "status": NotificationStatus.READ.value,
                "read_at": datetime.utcnow()
            }}
        )
        
        return {
            "message": "All notifications marked as read",
            "updated_count": result.modified_count
        }
    
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark all notifications as read"
        )

# ========== ADMIN: TEST NOTIFICATIONS ==========

@router.post("/admin/send-test")
async def send_test_notification(
    user_id: str,
    channels: List[NotificationChannel],
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send test notification (Admin only)."""
    try:
        if current_user["role"] != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        service = NotificationService(db)
        result = await service.send_notification(
            user_id=user_id,
            notification_type=NotificationType.BOOKING_CONFIRMED,
            channels=channels,
            title="Test Notification",
            message="This is a test notification from PropNest.",
            data={"test": True}
        )
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test notification"
        )