#!/usr/bin/env python3
"""
Script to create default projects for existing users who don't have one
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import User, Project
from datetime import datetime

def create_default_projects_for_existing_users():
    """Create default projects for all existing users who don't have one"""
    db = SessionLocal()
    
    try:
        # Get all users
        users = db.query(User).all()
        print(f"Found {len(users)} users")
        
        created_count = 0
        for user in users:
            # Check if user already has a default project
            existing_default = db.query(Project).filter(
                Project.owner_account_id == user.account_id,
                Project.is_default.is_(True)
            ).first()
            
            if not existing_default:
                # Create default project for this user
                default_project = Project(
                    name="Default Project",
                    description="Your default project for organizing sandboxes and resources.",
                    owner_account_id=user.account_id,
                    is_default=True
                )
                db.add(default_project)
                created_count += 1
                print(f"Created default project for user: {user.email}")
            else:
                print(f"User {user.email} already has a default project")
        
        db.commit()
        print(f"\nSummary: Created {created_count} default projects")
        
    except Exception as e:
        print(f"Error creating default projects: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_default_projects_for_existing_users() 