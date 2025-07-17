#!/usr/bin/env python3
"""
Script to populate the database with sample templates
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Template, User
import uuid

def create_sample_templates():
    """Create sample templates for testing"""
    db = SessionLocal()
    
    try:
        # Get the first user (assuming there's at least one user)
        user = db.query(User).first()
        if not user:
            print("No users found in database. Please create a user first.")
            return
        
        # Sample official templates
        official_templates = [
            {
                "name": "Python Basic",
                "description": "A basic Python environment.",
                "category": "Programming",
                "language": "Python",
                "min_cpu_required": 1.0,
                "min_memory_required": 2.0,
                "is_official": True,
                "is_public": True,
                "owner_account_id": None,
                "tags": ["flask", "python", "web", "authentication"],
            },
            {
                "name": "React TypeScript App",
                "description": "Full-stack React application with TypeScript, Redux, and modern tooling",
                "category": "Frontend",
                "language": "TypeScript",
                "min_cpu_required": 1.5,
                "min_memory_required": 3.0,
                "is_official": True,
                "is_public": True,
                "owner_account_id": None,
                "tags": ["react", "typescript", "redux", "frontend"],
            },
            {
                "name": "Node.js Starter",
                "description": "A Node.js starter template.",
                "category": "Programming",
                "language": "JavaScript",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "is_official": True,
                "is_public": True,
                "owner_account_id": None,
                "tags": ["nodejs", "express", "api", "mongodb"],
            },
            {
                "name": "Django E-commerce",
                "description": "Complete e-commerce platform with Django, PostgreSQL, and payment integration",
                "category": "E-commerce",
                "language": "Python",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "is_official": True,
                "is_public": True,
                "owner_account_id": None,
                "tags": ["django", "python", "ecommerce", "postgresql"],
            }
        ]
        
        # Sample private templates (owned by the user)
        private_templates = [
            {
                "name": "My Custom Blog",
                "description": "Personal blog template with custom styling and admin panel",
                "category": "Blog",
                "language": "Python",
                "min_cpu_required": 0.5,
                "min_memory_required": 1.0,
                "is_official": False,
                "is_public": False,
                "owner_account_id": user.account_id,
                "tags": ["blog", "python", "personal"],
            },
            {
                "name": "Portfolio Website",
                "description": "Professional portfolio template with animations and responsive design",
                "category": "Portfolio",
                "language": "JavaScript",
                "min_cpu_required": 0.8,
                "min_memory_required": 1.5,
                "is_official": False,
                "is_public": False,
                "owner_account_id": user.account_id,
                "tags": ["portfolio", "javascript", "responsive"],
            }
        ]
        
        # Create official templates
        for template_data in official_templates:
            template = Template(
                template_id=str(uuid.uuid4()),
                repository_url=f"https://github.com/scalebox/official-templates/{template_data['name'].lower().replace(' ', '-')}",
                **template_data
            )
            db.add(template)
        
        # Create private templates
        for template_data in private_templates:
            template = Template(
                template_id=str(uuid.uuid4()),
                repository_url=f"https://github.com/scalebox/private-templates/{template_data['name'].lower().replace(' ', '-')}",
                **template_data
            )
            db.add(template)
        
        db.commit()
        print(f"Successfully created {len(official_templates)} official templates and {len(private_templates)} private templates")
        
    except Exception as e:
        print(f"Error creating templates: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_templates() 