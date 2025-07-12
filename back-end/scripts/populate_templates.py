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
                "name": "Python Flask Web App",
                "description": "A modern Flask web application template with authentication and database integration",
                "category": "Web Development",
                "language": "Python",
                "cpu_requirements": 1.0,
                "memory_requirements": 2.0,
                "is_official": True,
                "is_public": True,
                "tags": ["flask", "python", "web", "authentication"],
                "stars": 150,
                "downloads": 1200
            },
            {
                "name": "React TypeScript App",
                "description": "Full-stack React application with TypeScript, Redux, and modern tooling",
                "category": "Frontend",
                "language": "TypeScript",
                "cpu_requirements": 1.5,
                "memory_requirements": 3.0,
                "is_official": True,
                "is_public": True,
                "tags": ["react", "typescript", "redux", "frontend"],
                "stars": 200,
                "downloads": 1800
            },
            {
                "name": "Node.js Express API",
                "description": "RESTful API template with Express.js, JWT authentication, and MongoDB",
                "category": "Backend",
                "language": "JavaScript",
                "cpu_requirements": 1.0,
                "memory_requirements": 2.5,
                "is_official": True,
                "is_public": True,
                "tags": ["nodejs", "express", "api", "mongodb"],
                "stars": 180,
                "downloads": 1500
            },
            {
                "name": "Django E-commerce",
                "description": "Complete e-commerce platform with Django, PostgreSQL, and payment integration",
                "category": "E-commerce",
                "language": "Python",
                "cpu_requirements": 2.0,
                "memory_requirements": 4.0,
                "is_official": True,
                "is_public": True,
                "tags": ["django", "python", "ecommerce", "postgresql"],
                "stars": 120,
                "downloads": 900
            }
        ]
        
        # Sample private templates (owned by the user)
        private_templates = [
            {
                "name": "My Custom Blog",
                "description": "Personal blog template with custom styling and admin panel",
                "category": "Blog",
                "language": "Python",
                "cpu_requirements": 0.5,
                "memory_requirements": 1.0,
                "is_official": False,
                "is_public": False,
                "owner_id": user.id,
                "tags": ["blog", "python", "personal"],
                "stars": 5,
                "downloads": 25
            },
            {
                "name": "Portfolio Website",
                "description": "Professional portfolio template with animations and responsive design",
                "category": "Portfolio",
                "language": "JavaScript",
                "cpu_requirements": 0.8,
                "memory_requirements": 1.5,
                "is_official": False,
                "is_public": False,
                "owner_id": user.id,
                "tags": ["portfolio", "javascript", "responsive"],
                "stars": 8,
                "downloads": 15
            }
        ]
        
        # Create official templates
        for template_data in official_templates:
            template = Template(
                id=str(uuid.uuid4()),
                repository_url=f"https://github.com/scalebox/official-templates/{template_data['name'].lower().replace(' ', '-')}",
                **template_data
            )
            db.add(template)
        
        # Create private templates
        for template_data in private_templates:
            template = Template(
                id=str(uuid.uuid4()),
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