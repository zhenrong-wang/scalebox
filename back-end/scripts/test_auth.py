#!/usr/bin/env python3
"""
Test Authentication Script for ScaleBox

This script generates a JWT token for the test user to help debug authentication issues.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import jwt
from datetime import datetime, timedelta
from app.database import SessionLocal
from app.models import User
from config import settings

def generate_test_token():
    """Generate a JWT token for the test user"""
    
    # Create database connection
    db = SessionLocal()
    
    try:
        # Find the test user
        user = db.query(User).filter(User.email == "wangzr@cloudsway.com").first()
        if not user:
            print("❌ Test user wangzr@cloudsway.com not found!")
            return None
        
        print(f"✅ Found test user: {user.email} (ID: {user.id}, Account: {user.account_id})")
        
        # Generate JWT token
        payload = {
            "sub": str(user.id),  # User ID as string
            "email": user.email,
            "account_id": user.account_id,
            "role": user.role,
            "exp": datetime.utcnow() + timedelta(days=7),  # Token expires in 7 days
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
        
        print("\n" + "="*60)
        print("🔑 JWT TOKEN FOR TESTING")
        print("="*60)
        print(f"Token: {token}")
        print("\n📋 To use this token in the frontend:")
        print("1. Open browser developer tools (F12)")
        print("2. Go to Console tab")
        print("3. Run: localStorage.setItem('auth-token', '" + token + "')")
        print("4. Refresh the page")
        print("\n🔍 To test the API directly:")
        print(f"curl -H 'Authorization: Bearer {token}' http://localhost:8000/sandboxes/")
        print("="*60)
        
        return token
        
    except Exception as e:
        print(f"❌ Error generating token: {e}")
        return None
    finally:
        db.close()

if __name__ == "__main__":
    generate_test_token() 