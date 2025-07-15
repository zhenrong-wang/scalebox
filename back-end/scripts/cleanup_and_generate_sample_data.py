#!/usr/bin/env python3
"""
Cleanup and Sample Data Generation Script for ScaleBox

This script:
1. Deletes all users except admin and wangzr@cloudsway.com
2. Creates sample projects for wangzr@cloudsway.com
3. Creates sample templates (public and private)
4. Creates sample sandboxes for the projects
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import User, Project, Template, Sandbox, ApiKey, Notification
from app.database import DATABASE_URL
import bcrypt
from datetime import datetime, timedelta
import uuid

def generate_uuid():
    """Generate a UUID string"""
    return str(uuid.uuid4())

def cleanup_and_generate_data():
    """Main function to cleanup and generate sample data"""
    
    # Create database connection
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    try:
        print("🔍 Starting cleanup and sample data generation...")
        
        # Step 1: Find the target user (wangzr@cloudsway.com)
        target_user = session.query(User).filter(User.email == "wangzr@cloudsway.com").first()
        if not target_user:
            print("❌ User wangzr@cloudsway.com not found!")
            return
        
        print(f"✅ Found target user: {target_user.email} (Account ID: {target_user.account_id})")
        
        # Step 2: Delete all other users and their data
        print("\n🗑️  Deleting other users and their data...")
        
        # Get all users except the target user
        other_users = session.query(User).filter(User.email != "wangzr@cloudsway.com").all()
        
        for user in other_users:
            print(f"   Deleting user: {user.email}")
            
            # Delete related data (cascade should handle most, but let's be explicit)
            session.query(Sandbox).filter(Sandbox.owner_account_id == user.account_id).delete()
            session.query(Project).filter(Project.owner_account_id == user.account_id).delete()
            session.query(Template).filter(Template.owner_account_id == user.account_id).delete()
            session.query(ApiKey).filter(ApiKey.user_account_id == user.account_id).delete()
            session.query(Notification).filter(Notification.user_account_id == user.account_id).delete()
            
            # Delete the user
            session.delete(user)
        
        session.commit()
        print(f"✅ Deleted {len(other_users)} other users")
        
        # Step 3: Create sample projects for the target user
        print("\n📁 Creating sample projects...")
        
        projects_data = [
            {
                "name": "Web Development Project",
                "description": "A modern web application using React and Node.js"
            },
            {
                "name": "Data Science Lab",
                "description": "Machine learning and data analysis environment"
            },
            {
                "name": "Mobile App Development",
                "description": "Cross-platform mobile application development"
            }
        ]
        
        created_projects = []
        for project_data in projects_data:
            project = Project(
                project_id=generate_uuid(),
                name=project_data["name"],
                description=project_data["description"],
                owner_account_id=target_user.account_id,
                status="active"
            )
            session.add(project)
            created_projects.append(project)
        
        session.commit()
        print(f"✅ Created {len(created_projects)} projects")
        
        # Step 4: Create sample templates (public and private)
        print("\n📋 Creating sample templates...")
        
        # Public templates (official)
        public_templates_data = [
            {
                "name": "Python Data Science",
                "description": "Complete Python environment with Jupyter, pandas, numpy, scikit-learn",
                "category": "Data Science",
                "language": "Python",
                "repository_url": "https://github.com/scalebox/python-data-science",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "tags": ["python", "jupyter", "pandas", "numpy", "scikit-learn", "matplotlib"]
            },
            {
                "name": "Node.js Web Development",
                "description": "Full-stack JavaScript development environment with Express and React",
                "category": "Web Development",
                "language": "JavaScript",
                "repository_url": "https://github.com/scalebox/nodejs-web-dev",
                "min_cpu_required": 1.0,
                "min_memory_required": 2.0,
                "tags": ["nodejs", "express", "react", "javascript", "web"]
            },
            {
                "name": "Java Spring Boot",
                "description": "Enterprise Java development with Spring Boot and Maven",
                "category": "Backend Development",
                "language": "Java",
                "repository_url": "https://github.com/scalebox/java-spring-boot",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "tags": ["java", "spring", "maven", "enterprise"]
            }
        ]
        
        # Private templates (owned by the user)
        private_templates_data = [
            {
                "name": "Custom ML Pipeline",
                "description": "Personal machine learning pipeline with custom preprocessing",
                "category": "Machine Learning",
                "language": "Python",
                "repository_url": "https://github.com/wangzr/custom-ml-pipeline",
                "min_cpu_required": 4.0,
                "min_memory_required": 8.0,
                "tags": ["python", "tensorflow", "pytorch", "custom", "ml"]
            },
            {
                "name": "React Native Mobile",
                "description": "Cross-platform mobile development with React Native",
                "category": "Mobile Development",
                "language": "JavaScript",
                "repository_url": "https://github.com/wangzr/react-native-mobile",
                "min_cpu_required": 2.0,
                "min_memory_required": 4.0,
                "tags": ["react-native", "mobile", "javascript", "cross-platform"]
            }
        ]
        
        created_templates = []
        
        # Create public templates
        for template_data in public_templates_data:
            template = Template(
                template_id=generate_uuid(),
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                language=template_data["language"],
                repository_url=template_data["repository_url"],
                min_cpu_required=template_data["min_cpu_required"],
                min_memory_required=template_data["min_memory_required"],
                tags=template_data["tags"],
                is_official=True,
                is_public=True,
                owner_account_id=None  # Official templates have no owner
            )
            session.add(template)
            created_templates.append(template)
        
        # Create private templates
        for template_data in private_templates_data:
            template = Template(
                template_id=generate_uuid(),
                name=template_data["name"],
                description=template_data["description"],
                category=template_data["category"],
                language=template_data["language"],
                repository_url=template_data["repository_url"],
                min_cpu_required=template_data["min_cpu_required"],
                min_memory_required=template_data["min_memory_required"],
                tags=template_data["tags"],
                is_official=False,
                is_public=False,
                owner_account_id=target_user.account_id
            )
            session.add(template)
            created_templates.append(template)
        
        session.commit()
        print(f"✅ Created {len(created_templates)} templates ({len(public_templates_data)} public, {len(private_templates_data)} private)")
        
        # Step 5: Create sample sandboxes for the projects
        print("\n🏖️  Creating sample sandboxes...")
        
        # Get all templates for sandbox creation
        all_templates = session.query(Template).all()
        if not all_templates:
            print("❌ No templates found for sandbox creation!")
            return
        
        sandboxes_data = [
            {
                "name": "Data Analysis Environment",
                "description": "Active data science sandbox for analysis",
                "project": created_projects[1],  # Data Science Lab
                "template": all_templates[0],  # Python Data Science
                "status": "running",
                "cpu_spec": 4.0,
                "memory_spec": 8.0
            },
            {
                "name": "Web App Development",
                "description": "React frontend development sandbox",
                "project": created_projects[0],  # Web Development Project
                "template": all_templates[1],  # Node.js Web Development
                "status": "running",
                "cpu_spec": 2.0,
                "memory_spec": 4.0
            },
            {
                "name": "API Backend Testing",
                "description": "Java Spring Boot API development",
                "project": created_projects[0],  # Web Development Project
                "template": all_templates[2],  # Java Spring Boot
                "status": "stopped",
                "cpu_spec": 2.0,
                "memory_spec": 4.0
            },
            {
                "name": "Custom ML Training",
                "description": "Personal machine learning model training",
                "project": created_projects[1],  # Data Science Lab
                "template": all_templates[3],  # Custom ML Pipeline (private)
                "status": "created",
                "cpu_spec": 4.0,
                "memory_spec": 8.0
            },
            {
                "name": "Mobile App Testing",
                "description": "React Native mobile app development",
                "project": created_projects[2],  # Mobile App Development
                "template": all_templates[4],  # React Native Mobile (private)
                "status": "starting",
                "cpu_spec": 2.0,
                "memory_spec": 4.0
            }
        ]
        
        created_sandboxes = []
        for sandbox_data in sandboxes_data:
            sandbox = Sandbox(
                sandbox_id=generate_uuid(),
                name=sandbox_data["name"],
                description=sandbox_data["description"],
                template_id=sandbox_data["template"].template_id,
                owner_account_id=target_user.account_id,
                project_id=sandbox_data["project"].project_id,
                cpu_spec=sandbox_data["cpu_spec"],
                memory_spec=sandbox_data["memory_spec"],
                status=sandbox_data["status"],
                region="us-east-1",
                visibility="private",
                max_running_seconds=86400
            )
            
            session.add(sandbox)
            created_sandboxes.append(sandbox)
        
        session.commit()
        print(f"✅ Created {len(created_sandboxes)} sandboxes")
        
        # Step 6: Create sample API keys
        print("\n🔑 Creating sample API keys...")
        
        api_keys_data = [
            {
                "name": "Development API Key",
                "description": "API key for development and testing"
            },
            {
                "name": "Production API Key",
                "description": "API key for production deployments"
            }
        ]
        
        created_api_keys = []
        for key_data in api_keys_data:
            api_key = ApiKey(
                api_key=f"sbx-{generate_uuid()[:36]}",
                user_account_id=target_user.account_id,
                name=key_data["name"],
                description=key_data["description"],
                key_hash="sample_hash_for_demo",  # In real app, this would be hashed
                permissions={"sandbox": ["read", "write"], "project": ["read", "write"]},
                is_active=True
            )
            session.add(api_key)
            created_api_keys.append(api_key)
        
        session.commit()
        print(f"✅ Created {len(created_api_keys)} API keys")
        
        # Step 7: Create sample notifications
        print("\n🔔 Creating sample notifications...")
        
        notifications_data = [
            {
                "title": "Welcome to ScaleBox!",
                "message": "Your account has been successfully set up. Start creating your first sandbox!",
                "type": "success"
            },
            {
                "title": "Sandbox Started",
                "message": "Your 'Data Analysis Environment' sandbox is now running.",
                "type": "info"
            },
            {
                "title": "Resource Usage Alert",
                "message": "Your 'Web App Development' sandbox is using 80% of allocated memory.",
                "type": "warning"
            }
        ]
        
        created_notifications = []
        for notif_data in notifications_data:
            notification = Notification(
                notification_id=generate_uuid(),
                user_account_id=target_user.account_id,
                title=notif_data["title"],
                message=notif_data["message"],
                type=notif_data["type"],
                is_read=False
            )
            session.add(notification)
            created_notifications.append(notification)
        
        session.commit()
        print(f"✅ Created {len(created_notifications)} notifications")
        
        # Summary
        print("\n" + "="*50)
        print("🎉 CLEANUP AND SAMPLE DATA GENERATION COMPLETE!")
        print("="*50)
        print(f"📊 Summary:")
        print(f"   • Users: 1 (wangzr@cloudsway.com)")
        print(f"   • Projects: {len(created_projects)}")
        print(f"   • Templates: {len(created_templates)} ({len(public_templates_data)} public, {len(private_templates_data)} private)")
        print(f"   • Sandboxes: {len(created_sandboxes)}")
        print(f"   • API Keys: {len(created_api_keys)}")
        print(f"   • Notifications: {len(created_notifications)}")
        print(f"\n🔗 Account ID: {target_user.account_id}")
        print(f"📧 Email: {target_user.email}")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Error during cleanup and data generation: {e}")
        session.rollback()
        raise
    finally:
        session.close()

if __name__ == "__main__":
    cleanup_and_generate_data() 