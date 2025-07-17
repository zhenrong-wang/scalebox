import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.database import SessionLocal
from app.models import Template, Sandbox, User

def check_data():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users:")
        for user in users:
            print(f"  - ID: {user.id}, Account ID: {user.account_id}, Email: {user.email}")
        
        templates = db.query(Template).all()
        print(f"\nFound {len(templates)} templates:")
        for template in templates:
            print(f"  - {template.template_id}: {template.name}")
        
        print("\nSandboxes:")
        sandboxes = db.query(Sandbox).all()
        print(f"Found {len(sandboxes)} sandboxes:")
        for sandbox in sandboxes:
            print(f"  - {sandbox.sandbox_id}: {sandbox.name} (owner: {sandbox.owner_account_id}, template: {sandbox.template_id})")
    finally:
        db.close()

if __name__ == "__main__":
    check_data() 