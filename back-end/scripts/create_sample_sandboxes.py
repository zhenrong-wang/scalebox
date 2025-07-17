import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import User, Template, Base
from config import settings
import datetime
import random
import uuid

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Sample data
statuses = ["starting", "running", "stopped", "timeout", "archived"]

def create_sample_sandboxes():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Get all users
        users = db.query(User).all()
        if not users:
            print("No users found. Please create users first.")
            return
        
        # Get all templates
        templates = db.query(Template).all()
        if not templates:
            print("No templates found. Please create templates first.")
            return
        
        print(f"Found {len(users)} users and {len(templates)} templates. Creating sample sandboxes...")
        
        # Create sample sandboxes for each user
        for user in users:
            # Create 2-5 sandboxes per user
            num_sandboxes = random.randint(2, 5)
            
            for i in range(num_sandboxes):
                # Random data
                template = random.choice(templates)
                status = random.choice(statuses)
                
                # Random resource usage
                cpu_usage = random.uniform(0, 100) if status == "running" else 0
                memory_usage = random.uniform(0, 100) if status == "running" else 0
                storage_usage = random.uniform(0.1, 10.0)
                bandwidth_usage = random.uniform(0.1, 5.0)
                
                # Cost calculation
                hourly_rate = random.uniform(0.1, 0.5)
                total_cost = random.uniform(0, 100)
                
                # Timestamps
                created_at = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=random.randint(1, 30))
                updated_at = created_at + datetime.timedelta(hours=random.randint(1, 24))
                last_accessed_at = updated_at if status == "running" else None
                started_at = created_at + datetime.timedelta(minutes=random.randint(5, 60)) if status == "running" else None
                
                # Use raw SQL to insert with the correct schema
                sandbox_data = {
                    'sandbox_id': str(uuid.uuid4()),
                    'name': f"{template.name} Development Environment {i+1}",
                    'description': f"Sample {template.name} development environment for {user.email}",
                    'template_id': template.template_id,
                    'owner_account_id': user.account_id,
                    'project_id': None,
                    'cpu_spec': template.min_cpu_required,
                    'memory_spec': template.min_memory_required,
                    'max_running_seconds': 86400,
                    'status': status,
                    'latest_snapshot_id': None,
                    'snapshot_expires_at': None,
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'started_at': started_at,
                    'stopped_at': None,
                    'timeout_at': None,
                    'recycled_at': None
                }
                
                # Insert using raw SQL to match database schema
                insert_sql = text("""
                INSERT INTO sandboxes (
                    sandbox_id, name, description, template_id, owner_account_id, project_id,
                    cpu_spec, memory_spec, max_running_seconds, status,
                    latest_snapshot_id, snapshot_expires_at, created_at, updated_at, started_at,
                    stopped_at, timeout_at, recycled_at
                ) VALUES (
                    :sandbox_id, :name, :description, :template_id, :owner_account_id, :project_id,
                    :cpu_spec, :memory_spec, :max_running_seconds, :status,
                    :latest_snapshot_id, :snapshot_expires_at, :created_at, :updated_at, :started_at,
                    :stopped_at, :timeout_at, :recycled_at
                )
                """)
                
                db.execute(insert_sql, sandbox_data)
                print(f"Created sandbox: {sandbox_data['name']} for user {user.email}")
        
        db.commit()
        print("Sample sandboxes created successfully!")
        
        # Print summary
        total_sandboxes = db.execute(text("SELECT COUNT(*) FROM sandboxes")).scalar()
        running_sandboxes = db.execute(text("SELECT COUNT(*) FROM sandboxes WHERE status = 'running'")).scalar()
        stopped_sandboxes = db.execute(text("SELECT COUNT(*) FROM sandboxes WHERE status = 'stopped'")).scalar()
        archived_sandboxes = db.execute(text("SELECT COUNT(*) FROM sandboxes WHERE status = 'archived'")).scalar()
        
        print(f"\nSummary:")
        print(f"Total sandboxes: {total_sandboxes}")
        print(f"Running: {running_sandboxes}")
        print(f"Stopped: {stopped_sandboxes}")
        print(f"Archived: {archived_sandboxes}")
        
    except Exception as e:
        print(f"Error creating sample sandboxes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_sandboxes() 