import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import User
from config import settings

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if __name__ == "__main__":
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"Found {len(users)} users:")
        print("-" * 80)
        for user in users:
            print(f"ID: {user.id}")
            print(f"Account ID: {user.account_id}")
            print(f"Email: {user.email}")
            print(f"Username: {user.username}")
            print(f"Full Name: {user.full_name}")
            print(f"Role: {user.role}")
            print(f"Active: {user.is_active}")
            print(f"Verified: {user.is_verified}")
            print("-" * 80)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()
    print("Done.") 