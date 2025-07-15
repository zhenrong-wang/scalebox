#!/usr/bin/env python3
"""
Test Sandboxes Endpoint Script

This script tests the sandboxes endpoint to debug the internal server error.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models import User, Sandbox
from app.sandboxes import list_sandboxes, get_current_user
from fastapi import Depends
from datetime import datetime

def test_sandboxes_endpoint():
    """Test the sandboxes endpoint directly"""
    
    # Create database connection
    db = SessionLocal()
    
    try:
        # Find the test user
        user = db.query(User).filter(User.email == "wangzr@cloudsway.com").first()
        if not user:
            print("❌ Test user wangzr@cloudsway.com not found!")
            return
        
        print(f"✅ Found test user: {user.email} (ID: {user.id}, Account: {user.account_id})")
        
        # Get sandboxes for this user
        sandboxes = db.query(Sandbox).filter(Sandbox.owner_account_id == user.account_id).all()
        print(f"✅ Found {len(sandboxes)} sandboxes for user")
        
        # Test the list_sandboxes function directly
        print("\n🔍 Testing list_sandboxes function...")
        try:
            # Create a mock current_user dependency
            def get_mock_current_user():
                return user
            
            # Call the function with mock dependencies
            result = list_sandboxes(
                current_user=user,
                db=db,
                status=None,
                framework=None,
                region=None,
                visibility=None,
                project_id=None,
                search=None,
                sort_by="created_at",
                sort_order="desc",
                limit=100,
                offset=0
            )
            
            print(f"✅ Successfully called list_sandboxes, returned {len(result)} sandboxes")
            
            # Print first sandbox details
            if result:
                first_sandbox = result[0]
                print(f"\n📋 First sandbox details:")
                print(f"   ID: {first_sandbox.id}")
                print(f"   Name: {first_sandbox.name}")
                print(f"   Status: {first_sandbox.status}")
                print(f"   Framework: {first_sandbox.framework}")
                print(f"   User ID: {first_sandbox.user_id}")
                print(f"   Created: {first_sandbox.created_at}")
            
        except Exception as e:
            print(f"❌ Error in list_sandboxes: {e}")
            import traceback
            traceback.print_exc()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_sandboxes_endpoint() 