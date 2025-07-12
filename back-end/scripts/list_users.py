#!/usr/bin/env python3
"""
Script to list all users in the database
"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models import User
from sqlalchemy.orm import sessionmaker

def list_users():
    """List all users in the database"""
    
    # Create database session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        users = db.query(User).all()
        
        if not users:
            print("❌ No users found in database")
            return
        
        print(f"📋 Found {len(users)} users in database:")
        print("-" * 100)
        print(f"{'ID':<5} {'Email':<30} {'Username':<20} {'Role':<10} {'Active':<8} {'Verified':<10}")
        print("-" * 100)
        
        for user in users:
            email = user.email or "N/A"
            username = user.username or "N/A"
            role = user.role or "N/A"
            is_active = str(user.is_active) if user.is_active is not None else "N/A"
            is_verified = str(user.is_verified) if user.is_verified is not None else "N/A"
            
            print(f"{user.id:<5} {email:<30} {username:<20} {role:<10} {is_active:<8} {is_verified:<10}")
        
        print("-" * 100)
        
        # Also show detailed info for each user
        print("\n📝 Detailed user information:")
        for user in users:
            print(f"\nUser ID: {user.id}")
            print(f"  Email: {user.email}")
            print(f"  Username: {user.username}")
            print(f"  Full Name: {user.full_name}")
            print(f"  Role: {user.role}")
            print(f"  Active: {user.is_active}")
            print(f"  Verified: {user.is_verified}")
            print(f"  Created: {user.created_at}")
            print(f"  Last Login: {user.last_login}")
        
    except Exception as e:
        print(f"❌ Error listing users: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔍 Listing all users in database...")
    list_users()
    print("✨ Done!") 