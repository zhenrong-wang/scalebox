#!/usr/bin/env python3
"""
Script to create sample data with new AWS-style IDs.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import sessionmaker
from app.database import engine
from app.models import User, Project, Template, Sandbox, ApiKey
from app.models import generate_account_id, generate_project_id, generate_template_id, generate_sandbox_id, generate_api_key
from passlib.context import CryptContext
from datetime import datetime

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

Session = sessionmaker(bind=engine)

def create_sample_data():
    """Create sample data with new ID format"""
    session = Session()
    
    try:
        print("🔄 Creating sample data with new AWS-style IDs...")
        
        # Create admin user
        admin_user = User(
            account_id=generate_account_id(),
            email="admin@scalebox.com",
            username="admin",
            password_hash=pwd_context.hash("Admin2024!"),
            full_name="System Administrator",
            role="admin",
            is_active=True,
            is_verified=True
        )
        session.add(admin_user)
        session.flush()  # Get the account_id
        
        # Create regular user
        regular_user = User(
            account_id=generate_account_id(),
            email="wangzr@cloudsway.com",
            username="wangzr",
            password_hash=pwd_context.hash("Test2022!"),
            full_name="Wang ZR",
            role="user",
            is_active=True,
            is_verified=True
        )
        session.add(regular_user)
        session.flush()  # Get the account_id
        
        print(f"✅ Created users:")
        print(f"   Admin: {admin_user.account_id} (admin@scalebox.com)")
        print(f"   User:  {regular_user.account_id} (wangzr@cloudsway.com)")
        
        # Create default project for regular user
        default_project = Project(
            project_id=generate_project_id(),
            name="Default Project",
            description="Default project for all sandboxes",
            owner_account_id=regular_user.account_id,
            status="active",
            is_default=True
        )
        session.add(default_project)
        session.flush()
        
        # Create a custom project
        custom_project = Project(
            project_id=generate_project_id(),
            name="My Custom Project",
            description="A custom project for testing",
            owner_account_id=regular_user.account_id,
            status="active",
            is_default=False
        )
        session.add(custom_project)
        session.flush()
        
        print(f"✅ Created projects:")
        print(f"   Default: {default_project.project_id} ({default_project.name})")
        print(f"   Custom:  {custom_project.project_id} ({custom_project.name})")
        
        # Create official templates
        official_templates = [
            {
                "name": "Node.js Development",
                "description": "Full-stack Node.js development environment",
                "category": "Backend",
                "language": "JavaScript",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "repository_url": "https://github.com/scalebox/nodejs-template"
            },
            {
                "name": "Python Data Science",
                "description": "Python environment for data science and ML",
                "category": "Data Science",
                "language": "Python",
                "min_cpu_required": 4.0,
                "min_memory_required": 8.0,
                "repository_url": "https://github.com/scalebox/python-datascience"
            },
            {
                "name": "React Frontend",
                "description": "Modern React development environment",
                "category": "Frontend",
                "language": "TypeScript",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "repository_url": "https://github.com/scalebox/react-template"
            }
        ]
        
        for template_data in official_templates:
            template = Template(
                template_id=generate_template_id(),
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                language=template_data["language"],
                min_cpu_required=template_data["min_cpu_required"],
                min_memory_required=template_data["min_memory_required"],
                is_official=True,
                is_public=True,
                owner_account_id=None,  # Official templates have no owner
                repository_url=template_data["repository_url"]
            )
            session.add(template)
            session.flush()
            print(f"   Official: {template.template_id} ({template.name})")
        
        # Create private template for user
        private_template = Template(
            template_id=generate_template_id(),
            name="My Custom Template",
            description="A custom template for personal use",
            category="Other",
            language="Python",
            min_cpu_required=1.0,
            min_memory_required= 2.0,
            is_official=False,
            is_public=False,
            owner_account_id=regular_user.account_id,
            repository_url="https://github.com/user/custom-template"
        )
        session.add(private_template)
        session.flush()
        print(f"   Private: {private_template.template_id} ({private_template.name})")
        
        # Create sandboxes
        sandboxes = [
            {
                "name": "Node.js API Server",
                "description": "Backend API development",
                "template_id": official_templates[0]["name"],  # We'll get the actual ID
                "project_id": default_project.project_id,
                "cpu_spec": 2.0,
                "memory_spec": 4.0,
                "status": "running"
            },
            {
                "name": "Data Analysis Project",
                "description": "Jupyter notebook for data analysis",
                "template_id": official_templates[1]["name"],
                "project_id": default_project.project_id,
                "cpu_spec": 4.0,
                "memory_spec": 8.0,
                "status": "stopped"
            },
            {
                "name": "React App Development",
                "description": "Frontend React application",
                "template_id": official_templates[2]["name"],
                "project_id": custom_project.project_id,
                "cpu_spec": 2.0,
                "memory_spec": 4.0,
                "status": "running"
            }
        ]
        
        # Get template IDs by name
        template_map = {t.name: t.template_id for t in session.query(Template).all()}
        
        for sandbox_data in sandboxes:
            sandbox = Sandbox(
                sandbox_id=generate_sandbox_id(),
                name=sandbox_data["name"],
                description=sandbox_data["description"],
                template_id=template_map[sandbox_data["template_id"]],
                owner_account_id=regular_user.account_id,
                project_id=sandbox_data["project_id"],
                cpu_spec=sandbox_data["cpu_spec"],
                memory_spec=sandbox_data["memory_spec"],
                status=sandbox_data["status"]
            )
            session.add(sandbox)
            session.flush()
            print(f"   Sandbox: {sandbox.sandbox_id} ({sandbox.name})")
        
        # Create API key
        api_key_value = generate_api_key()
        import hashlib
        key_hash = hashlib.sha256(api_key_value.encode()).hexdigest()
        
        api_key = ApiKey(
            api_key=api_key_value,
            user_account_id=regular_user.account_id,
            name="Development API Key",
            description="API key for development and testing",
            key_hash=key_hash,
            is_active=True
        )
        session.add(api_key)
        session.flush()
        print(f"   API Key: {api_key.api_key}")
        
        session.commit()
        print("\n✅ Sample data created successfully!")
        print("\n📋 Summary:")
        print(f"   Users: {session.query(User).count()}")
        print(f"   Projects: {session.query(Project).count()}")
        print(f"   Templates: {session.query(Template).count()}")
        print(f"   Sandboxes: {session.query(Sandbox).count()}")
        print(f"   API Keys: {session.query(ApiKey).count()}")
        
    except Exception as e:
        session.rollback()
        print(f"❌ Error creating sample data: {e}")
        raise
    finally:
        session.close()

if __name__ == "__main__":
    create_sample_data() 