import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from pydantic import BaseModel, validator
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, func, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from passlib.context import CryptContext
from config import settings
import uuid
import datetime
from typing import Optional, List, Dict, Any
import secrets
import hashlib
import json
from datetime import timedelta
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from .users import User, verify_admin_token, get_db
import aiosmtplib
from email.message import EmailMessage

router = APIRouter(prefix="/api-keys", tags=["api-keys"])

# Database setup
DATABASE_URL = f"mysql+pymysql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class ApiKey(Base):
    __tablename__ = "api_keys"
    id = Column(Integer, primary_key=True, index=True)
    key_id = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    key_hash = Column(String(255), nullable=False)
    prefix = Column(String(16), nullable=False)
    permissions = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

class ApiKeyUsage(Base):
    __tablename__ = "api_key_usage"
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, nullable=False)
    endpoint = Column(String(255), nullable=False)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    request_size_bytes = Column(Integer, nullable=True)
    response_size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now())

class ApiRateLimit(Base):
    __tablename__ = "api_rate_limits"
    id = Column(Integer, primary_key=True, index=True)
    api_key_id = Column(Integer, nullable=False)
    window_start = Column(DateTime, nullable=False)
    request_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Pydantic models
class CreateApiKeyRequest(BaseModel):
    name: str
    can_write: bool = True  # Default to R&W permissions

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v) > 255:
            raise ValueError('Name too long')
        return v.strip()

class UpdateApiKeyRequest(BaseModel):
    name: Optional[str] = None
    can_write: Optional[bool] = None

class ApiKeyResponse(BaseModel):
    id: int
    key_id: str
    name: str
    prefix: str
    permissions: Dict[str, bool]
    is_active: bool
    expires_at: Optional[datetime.datetime]
    last_used_at: Optional[datetime.datetime]
    created_at: datetime.datetime
    user_email: Optional[str] = None  # For admin view

class ApiKeyUsageResponse(BaseModel):
    id: int
    endpoint: str
    method: str
    status_code: int
    response_time_ms: Optional[int]
    ip_address: Optional[str]
    created_at: datetime.datetime

class AdminApiKeyAction(BaseModel):
    action: str  # "disable" or "delete"
    reason: Optional[str] = None

# Utility functions
def generate_api_key() -> tuple[str, str, str]:
    """Generate a secure API key and return (full_key, key_hash, prefix)"""
    # Generate a secure random key
    full_key = f"sk-{secrets.token_urlsafe(32)}"
    
    # Create hash for storage
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    
    # Create prefix for display
    prefix = full_key[:16]
    
    return full_key, key_hash, prefix

def verify_api_key(api_key: str, stored_hash: str) -> bool:
    """Verify an API key against its stored hash"""
    return hashlib.sha256(api_key.encode()).hexdigest() == stored_hash

def get_api_key_from_header(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> str:
    """Extract API key from Authorization header"""
    return credentials.credentials

def get_api_key_user(api_key: str = Depends(get_api_key_from_header), db: Session = Depends(get_db)) -> User:
    """Get user from API key"""
    # Find the API key
    db_api_key = db.query(ApiKey).filter(
        ApiKey.key_hash == hashlib.sha256(api_key.encode()).hexdigest(),
        ApiKey.is_active.is_(True)
    ).first()
    
    if not db_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Check if expired
    expires_at = getattr(db_api_key, 'expires_at', None)
    if expires_at and expires_at < datetime.datetime.utcnow():
        raise HTTPException(status_code=401, detail="API key expired")
    
    # Get user
    user = db.query(User).filter(User.id == db_api_key.user_id).first()
    if not user or not getattr(user, 'is_active', False):
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    # Update last used timestamp
    setattr(db_api_key, 'last_used_at', datetime.datetime.utcnow())
    db.commit()
    
    return user

def log_api_usage(
    api_key_id: int,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_size_bytes: Optional[int] = None,
    response_size_bytes: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Log API usage for analytics"""
    usage = ApiKeyUsage(
        api_key_id=api_key_id,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        response_time_ms=response_time_ms,
        ip_address=ip_address,
        user_agent=user_agent,
        request_size_bytes=request_size_bytes,
        response_size_bytes=response_size_bytes
    )
    db.add(usage)
    db.commit()

async def send_admin_action_notification(user_email: str, action: str, key_name: str, reason: Optional[str] = None):
    """Send notification email to user when admin takes action on their API key"""
    subject = f"Your ScaleBox API Key has been {action}"
    body = f"""
    Hello,

    Your API key "{key_name}" has been {action} by an administrator.
    
    {f"Reason: {reason}" if reason else ""}
    
    If you have any questions or concerns, please contact the administrator.
    
    Best regards,
    ScaleBox Team
    """
    
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = user_email
    msg["Subject"] = subject
    msg.set_content(body)
    
    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            use_tls=True
        )
    except Exception as e:
        print(f"Failed to send notification email: {e}")

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()), db: Session = Depends(get_db)) -> User:
    """Get current user from JWT token"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = int(payload.get("sub"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# API Endpoints
@router.post("/", response_model=Dict[str, str])
def create_api_key(
    request: CreateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new API key for the current user"""
    # Check if user has reached the 5-key limit
    existing_keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).count()
    if existing_keys >= 5:
        raise HTTPException(
            status_code=400, 
            detail="Maximum of 5 API keys allowed per account. Please delete an existing key first."
        )
    
    # Generate the API key
    full_key, key_hash, prefix = generate_api_key()
    
    # Set permissions (read is always true, write is configurable)
    permissions = {
        "read": True,
        "write": request.can_write
    }
    
    # Create the API key record
    api_key = ApiKey(
        key_id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=request.name,
        key_hash=key_hash,
        prefix=prefix,
        permissions=permissions,
        is_active=True
    )
    
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    return {
        "message": "API key created successfully",
        "api_key": full_key,
        "key_id": api_key.key_id,
        "prefix": prefix
    }

@router.get("/", response_model=List[ApiKeyResponse])
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List API keys for the current user"""
    api_keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).all()
    return [
        ApiKeyResponse(
            id=getattr(key, 'id'),
            key_id=getattr(key, 'key_id'),
            name=getattr(key, 'name'),
            prefix=getattr(key, 'prefix'),
            permissions=getattr(key, 'permissions') or {"read": True, "write": True},
            is_active=getattr(key, 'is_active'),
            expires_at=getattr(key, 'expires_at'),
            last_used_at=getattr(key, 'last_used_at'),
            created_at=getattr(key, 'created_at')
        )
        for key in api_keys
    ]

@router.get("/{key_id}", response_model=ApiKeyResponse)
def get_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific API key for the current user"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return ApiKeyResponse(
        id=getattr(api_key, 'id'),
        key_id=getattr(api_key, 'key_id'),
        name=getattr(api_key, 'name'),
        prefix=getattr(api_key, 'prefix'),
        permissions=getattr(api_key, 'permissions') or {"read": True, "write": True},
        is_active=getattr(api_key, 'is_active'),
        expires_at=getattr(api_key, 'expires_at'),
        last_used_at=getattr(api_key, 'last_used_at'),
        created_at=getattr(api_key, 'created_at')
    )

@router.put("/{key_id}", response_model=ApiKeyResponse)
def update_api_key(
    key_id: str,
    request: UpdateApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an API key for the current user"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Update fields
    if request.name is not None:
        setattr(api_key, 'name', request.name)
    
    if request.can_write is not None:
        # Ensure read permission is always true
        setattr(api_key, 'permissions', {
            "read": True,
            "write": request.can_write
        })
    
    db.commit()
    db.refresh(api_key)
    
    return ApiKeyResponse(
        id=getattr(api_key, 'id'),
        key_id=getattr(api_key, 'key_id'),
        name=getattr(api_key, 'name'),
        prefix=getattr(api_key, 'prefix'),
        permissions=getattr(api_key, 'permissions') or {"read": True, "write": True},
        is_active=getattr(api_key, 'is_active'),
        expires_at=getattr(api_key, 'expires_at'),
        last_used_at=getattr(api_key, 'last_used_at'),
        created_at=getattr(api_key, 'created_at')
    )

@router.delete("/{key_id}")
def delete_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an API key for the current user"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    db.delete(api_key)
    db.commit()
    
    return {"message": "API key deleted successfully"}

@router.get("/{key_id}/usage", response_model=List[ApiKeyUsageResponse])
def get_api_key_usage(
    key_id: str,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get usage history for an API key"""
    # Verify the API key belongs to the current user
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    usage = db.query(ApiKeyUsage).filter(
        ApiKeyUsage.api_key_id == api_key.id
    ).order_by(ApiKeyUsage.created_at.desc()).limit(limit).all()
    
    return [
        ApiKeyUsageResponse(
            id=getattr(u, 'id'),
            endpoint=getattr(u, 'endpoint'),
            method=getattr(u, 'method'),
            status_code=getattr(u, 'status_code'),
            response_time_ms=getattr(u, 'response_time_ms'),
            ip_address=getattr(u, 'ip_address'),
            created_at=getattr(u, 'created_at')
        )
        for u in usage
    ]

# Admin endpoints
@router.get("/admin/all", response_model=List[ApiKeyResponse])
def get_all_api_keys(
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get all API keys (admin only)"""
    api_keys = db.query(ApiKey).all()
    
    # Get user emails for display
    user_emails = {}
    user_ids = list(set(key.user_id for key in api_keys))
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    for user in users:
        user_emails[user.id] = user.email
    
    return [
        ApiKeyResponse(
            id=getattr(key, 'id'),
            key_id=getattr(key, 'key_id'),
            name=getattr(key, 'name'),
            prefix=getattr(key, 'prefix'),
            permissions=getattr(key, 'permissions') or {"read": True, "write": True},
            is_active=getattr(key, 'is_active'),
            expires_at=getattr(key, 'expires_at'),
            last_used_at=getattr(key, 'last_used_at'),
            created_at=getattr(key, 'created_at'),
            user_email=user_emails.get(getattr(key, 'user_id'))
        )
        for key in api_keys
    ]

@router.get("/admin/stats")
def get_api_key_stats(
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get API key statistics (admin only)"""
    total_keys = db.query(ApiKey).count()
    active_keys = db.query(ApiKey).filter(ApiKey.is_active.is_(True)).count()
    expired_keys = db.query(ApiKey).filter(
        ApiKey.expires_at.isnot(None),
        ApiKey.expires_at < datetime.datetime.utcnow()
    ).count()
    
    # Get usage in last 30 days
    thirty_days_ago = datetime.datetime.utcnow() - timedelta(days=30)
    usage_last_30_days = db.query(ApiKeyUsage).filter(
        ApiKeyUsage.created_at >= thirty_days_ago
    ).count()
    
    return {
        "total_keys": total_keys,
        "active_keys": active_keys,
        "expired_keys": expired_keys,
        "usage_last_30_days": usage_last_30_days
    }

@router.post("/admin/{key_id}/action")
async def admin_api_key_action(
    key_id: str,
    action_request: AdminApiKeyAction,
    background_tasks: BackgroundTasks,
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Admin action on API key (disable/delete) with notification"""
    api_key = db.query(ApiKey).filter(ApiKey.key_id == key_id).first()
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Get the user who owns this key
    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Key owner not found")
    
    if action_request.action == "disable":
        setattr(api_key, 'is_active', False)
        db.commit()
        message = "API key disabled successfully"
    elif action_request.action == "delete":
        db.delete(api_key)
        db.commit()
        message = "API key deleted successfully"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'disable' or 'delete'")
    
    # Send notification email to the user
    background_tasks.add_task(
        send_admin_action_notification,
        getattr(user, 'email'),
        action_request.action,
        getattr(api_key, 'name'),
        action_request.reason
    )
    
    return {"message": message} 