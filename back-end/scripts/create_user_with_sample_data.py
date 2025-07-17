import os
import sys
import json
import random
import datetime
import bcrypt

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User, Project, Template, Sandbox, Base
from config import settings

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

USER_EMAIL = "wangzr@cloudsway.com"
USER_PASSWORD = "Test2022!"
USER_NAME = "Wang ZR"
USER_USERNAME = "wangzr"

def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Get user
        user = db.query(User).filter(User.email == USER_EMAIL).first()
        if not user:
            print("User does not exist. Please register the user first.")
            return

        # 2. Get projects
        projects = db.query(Project).filter(Project.owner_account_id == user.account_id).all()
        if not projects:
            print("No projects found for user. Please create projects first.")
            return
        default_project = next((p for p in projects if bool(p.is_default)), None)
        custom_projects = [p for p in projects if not bool(p.is_default)]
        if not default_project or len(custom_projects) < 3:
            print("Not enough projects for sample sandboxes. Please ensure default and 3 custom projects exist.")
            return

        # 3. Get private templates
        private_templates = db.query(Template).filter(Template.owner_account_id == user.account_id, Template.is_public == False).all()
        if len(private_templates) < 3:
            print("Not enough private templates. Please create at least 3 private templates for the user.")
            return

        # 4. Get public templates
        public_templates = db.query(Template).filter(Template.is_public == True).limit(3).all()

        # 5. Create sandboxes
        sandbox_data = [
            {"name": "Personal Blog Development", "description": "Working on my personal blog using custom template", "template": private_templates[0], "project": default_project, "status": "running", "cpu_spec": 1.0, "memory_spec": 2.0},
            {"name": "API Testing Environment", "description": "Testing API endpoints with public template", "template": public_templates[0] if public_templates else private_templates[0], "project": default_project, "status": "stopped", "cpu_spec": 1.5, "memory_spec": 3.0},
            {"name": "Frontend Dashboard", "description": "React dashboard for web development project", "template": public_templates[0] if public_templates else private_templates[0], "project": custom_projects[0], "status": "running", "cpu_spec": 1.5, "memory_spec": 3.0},
            {"name": "ML Model Training", "description": "Machine learning model training environment", "template": public_templates[1] if len(public_templates) > 1 else private_templates[1], "project": custom_projects[1], "status": "running", "cpu_spec": 2.0, "memory_spec": 6.0},
            {"name": "API Gateway Service", "description": "Custom API gateway for mobile backend", "template": private_templates[2], "project": custom_projects[2], "status": "stopped", "cpu_spec": 1.5, "memory_spec": 3.0},
        ]
        for s in sandbox_data:
            now = datetime.datetime.now(datetime.timezone.utc)
            # Avoid duplicate sandboxes by name for this user
            exists = db.query(Sandbox).filter(Sandbox.owner_account_id == user.account_id, Sandbox.name == s["name"]).first()
            if exists:
                print(f"Sandbox already exists: {s['name']}")
                continue
            sandbox = Sandbox(
                name=s["name"],
                description=s["description"],
                template_id=s["template"].template_id,
                owner_account_id=user.account_id,
                project_id=str(s["project"].project_id),
                cpu_spec=s["cpu_spec"],
                memory_spec=s["memory_spec"],
                max_running_seconds=86400,
                status=s["status"],
                created_at=now,
                updated_at=now,
                started_at=now if s["status"] == "running" else None
            )
            db.add(sandbox)
            print(f"Created sandbox: {sandbox.name} in project: {s['project'].name}")
        db.commit()
        print(f"\n✅ Successfully created sample sandboxes for user: {USER_EMAIL}")
    except Exception as e:
        print(f"Error creating sample sandboxes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main() 