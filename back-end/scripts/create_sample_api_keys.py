#!/usr/bin/env python3
"""
Script to create sample API keys with different expiration dates for testing
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import get_db, engine
from app.models import ApiKey, User
from app.api_keys import generate_api_key
import datetime
import uuid

def create_sample_api_keys():
    """Create sample API keys with different expiration scenarios"""
    
    # Get database session
    db = next(get_db())
    
    try:
        # Find a test user (assuming there's at least one user)
        user = db.query(User).first()
        if not user:
            print("No users found. Please create a user first.")
            return
        
        print(f"Creating sample API keys for user: {user.email}")
        
        # Sample API keys with different expiration scenarios
        sample_keys = [
            {
                "name": "Test Key - Expires Soon (5 days)",
                "description": "This key will expire in 5 days for testing expiration warnings",
                "expires_in_days": 5,
                "permissions": {"read": True, "write": True}
            },
            {
                "name": "Test Key - Expires in 30 days",
                "description": "This key expires in 30 days",
                "expires_in_days": 30,
                "permissions": {"read": True, "write": False}
            },
            {
                "name": "Test Key - Expires in 90 days",
                "description": "This key expires in 90 days",
                "expires_in_days": 90,
                "permissions": {"read": True, "write": True}
            },
            {
                "name": "Test Key - Permanent",
                "description": "This is a permanent API key that never expires",
                "expires_in_days": None,
                "permissions": {"read": True, "write": True}
            },
            {
                "name": "Test Key - Already Expired",
                "description": "This key is already expired for testing expired state",
                "expires_in_days": 1,  # Will be set to expired by adjusting created_at
                "permissions": {"read": True, "write": False}
            }
        ]
        
        created_keys = []
        
        for i, key_data in enumerate(sample_keys):
            # Generate API key
            full_key, key_hash, prefix = generate_api_key()
            
            # Create API key record
            api_key = ApiKey(
                id=str(uuid.uuid4()),
                key_id=str(uuid.uuid4()),
                user_id=user.id,
                name=key_data["name"],
                description=key_data["description"],
                key_hash=key_hash,
                full_key=full_key,
                prefix=prefix,
                permissions=key_data["permissions"],
                is_active=True,
                expires_in_days=key_data["expires_in_days"],
                created_at=datetime.datetime.utcnow(),
                updated_at=datetime.datetime.utcnow()
            )
            
            # For the "already expired" key, set created_at to 2 days ago
            if key_data["name"] == "Test Key - Already Expired":
                setattr(api_key, 'created_at', datetime.datetime.utcnow() - datetime.timedelta(days=2))
            
            db.add(api_key)
            created_keys.append({
                "name": key_data["name"],
                "full_key": full_key,
                "prefix": prefix,
                "expires_in_days": key_data["expires_in_days"]
            })
        
        db.commit()
        
        print(f"Successfully created {len(created_keys)} sample API keys:")
        print()
        for key in created_keys:
            expiration_text = "Permanent" if key["expires_in_days"] is None else f"{key['expires_in_days']} days"
            print(f"• {key['name']}")
            print(f"  Key: {key['full_key']}")
            print(f"  Prefix: {key['prefix']}")
            print(f"  Expiration: {expiration_text}")
            print()
        
        print("You can now test the enhanced API key expiration management features!")
        
    except Exception as e:
        print(f"Error creating sample API keys: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_api_keys() 