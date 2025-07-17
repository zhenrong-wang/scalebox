#!/usr/bin/env python3
"""
Test script to debug the sandbox endpoint issue
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Sandbox, User, Project
from app.schemas import SandboxResponse
from datetime import datetime, timezone

def safe_datetime(val, default=None):
    """Safe datetime conversion"""
    if val is None:
        return default
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return default

def calculate_uptime(started_at):
    """Calculate uptime in minutes"""
    if not started_at:
        return 0
    now = datetime.now(timezone.utc)
    if isinstance(started_at, str):
        started_at = safe_datetime(started_at)
    if not started_at:
        return 0
    diff = now - started_at
    return int(diff.total_seconds() / 60)

def test_sandbox_response():
    """Test creating SandboxResponse objects"""
    db = SessionLocal()
    
    try:
        # Get a project
        project = db.query(Project).filter(Project.is_default == True).first()
        if not project:
            print("No default project found")
            return
        
        print(f"Testing with project: {project.name} ({project.project_id})")
        
        # Get sandboxes for this project
        sandboxes = db.query(Sandbox).filter(Sandbox.project_id == project.project_id).all()
        print(f"Found {len(sandboxes)} sandboxes")
        
        for i, sandbox in enumerate(sandboxes[:2]):  # Test first 2 sandboxes
            print(f"\nTesting sandbox {i+1}: {sandbox.name}")
            
            # Get user info
            user = db.query(User).filter(User.account_id == sandbox.owner_account_id).first()
            user_name = (
                user.full_name or user.username or user.email.split('@')[0]
                if user is not None else "Unknown"
            )
            user_email = user.email if user is not None else "unknown@example.com"
            
            # Calculate uptime
            started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
            uptime = calculate_uptime(started_at_val)
            
            try:
                sandbox_dict = {
                    "id": str(sandbox.sandbox_id),
                    "name": str(sandbox.name),
                    "description": str(sandbox.description) if sandbox.description is not None else None,
                    "status": sandbox.status,
                    "user_account_id": str(sandbox.owner_account_id),
                    "user_name": str(user_name),
                    "user_email": str(user_email),
                    "project_id": str(sandbox.project_id) if sandbox.project_id is not None else None,
                    "project_name": str(project.name),
                    "template_id": str(sandbox.template_id) if sandbox.template_id is not None else None,
                    "resources": {
                        "cpu": float(getattr(sandbox, 'cpu_usage', 0) or 0),
                        "memory": float(getattr(sandbox, 'memory_usage', 0) or 0),
                        "storage": float(getattr(sandbox, 'storage_usage', 0) or 0),
                        "bandwidth": float(getattr(sandbox, 'bandwidth_usage', 0) or 0)
                    },
                    "cpu_spec": float(getattr(sandbox, 'cpu_spec', 0) or 0),
                    "memory_spec": float(getattr(sandbox, 'memory_spec', 0) or 0),
                    "cost": {
                        "hourlyRate": float(getattr(sandbox, 'hourly_rate', 0) or 0),
                        "totalCost": float(getattr(sandbox, 'total_cost', 0) or 0)
                    },
                    "created_at": safe_datetime(sandbox.created_at),
                    "updated_at": safe_datetime(sandbox.updated_at),
                    "last_accessed_at": safe_datetime(getattr(sandbox, 'last_accessed_at', None)),
                    "uptime": uptime
                }
                
                print(f"  Created sandbox_dict successfully")
                print(f"  Keys: {list(sandbox_dict.keys())}")
                
                # Try to create SandboxResponse
                response = SandboxResponse(**sandbox_dict)
                print(f"  Created SandboxResponse successfully: {response.id}")
                
            except Exception as e:
                print(f"  Error creating SandboxResponse: {e}")
                print(f"  Error type: {type(e)}")
                import traceback
                traceback.print_exc()
                
    except Exception as e:
        print(f"Error in test: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_sandbox_response() 