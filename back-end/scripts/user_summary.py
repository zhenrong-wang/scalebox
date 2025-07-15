#!/usr/bin/env python3
"""
Script to show a summary of all data for a specific user
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import User, Sandbox, ApiKey, Notification
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

def show_user_summary(email):
    """Show a comprehensive summary of user data"""
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Find the user by email
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            print(f"❌ User with email {email} not found.")
            return
        
        print(f"👤 User Summary for: {user.email}")
        print("=" * 60)
        print(f"📋 User Details:")
        print(f"   ID: {user.id}")
        print(f"   Account ID: {user.account_id}")
        print(f"   Username: {user.username or 'N/A'}")
        print(f"   Full Name: {user.full_name or 'N/A'}")
        print(f"   Role: {user.role}")
        print(f"   Active: {user.is_active}")
        print(f"   Verified: {user.is_verified}")
        print(f"   Created: {user.created_at}")
        print()
        
        # Sandboxes summary
        sandboxes = db.query(Sandbox).filter(Sandbox.user_id == user.account_id).all()
        running_count = db.query(Sandbox).filter(
            Sandbox.user_id == user.account_id, 
            Sandbox.status == 'running'
        ).count()
        stopped_count = db.query(Sandbox).filter(
            Sandbox.user_id == user.account_id, 
            Sandbox.status == 'stopped'
        ).count()
        error_count = db.query(Sandbox).filter(
            Sandbox.user_id == user.account_id, 
            Sandbox.status == 'error'
        ).count()
        
        print(f"📦 Sandboxes ({len(sandboxes)} total):")
        print(f"   Running: {running_count}")
        print(f"   Stopped: {stopped_count}")
        print(f"   Error: {error_count}")
        
        if sandboxes:
            total_cost = sum(s.total_cost or 0 for s in sandboxes)
            avg_cpu = sum(s.cpu_usage or 0 for s in sandboxes) / len(sandboxes)
            avg_memory = sum(s.memory_usage or 0 for s in sandboxes) / len(sandboxes)
            print(f"   Total Cost: ${total_cost:.2f}")
            print(f"   Avg CPU Usage: {avg_cpu:.1f}%")
            print(f"   Avg Memory Usage: {avg_memory:.1f}%")
        print()
        
        # API Keys summary
        api_keys = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
        active_count = db.query(ApiKey).filter(
            ApiKey.user_id == user.id, 
            ApiKey.is_active == True
        ).count()
        expired_count = db.query(ApiKey).filter(
            ApiKey.user_id == user.id, 
            ApiKey.is_active == False
        ).count()
        
        print(f"🔑 API Keys ({len(api_keys)} total):")
        print(f"   Active: {active_count}")
        print(f"   Expired: {expired_count}")
        
        if api_keys:
            permanent_count = db.query(ApiKey).filter(
                ApiKey.user_id == user.id,
                ApiKey.expires_in_days.is_(None)
            ).count()
            expiring_soon_count = db.query(ApiKey).filter(
                ApiKey.user_id == user.id,
                ApiKey.expires_in_days <= 30,
                ApiKey.expires_in_days.isnot(None)
            ).count()
            print(f"   Permanent: {permanent_count}")
            print(f"   Expiring Soon (≤30 days): {expiring_soon_count}")
        print()
        
        # Notifications summary
        notifications = db.query(Notification).filter(Notification.user_id == user.id).all()
        unread_count = db.query(Notification).filter(
            Notification.user_id == user.id,
            Notification.is_read == False
        ).count()
        
        print(f"🔔 Notifications ({len(notifications)} total):")
        print(f"   Unread: {unread_count}")
        print(f"   Read: {len(notifications) - unread_count}")
        
        if notifications:
            # Group by type
            success_count = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.type == 'success'
            ).count()
            info_count = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.type == 'info'
            ).count()
            warning_count = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.type == 'warning'
            ).count()
            error_count = db.query(Notification).filter(
                Notification.user_id == user.id,
                Notification.type == 'error'
            ).count()
            
            print(f"   Success: {success_count}")
            print(f"   Info: {info_count}")
            print(f"   Warning: {warning_count}")
            print(f"   Error: {error_count}")
        print()
        
        # Recent activity
        print(f"📅 Recent Activity:")
        recent_sandboxes = db.query(Sandbox).filter(
            Sandbox.user_id == user.account_id
        ).order_by(Sandbox.created_at.desc()).limit(3).all()
        
        if recent_sandboxes:
            print("   Recent Sandboxes:")
            for sandbox in recent_sandboxes:
                print(f"     • {sandbox.name} ({sandbox.status}) - {sandbox.created_at.strftime('%Y-%m-%d %H:%M')}")
        
        recent_notifications = db.query(Notification).filter(
            Notification.user_id == user.id
        ).order_by(Notification.created_at.desc()).limit(3).all()
        
        if recent_notifications:
            print("   Recent Notifications:")
            for notification in recent_notifications:
                status = "📖" if notification.is_read == True else "📬"
                print(f"     {status} {notification.title} - {notification.created_at.strftime('%Y-%m-%d %H:%M')}")
        
        print()
        print("=" * 60)
        print("✅ Summary complete!")
        
    except Exception as e:
        print(f"❌ Error generating user summary: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    user_email = "495458966@qq.com"
    print(f"🔍 Generating summary for user: {user_email}")
    show_user_summary(user_email)
    print("✨ Done!") 