#!/usr/bin/env python3
"""
Debug script to test template creation step by step.
"""

import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import get_db
from app.models import User, Template
from sqlalchemy.orm import Session
import uuid

def test_template_creation():
    """Test template creation step by step"""
    print("🧪 Testing Template Creation")
    print("=" * 50)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Step 1: Find a user
        user = db.query(User).filter(User.role == 'admin').first()
        if not user:
            print("❌ No admin user found")
            return
        
        print(f"✅ Found user: {user.email} (ID: {user.id}, Account ID: {user.account_id})")
        
        # Step 2: Test template ID generation
        try:
            from app.models import generate_template_id
            template_id = generate_template_id()
            print(f"✅ Generated template ID: {template_id}")
        except Exception as e:
            print(f"❌ Failed to generate template ID: {e}")
            return
        
        # Step 3: Test repository URL generation
        try:
            from app.templates import generate_repository_url
            repository_url = generate_repository_url(template_id, False)
            print(f"✅ Generated repository URL: {repository_url}")
        except Exception as e:
            print(f"❌ Failed to generate repository URL: {e}")
            return
        
        # Step 4: Test template creation
        try:
            template = Template(
                template_id=template_id,
                name="Debug Test Template",
                description="Test template for debugging",
                category="test",
                language="python",
                min_cpu_required=1.0,
                min_memory_required=1.0,
                is_official=False,
                is_public=False,
                owner_account_id=user.account_id,
                repository_url=repository_url,
                tags=[]
            )
            print("✅ Created template object")
            
            # Step 5: Test database insertion
            db.add(template)
            print("✅ Added template to session")
            
            db.commit()
            print("✅ Committed template to database")
            
            db.refresh(template)
            print("✅ Refreshed template from database")
            
            print(f"✅ Template created successfully with ID: {template.template_id}")
            
            # Clean up
            db.delete(template)
            db.commit()
            print("✅ Cleaned up test template")
            
        except Exception as e:
            print(f"❌ Failed to create template: {e}")
            import traceback
            traceback.print_exc()
            db.rollback()
            return
        
        print("\n" + "=" * 50)
        print("✅ Template creation test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_template_creation() 