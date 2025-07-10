import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.users import User, Base, get_password_hash
from config import settings

DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

ADMIN_EMAIL = "admin@scalebox.dev"
ADMIN_PASSWORD = "Admin123!"
ADMIN_NAME = "ScaleBox Admin"
ADMIN_USERNAME = "admin"

if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == ADMIN_EMAIL).first()
        if user:
            user.password_hash = get_password_hash(ADMIN_PASSWORD) # type: ignore
            user.role = "admin" # type: ignore
            user.is_verified = True # type: ignore
            user.full_name = ADMIN_NAME # type: ignore
            user.username = ADMIN_USERNAME # type: ignore
            print(f"Updated existing admin user: {ADMIN_EMAIL}")
        else:
            new_user = User(
                email=ADMIN_EMAIL,
                password_hash=get_password_hash(ADMIN_PASSWORD),
                full_name=ADMIN_NAME,
                username=ADMIN_USERNAME,
                role="admin",
                is_active=True,
                is_verified=True
            )
            db.add(new_user)
            print(f"Created new admin user: {ADMIN_EMAIL}")
        db.commit()
    finally:
        db.close()
    print("Done.") 