#!/usr/bin/env python3
"""
Script to create sample sandboxes for a specific user
"""

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

def create_sandboxes_for_user(email, num_sandboxes=5):
    """Create sample sandboxes for a specific user by email"""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # Find the user by email
        user = db.query(User).filter(User.email == email).first()
        if not user:
            print(f"❌ User with email {email} not found.")
            return
        
        print(f"✅ Found user: {user.email} (ID: {user.id}, Account ID: {user.account_id})")
        print(f"📦 Creating {num_sandboxes} sample sandboxes...")
        
        # Create sandboxes for the specific user
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
            print(f"✅ Created sandbox: {sandbox_data['name']} ({status})")
        
        db.commit()
        print(f"🎉 Successfully created {num_sandboxes} sample sandboxes for {user.email}!")
        
        # Print summary
        user_sandboxes = db.execute(
            text("SELECT COUNT(*) FROM sandboxes WHERE user_id = :user_id"), 
            {'user_id': user.account_id}
        ).scalar()
        
        running_sandboxes = db.execute(
            text("SELECT COUNT(*) FROM sandboxes WHERE user_id = :user_id AND status = 'running'"), 
            {'user_id': user.account_id}
        ).scalar()
        
        stopped_sandboxes = db.execute(
            text("SELECT COUNT(*) FROM sandboxes WHERE user_id = :user_id AND status = 'stopped'"), 
            {'user_id': user.account_id}
        ).scalar()
        
        error_sandboxes = db.execute(
            text("SELECT COUNT(*) FROM sandboxes WHERE user_id = :user_id AND status = 'error'"), 
            {'user_id': user.account_id}
        ).scalar()
        
        print(f"\n📊 Summary for {user.email}:")
        print(f"  Total sandboxes: {user_sandboxes}")
        print(f"  Running: {running_sandboxes}")
        print(f"  Stopped: {stopped_sandboxes}")
        print(f"  Error: {error_sandboxes}")
        
    except Exception as e:
        print(f"❌ Error creating sample sandboxes: {e}")
        db.rollback()
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    # Create sandboxes for the specific user
    user_email = "495458966@qq.com"
    num_sandboxes = 10  # Create 10 more sandboxes
    
    print(f"🚀 Creating {num_sandboxes} sample sandboxes for user: {user_email}")
    create_sandboxes_for_user(user_email, num_sandboxes)
    print("✨ Done!") 