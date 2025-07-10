import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.sandboxes import Sandbox, SandboxStatus, SandboxVisibility
from app.users import User, Base
from config import settings
import datetime
import random

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Sample data
frameworks = ["React", "Vue", "Angular", "Node.js", "Python", "Next.js", "Django", "Flask", "Express", "Laravel"]
regions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1", "ap-northeast-1"]
statuses = [SandboxStatus.RUNNING, SandboxStatus.STOPPED, SandboxStatus.ERROR]
visibilities = [SandboxVisibility.PUBLIC, SandboxVisibility.PRIVATE]

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
                cpu_usage = random.uniform(0, 100) if status == SandboxStatus.RUNNING else 0
                memory_usage = random.uniform(0, 100) if status == SandboxStatus.RUNNING else 0
                storage_usage = random.uniform(0.1, 10.0)
                bandwidth_usage = random.uniform(0.1, 5.0)
                
                # Cost calculation
                hourly_rate = random.uniform(0.1, 0.5)
                total_cost = random.uniform(0, 100)
                
                # Timestamps
                created_at = datetime.datetime.utcnow() - datetime.timedelta(days=random.randint(1, 30))
                updated_at = created_at + datetime.timedelta(hours=random.randint(1, 24))
                last_accessed_at = updated_at if status == SandboxStatus.RUNNING else None
                started_at = created_at + datetime.timedelta(minutes=random.randint(5, 60)) if status == SandboxStatus.RUNNING else None
                
                sandbox = Sandbox(
                    name=f"{framework} Development Environment {i+1}",
                    description=f"Sample {framework} development environment for {user.email}",
                    framework=framework,
                    status=status,
                    user_id=user.account_id,
                    region=region,
                    visibility=visibility,
                    project_id=None,  # No projects for now
                    cpu_usage=cpu_usage,
                    memory_usage=memory_usage,
                    storage_usage=storage_usage,
                    bandwidth_usage=bandwidth_usage,
                    hourly_rate=hourly_rate,
                    total_cost=total_cost,
                    created_at=created_at,
                    updated_at=updated_at,
                    last_accessed_at=last_accessed_at,
                    started_at=started_at
                )
                
                db.add(sandbox)
                print(f"Created sandbox: {sandbox.name} for user {user.email}")
        
        db.commit()
        print("Sample sandboxes created successfully!")
        
        # Print summary
        total_sandboxes = db.query(Sandbox).count()
        running_sandboxes = db.query(Sandbox).filter(Sandbox.status == SandboxStatus.RUNNING).count()
        stopped_sandboxes = db.query(Sandbox).filter(Sandbox.status == SandboxStatus.STOPPED).count()
        error_sandboxes = db.query(Sandbox).filter(Sandbox.status == SandboxStatus.ERROR).count()
        
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