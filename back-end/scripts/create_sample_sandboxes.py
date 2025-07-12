import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models import User, Base
from config import settings
import datetime
import random
import uuid

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Sample data
frameworks = ["React", "Vue", "Angular", "Node.js", "Python", "Next.js", "Django", "Flask", "Express", "Laravel"]
regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"]
statuses = ["running", "stopped", "error"]
visibilities = ["public", "private"]

def create_sample_sandboxes():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Get all users
        users = db.query(User).all()
        if not users:
            print("No users found. Please create users first.")
            return
        
        print(f"Found {len(users)} users. Creating sample sandboxes...")
        
        # Create sample sandboxes for each user
        for user in users:
            # Create 2-5 sandboxes per user
            num_sandboxes = random.randint(2, 5)
            
            for i in range(num_sandboxes):
                # Random data
                framework = random.choice(frameworks)
                region = random.choice(regions)
                status = random.choice(statuses)
                visibility = random.choice(visibilities)
                
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
                    'id': str(uuid.uuid4()),
                    'name': f"{framework} Development Environment {i+1}",
                    'description': f"Sample {framework} development environment for {user.email}",
                    'framework': framework,
                    'status': status,
                    'user_id': user.account_id,
                    'region': region,
                    'visibility': visibility,
                    'project_id': None,
                    'cpu_usage': cpu_usage,
                    'memory_usage': memory_usage,
                    'storage_usage': storage_usage,
                    'bandwidth_usage': bandwidth_usage,
                    'hourly_rate': hourly_rate,
                    'total_cost': total_cost,
                    'created_at': created_at,
                    'updated_at': updated_at,
                    'last_accessed_at': last_accessed_at,
                    'started_at': started_at
                }
                
                # Insert using raw SQL to match database schema
                insert_sql = text("""
                INSERT INTO sandboxes (
                    id, name, description, framework, status, user_id, region, visibility, project_id,
                    cpu_usage, memory_usage, storage_usage, bandwidth_usage, hourly_rate, total_cost,
                    created_at, updated_at, last_accessed_at, started_at
                ) VALUES (
                    :id, :name, :description, :framework, :status, :user_id, :region, :visibility, :project_id,
                    :cpu_usage, :memory_usage, :storage_usage, :bandwidth_usage, :hourly_rate, :total_cost,
                    :created_at, :updated_at, :last_accessed_at, :started_at
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
        error_sandboxes = db.execute(text("SELECT COUNT(*) FROM sandboxes WHERE status = 'error'")).scalar()
        
        print(f"\nSummary:")
        print(f"Total sandboxes: {total_sandboxes}")
        print(f"Running: {running_sandboxes}")
        print(f"Stopped: {stopped_sandboxes}")
        print(f"Error: {error_sandboxes}")
        
    except Exception as e:
        print(f"Error creating sample sandboxes: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_sample_sandboxes() 