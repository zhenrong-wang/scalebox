#!/usr/bin/env python3
"""
Script to create demo notifications for user 485458966@qq.com
Run this script to populate the database with sample notifications
"""

import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import User, Notification
from sqlalchemy.orm import sessionmaker

def create_demo_notifications():
    """Create demo notifications for the specified user"""
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Find the user by email
        user = db.query(User).filter(User.email == "495458966@qq.com").first()
        
        if not user:
            print("❌ User 485458966@qq.com not found in database")
            return
        
        print(f"✅ Found user: {user.username} (ID: {user.id})")
        
        # Check if user already has notifications
        existing_count = db.query(Notification).filter(Notification.user_id == user.id).count()
        if existing_count > 0:
            print(f"⚠️  User already has {existing_count} notifications")
            response = input("Do you want to add more demo notifications? (y/n): ")
            if response.lower() != 'y':
                print("Cancelled.")
                return
        
        # Demo notifications data
        demo_notifications = [
            {
                "title": "Welcome to ScaleBox! 🎉",
                "message": "Your account has been successfully created. You can now start creating sandboxes and templates.",
                "type": "success",
                "related_entity_type": "account",
                "related_entity_id": str(user.id)
            },
            {
                "title": "New Template Available",
                "message": "A new React TypeScript template has been added to the template library. Check it out!",
                "type": "info",
                "related_entity_type": "template",
                "related_entity_id": "demo-template-1"
            },
            {
                "title": "System Maintenance Notice",
                "message": "Scheduled maintenance will occur on Sunday at 2 AM UTC. Service may be temporarily unavailable.",
                "type": "warning",
                "related_entity_type": "system",
                "related_entity_id": "maintenance-2024-01"
            },
            {
                "title": "API Key Expiring Soon",
                "message": "Your API key 'production-key-1' will expire in 7 days. Please rotate it soon.",
                "type": "warning",
                "related_entity_type": "api_key",
                "related_entity_id": "key-123"
            },
            {
                "title": "Sandbox Created Successfully",
                "message": "Your new sandbox 'my-test-project' has been created and is ready to use.",
                "type": "success",
                "related_entity_type": "sandbox",
                "related_entity_id": "sandbox-456"
            },
            {
                "title": "Billing Update",
                "message": "Your monthly usage is at 85% of your plan limit. Consider upgrading for more resources.",
                "type": "info",
                "related_entity_type": "billing",
                "related_entity_id": "billing-789"
            },
            {
                "title": "Security Alert",
                "message": "New login detected from a new device. If this wasn't you, please review your account security.",
                "type": "error",
                "related_entity_type": "security",
                "related_entity_id": "login-alert-001"
            }
        ]
        
        # Create notifications with different timestamps
        created_count = 0
        for i, notification_data in enumerate(demo_notifications):
            # Create timestamps that are progressively older
            created_at = datetime.utcnow() - timedelta(hours=i*2)
            
            notification = Notification(
                user_id=user.id,
                title=notification_data["title"],
                message=notification_data["message"],
                type=notification_data["type"],
                is_read=False,  # Make them unread to show the badge
                related_entity_type=notification_data["related_entity_type"],
                related_entity_id=notification_data["related_entity_id"],
                created_at=created_at
            )
            
            db.add(notification)
            created_count += 1
            print(f"📝 Created notification: {notification_data['title']}")
        
        # Commit all notifications
        db.commit()
        print(f"✅ Successfully created {created_count} demo notifications for user {user.email}")
        print("🔔 The notification bell should now show a badge with the unread count")
        
    except Exception as e:
        print(f"❌ Error creating demo notifications: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Creating demo notifications for user 485458966@qq.com...")
    create_demo_notifications()
    print("✨ Done!") 