from datetime import timezone
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from config import settings
import uuid
import datetime
from typing import Optional
import aiosmtplib
from email.message import EmailMessage
from fastapi import BackgroundTasks
import jwt
from datetime import timedelta
import random
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from .database import get_db
from .models import User, PendingSignup
from .models import Account, Notification

router = APIRouter(tags=["users"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None

class SigninRequest(BaseModel):
    email: EmailStr
    password: str

class VerifyEmailRequest(BaseModel):
    token: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def send_verification_email(to_email: str, code: str):
    subject = "Your ScaleBox Verification Code"
    body = f"""
    Welcome to ScaleBox!\n\nYour verification code is: {code}\n\nIf you did not sign up, please ignore this email.
    """
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
        use_tls=True
    )

async def send_reset_email(to_email: str, token: str):
    reset_url = f"{settings.APP_BASE_URL}/reset-password?token={token}"
    subject = "Reset your ScaleBox password"
    body = f"""
    You requested a password reset for your ScaleBox account.\n\nReset your password by clicking the link below:\n{reset_url}\n\nIf you did not request this, please ignore this email.
    """
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)
    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
        use_tls=True
    )

SECRET_KEY = settings.JWT_SECRET
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

def create_access_token(data: dict, expires_delta: timedelta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)):
    to_encode = data.copy()
    expire = datetime.datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/signup")
def signup(data: SignupRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Check if email already exists in users
    user = db.query(User).filter(User.email == data.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    # Hash password
    hashed_password = get_password_hash(data.password)
    # Generate 6-digit verification code
    verification_code = str(random.randint(100000, 999999))
    # Set expiration time (24 hours from now)
    expires_at = datetime.datetime.now(timezone.utc) + timedelta(hours=24)
    # Check if pending signup exists
    pending = db.query(PendingSignup).filter(PendingSignup.email == data.email).first()
    if pending:
        pending.display_name = data.name  # type: ignore
        pending.verification_token = verification_code  # type: ignore
        pending.expires_at = expires_at  # type: ignore
        pending.username = data.email.split('@')[0]  # type: ignore
        pending.password_hash = hashed_password  # type: ignore
    else:
        pending = PendingSignup(
            email=data.email,
            username=data.email.split('@')[0],
            display_name=data.name,
            verification_token=verification_code,
            password_hash=hashed_password,
            expires_at=expires_at
        )
        db.add(pending)
    db.commit()
    # Send verification code in background
    background_tasks.add_task(send_verification_email, data.email, verification_code)
    return {"msg": "Signup successful. Please check your email for the verification code."}

@router.post("/signin")
def signin(data: SigninRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, getattr(user, 'password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not getattr(user, 'is_verified', False):
        raise HTTPException(status_code=403, detail="Email not verified")
    access_token = create_access_token({"sub": str(user.id), "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/verify-email")
def verify_email(data: VerifyEmailRequest, db: Session = Depends(get_db)):
    # Find pending signup by code
    pending = db.query(PendingSignup).filter(PendingSignup.verification_token == data.token).first()
    if pending is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
    # Check if user already exists
    user = db.query(User).filter(User.email == pending.email).first()
    if user is not None:
        return {"msg": "Email already verified."}
    # Create user
    new_user = User(
        email=pending.email,
        password_hash=pending.password_hash,  # Use the stored hashed password
        display_name=pending.display_name,
        is_active=True,
        is_verified=True,
        verification_token=None,
        username=pending.email.split('@')[0]  # Use email prefix as username
    )
    db.add(new_user)
    db.delete(pending)
    db.commit()
    
    # Create welcome notification for the new user
    welcome_notification = Notification(
        user_id=getattr(new_user, 'user_id', None),
        title="Welcome to ScaleBox! 🎉",
        message=f"Hello {pending.display_name or pending.email.split('@')[0]}! Welcome to ScaleBox. Your account has been successfully created and verified. You can now sign in and start using our platform. We're excited to have you on board!",
        type="info",
        related_entity_type="user",
        related_entity_id=getattr(new_user, 'user_id', None)
    )
    db.add(welcome_notification)
    db.commit()
    
    return {"msg": "Email verified successfully. You can now sign in."}

@router.post("/resend-verification")
def resend_verification(data: ResendVerificationRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if getattr(user, 'is_verified', False):
        return {"msg": "Email already verified."}
    # Generate new 6-digit code
    verification_code = str(random.randint(100000, 999999))
    setattr(user, 'verification_token', verification_code)
    db.commit()
    background_tasks.add_task(send_verification_email, data.email, verification_code)
    return {"msg": "Verification code resent. Please check your inbox."}

@router.post("/reset-password")
def reset_password(data: PasswordResetRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        return {"error": "email_not_found", "msg": "No account found with this email address."}
    now = datetime.datetime.now(timezone.utc)
    last_req = getattr(user, 'last_password_reset_request', None)
    if last_req and (now - last_req).total_seconds() < 30:
        raise HTTPException(status_code=429, detail="Please wait 30 seconds before requesting another password reset.")
    reset_token = str(uuid.uuid4())
    expiry = datetime.datetime.now(timezone.utc) + timedelta(hours=1)
    setattr(user, 'reset_token', reset_token)
    setattr(user, 'reset_token_expiry', expiry)
    setattr(user, 'last_password_reset_request', now)
    db.commit()
    background_tasks.add_task(send_reset_email, data.email, reset_token)
    return {"msg": "Password reset link has been sent to your email address."}

@router.get("/reset-password/validate/{token}")
def validate_reset_token(token: str, db: Session = Depends(get_db)):
    """Validate reset token and return user email if valid"""
    user = db.query(User).filter(User.reset_token == token).first()
    expiry = getattr(user, 'reset_token_expiry', None)
    if user is None or expiry is None or expiry < datetime.datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    return {"email": user.email, "valid": True}

@router.post("/reset-password/confirm")
def reset_password_confirm(data: PasswordResetConfirmRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == data.token).first()
    expiry = getattr(user, 'reset_token_expiry', None)
    if user is None or expiry is None or expiry < datetime.datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired reset token.")
    setattr(user, 'password_hash', get_password_hash(data.new_password))
    setattr(user, 'reset_token', None)
    setattr(user, 'reset_token_expiry', None)
    db.commit()
    return {"msg": "Password has been reset successfully. You can now sign in."}

@router.get("/me")
def get_profile(request: Request, db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get account information
    account = db.query(Account).filter(Account.account_id == user.account_id).first()
    
    # Determine the role to return
    role = "root-user" if getattr(user, 'is_root_user', False) else user.role
    
    response_data = {
        "id": user.id,
        "account_id": user.account_id,
        "username": user.username,
        "email": user.email,
        "role": role,
        "display_name": user.display_name,
        "display_name": getattr(user, 'display_name', None),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_root_user": user.is_root_user,
        "created_at": user.created_at,
        "last_login": user.last_login,
        "totalSpent": 0.0,
    }
    
    # Add account information for non-root users
    if account and not getattr(user, 'is_root_user', False):
        response_data["account_email"] = getattr(account, 'email', None)
        response_data["account_name"] = getattr(account, 'name', None)
    
    return response_data

@router.put("/me")
def update_profile(data: UpdateProfileRequest):
    # TODO: Implement update profile logic
    return {"msg": "Update profile endpoint"}

# Admin endpoints
def verify_admin_token(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()), db: Session = Depends(get_db)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or (getattr(user, 'role', None) != 'admin'):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@router.get("/admin/users")
def get_all_users(admin_user: User = Depends(verify_admin_token), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [
        {
            "account_id": user.account_id,
            "email": user.email,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
            "last_login": user.last_login,
            "name": user.display_name or user.username or user.email.split('@')[0],
            "status": "active" if user.is_active is True else "disabled",
            "currentUsage": {"projects": 0, "sandboxes": 0},
            "totalSpent": 0.0,
            "lastLoginAt": user.last_login
        }
        for user in users
    ]

@router.get("/admin/user-stats")
def get_user_stats(admin_user: User = Depends(verify_admin_token), db: Session = Depends(get_db)):
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active.is_(True)).count()
    disabled_users = db.query(User).filter(User.is_active.is_(False)).count()
    
    return {
        "totalUsers": total_users,
        "activeUsers": active_users,
        "disabledUsers": disabled_users,
        "suspendedUsers": 0,  # Not implemented yet
        "totalRevenue": 0.0   # Not implemented yet
    }

@router.put("/admin/users/{account_id}/status")
def update_user_status(
    account_id: str, 
    status: str, 
    admin_user: User = Depends(verify_admin_token), 
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.account_id == account_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if status == "active":
        setattr(user, 'is_active', True)
    elif status in ["disabled", "suspended"]:
        setattr(user, 'is_active', False)
    else:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db.commit()
    return {"msg": f"User status updated to {status}"}

@router.delete("/admin/users/{account_id}")
def delete_user(
    account_id: str, 
    admin_user: User = Depends(verify_admin_token), 
    db: Session = Depends(get_db)
):
    if account_id == admin_user.account_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    user = db.query(User).filter(User.account_id == account_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(user)
    db.commit()
    return {"msg": "User deleted successfully"}

@router.delete("/users/cleanup-failed-signup")
def cleanup_failed_signup(email: str, db: Session = Depends(get_db)):
    """Clean up failed signup attempts by deleting pending signup"""
    pending = db.query(PendingSignup).filter(PendingSignup.email == email).first()
    if pending is not None:
        db.delete(pending)
        db.commit()
    return {"msg": "Failed signup cleaned up"} 