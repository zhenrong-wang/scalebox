import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import User, Project, Sandbox, Template, Notification, ApiKey
from sqlalchemy.orm import Session

def cleanup_and_generate_sample_data():
    db: Session = SessionLocal()
    try:
        # Keep only admin and wangzr@cloudsway.com
        keep_emails = ["admin@scalebox.dev", "wangzr@cloudsway.com"]
        users_to_keep = db.query(User).filter(User.email.in_(keep_emails)).all()
        keep_ids = [u.account_id for u in users_to_keep]

        # Delete all sandboxes, projects, templates, notifications, and API keys
        db.query(Sandbox).delete()
        db.query(Project).delete()
        db.query(Template).delete()
        db.query(Notification).delete()
        db.query(ApiKey).delete()
        db.commit()

        # Delete all users except admin and wangzr@cloudsway.com
        db.query(User).filter(~User.email.in_(keep_emails)).delete(synchronize_session=False)
        db.commit()

        print("Cleanup complete. Only admin and wangzr@cloudsway.com remain.")

        # Repopulate sample data for these users
        # Create default project for each user
        for user in users_to_keep:
            from app.projects import create_default_project_for_user
            create_default_project_for_user(db, user)

        # Create sample templates
        from app.templates import create_sample_templates
        create_sample_templates(db, users_to_keep)

        # Create sample sandboxes for each user
        from app.sandboxes import create_sample_sandboxes_for_user
        for user in users_to_keep:
            create_sample_sandboxes_for_user(db, user)

        db.commit()
        print("Sample data repopulated for admin and wangzr@cloudsway.com.")
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_and_generate_sample_data() 