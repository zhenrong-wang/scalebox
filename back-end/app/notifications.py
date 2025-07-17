from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime

from .database import get_db
from .models import Notification, User
from .auth import get_current_user, get_current_admin_user
from .schemas import NotificationResponse, NotificationListResponse, NotificationType


# Request models for bulk operations
class BulkNotificationRequest(BaseModel):
    notification_ids: List[str]


router = APIRouter(tags=["notifications"])


@router.get("/", response_model=NotificationListResponse)
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user's notifications with optional filtering"""
    query = db.query(Notification).filter(Notification.user_account_id == current_user.account_id)

    if is_read is not None:
        query = query.filter(Notification.is_read.is_(is_read))

    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_account_id == current_user.account_id,
        Notification.is_read.is_(False)
    ).count()

    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=str(notification.id),
                user_account_id=str(notification.user_account_id),
                title=str(notification.title),
                message=str(notification.message),
                type=NotificationType(notification.type),
                is_read=bool(notification.is_read),
                related_entity_type=str(notification.related_entity_type) if notification.related_entity_type is not None else None,
                related_entity_id=str(notification.related_entity_id) if notification.related_entity_id is not None else None,
                created_at=datetime.fromisoformat(str(notification.created_at)) if notification.created_at is not None else datetime.utcnow()
            ) for notification in notifications
        ],
        total=total,
        unread_count=unread_count
    )


@router.patch("/read-all")
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark all user's notifications as read"""
    db.query(Notification).filter(
        Notification.user_account_id == current_user.account_id,
        Notification.is_read.is_(False)
    ).update({"is_read": True})

    db.commit()

    return {"message": "All notifications marked as read"}


@router.delete("/")
async def delete_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete all user's notifications"""
    db.query(Notification).filter(Notification.user_account_id == current_user.account_id).delete()
    db.commit()

    return {"message": "All notifications deleted successfully"}


@router.delete("/bulk-delete")
async def bulk_delete_notifications(
    request: BulkNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete multiple notifications"""
    notifications = db.query(Notification).filter(
        Notification.id.in_(request.notification_ids),
        Notification.user_account_id == current_user.account_id
    ).all()
    
    if not notifications:
        raise HTTPException(status_code=404, detail="No notifications found")
    
    for notification in notifications:
        db.delete(notification)
    
    db.commit()
    
    return {"message": f"Deleted {len(notifications)} notifications successfully"}


@router.patch("/bulk-read")
async def bulk_mark_notifications_read(
    request: BulkNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark multiple notifications as read"""
    notifications = db.query(Notification).filter(
        Notification.id.in_(request.notification_ids),
        Notification.user_account_id == current_user.account_id
    ).all()
    
    if not notifications:
        raise HTTPException(status_code=404, detail="No notifications found")
    
    for notification in notifications:
        setattr(notification, 'is_read', True)
    
    db.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as read"}


@router.patch("/bulk-unread")
async def bulk_mark_notifications_unread(
    request: BulkNotificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark multiple notifications as unread"""
    notifications = db.query(Notification).filter(
        Notification.id.in_(request.notification_ids),
        Notification.user_account_id == current_user.account_id
    ).all()
    
    if not notifications:
        raise HTTPException(status_code=404, detail="No notifications found")
    
    for notification in notifications:
        setattr(notification, 'is_read', False)
    
    db.commit()
    
    return {"message": f"Marked {len(notifications)} notifications as unread"}


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_account_id == current_user.account_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    return NotificationResponse(
        id=str(notification.id),
        user_account_id=str(notification.user_account_id),
        title=str(notification.title),
        message=str(notification.message),
        type=NotificationType(str(notification.type)),
        is_read=bool(notification.is_read),
        related_entity_type=str(notification.related_entity_type) if notification.related_entity_type is not None else None,
        related_entity_id=str(notification.related_entity_id) if notification.related_entity_id is not None else None,
        created_at=datetime.fromisoformat(str(notification.created_at)) if notification.created_at is not None else datetime.utcnow()
    )


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as read"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_account_id == current_user.account_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    setattr(notification, 'is_read', True)
    db.commit()

    return {"message": "Notification marked as read"}


@router.patch("/{notification_id}/unread")
async def mark_notification_unread(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Mark a notification as unread"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_account_id == current_user.account_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    setattr(notification, 'is_read', False)
    db.commit()

    return {"message": "Notification marked as unread"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a notification"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_account_id == current_user.account_id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}


# Admin endpoints for sending notifications
@router.post("/admin/send")
async def admin_send_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Send a notification to a specific user (admin only)"""
    # Find user by internal ID
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    notification = Notification(
        user_account_id=user.account_id,
        title=title,
        message=message,
        type=notification_type,
        related_entity_type=related_entity_type,
        related_entity_id=related_entity_id
    )

    db.add(notification)
    db.commit()
    db.refresh(notification)

    return {"message": "Notification sent successfully", "notification_id": notification.notification_id}


@router.post("/admin/broadcast")
async def admin_broadcast_notification(
    title: str,
    message: str,
    notification_type: str = "info",
    related_entity_type: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Send a notification to all users (admin only)"""
    users = db.query(User).filter(User.is_active == True).all()
    
    notifications = []
    for user in users:
        notification = Notification(
            user_account_id=user.account_id,
            title=title,
            message=message,
            type=notification_type,
            related_entity_type=related_entity_type,
            related_entity_id=related_entity_id
        )
        notifications.append(notification)
    
    db.add_all(notifications)
    db.commit()

    return {"message": f"Notification broadcasted to {len(users)} users"}


@router.get("/admin/user/{user_id}", response_model=NotificationListResponse)
async def admin_get_user_notifications(
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Get notifications for a specific user (admin only)"""
    # Find user by internal ID
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    query = db.query(Notification).filter(Notification.user_account_id == user.account_id)
    notifications = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
    total = query.count()
    unread_count = db.query(Notification).filter(
        Notification.user_account_id == user.account_id,
        Notification.is_read.is_(False)
    ).count()

    return NotificationListResponse(
        notifications=[
            NotificationResponse(
                id=str(notification.id),
                user_account_id=str(notification.user_account_id),
                title=str(notification.title),
                message=str(notification.message),
                type=NotificationType(notification.type),
                is_read=bool(notification.is_read),
                related_entity_type=str(notification.related_entity_type) if notification.related_entity_type is not None else None,
                related_entity_id=str(notification.related_entity_id) if notification.related_entity_id is not None else None,
                created_at=datetime.fromisoformat(str(notification.created_at)) if notification.created_at is not None else datetime.utcnow()
            ) for notification in notifications
        ],
        total=total,
        unread_count=unread_count
    )


@router.post("/demo")
async def create_demo_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create demo notifications for testing"""
    # Check if user already has demo notifications
    existing_count = db.query(Notification).filter(Notification.user_account_id == current_user.account_id).count()
    
    if existing_count > 0:
        return {"message": "Demo notifications already exist for this user"}

    demo_notifications = [
        {
            "title": "Welcome to ScaleBox!",
            "message": "Your account has been successfully created. Start by creating your first sandbox.",
            "type": "success",
            "related_entity_type": "sandbox",
            "related_entity_id": "demo-sandbox-1"
        },
        {
            "title": "New Template Available",
            "message": "A new Python development template is now available for your projects.",
            "type": "info",
            "related_entity_type": "template",
            "related_entity_id": "python-dev-template"
        },
        {
            "title": "Sandbox Timeout Warning",
            "message": "Your sandbox 'test-project' will timeout in 30 minutes due to inactivity.",
            "type": "warning",
            "related_entity_type": "sandbox",
            "related_entity_id": "test-project-sandbox"
        },
        {
            "title": "API Key Created",
            "message": "New API key 'production-key' has been successfully created.",
            "type": "success",
            "related_entity_type": "api_key",
            "related_entity_id": "prod-key-123"
        },
        {
            "title": "Billing Update",
            "message": "Your monthly usage has reached 80% of your current plan limit.",
            "type": "warning",
            "related_entity_type": "billing",
            "related_entity_id": "monthly-usage"
        }
    ]

    notifications = []
    for demo in demo_notifications:
        notification = Notification(
            user_account_id=current_user.account_id,
            title=demo["title"],
            message=demo["message"],
            type=demo["type"],
            related_entity_type=demo["related_entity_type"],
            related_entity_id=demo["related_entity_id"]
        )
        notifications.append(notification)

    db.add_all(notifications)
    db.commit()

    return {"message": f"Created {len(demo_notifications)} demo notifications"} 