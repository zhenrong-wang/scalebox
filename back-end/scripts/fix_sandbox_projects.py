#!/usr/bin/env python3
"""
Script to fix sandbox project assignments and clean up duplicate default projects
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Sandbox, Project, User
from datetime import datetime

def fix_sandbox_projects():
    """Fix sandbox project assignments and clean up duplicate default projects"""
    db = SessionLocal()
    
    try:
        # Get all users
        users = db.query(User).all()
        
        for user in users:
            print(f"Processing user: {user.email}")
            
            # Get all default projects for this user
            default_projects = db.query(Project).filter(
                Project.owner_account_id == user.account_id,
                Project.is_default == True
            ).all()
            
            if len(default_projects) > 1:
                print(f"  Found {len(default_projects)} default projects, keeping the first one")
                # Keep the first default project, delete the rest
                default_project = default_projects[0]
                for project in default_projects[1:]:
                    print(f"  Deleting duplicate default project: {project.name} ({project.project_id})")
                    db.delete(project)
            elif len(default_projects) == 1:
                default_project = default_projects[0]
                print(f"  Found 1 default project: {default_project.name}")
            else:
                print(f"  No default project found, creating one")
                # Create a default project
                default_project = Project(
                    project_id=f"default-{user.account_id}",
                    name="Default Project",
                    description="Default project for sandboxes without a specific project",
                    owner_account_id=user.account_id,
                    status="active",
                    is_default=True,
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(default_project)
                db.flush()  # Get the ID
            
            # Get all sandboxes for this user that don't have a project
            sandboxes_without_project = db.query(Sandbox).filter(
                Sandbox.owner_account_id == user.account_id,
                Sandbox.project_id.is_(None)
            ).all()
            
            if sandboxes_without_project:
                print(f"  Assigning {len(sandboxes_without_project)} sandboxes to default project")
                for sandbox in sandboxes_without_project:
                    sandbox.project_id = default_project.project_id
                    sandbox.updated_at = datetime.utcnow()
                    print(f"    - {sandbox.name} -> {default_project.name}")
            else:
                print(f"  No sandboxes without project found")
        
        db.commit()
        print("Successfully fixed sandbox project assignments")
        
        # Verify the fix
        print("\nVerification:")
        for user in users:
            sandboxes = db.query(Sandbox).filter(Sandbox.owner_account_id == user.account_id).all()
            default_project = db.query(Project).filter(
                Project.owner_account_id == user.account_id,
                Project.is_default == True
            ).first()
            
            print(f"\nUser: {user.email}")
            print(f"Default project: {default_project.name if default_project else 'None'}")
            for sandbox in sandboxes:
                project_name = "No project" if sandbox.project_id is None else default_project.name if sandbox.project_id == default_project.project_id else "Custom project"
                print(f"  - {sandbox.name}: {project_name}")
        
    except Exception as e:
        print(f"Error fixing sandbox projects: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fix_sandbox_projects() 