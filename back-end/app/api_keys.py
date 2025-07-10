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
from users import User, verify_admin_token, get_db

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
    permissions: Optional[Dict[str, Any]] = None
    expires_in_days: Optional[int] = None

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v) > 255:
            raise ValueError('Name too long')
        return v.strip()

class UpdateApiKeyRequest(BaseModel):
    name: Optional[str] = None
    permissions: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class ApiKeyResponse(BaseModel):
    id: int
    key_id: str
    name: str
    prefix: str
    permissions: Optional[Dict[str, Any]]
    is_active: bool
    expires_at: Optional[datetime.datetime]
    last_used_at: Optional[datetime.datetime]
    created_at: datetime.datetime

class ApiKeyUsageResponse(BaseModel):
    id: int
    endpoint: str
    method: str
    status_code: int
    response_time_ms: Optional[int]
    ip_address: Optional[str]
    created_at: datetime.datetime

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

# API Endpoints
@router.post("/", response_model=Dict[str, str])
def create_api_key(
    request: CreateApiKeyRequest,
    current_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Create a new API key"""
    # Generate the API key
    full_key, key_hash, prefix = generate_api_key()
    
    # Calculate expiration
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.datetime.utcnow() + timedelta(days=request.expires_in_days)
    
    # Create the API key record
    api_key = ApiKey(
        key_id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=request.name,
        key_hash=key_hash,
        prefix=prefix,
        permissions=request.permissions or {},
        expires_at=expires_at
    )
    
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    
    # Return the full key only once
    return {
        "message": "API key created successfully",
        "api_key": full_key,
        "key_id": api_key.key_id,
        "prefix": prefix,
        "expires_at": expires_at.isoformat() if expires_at else None
    }

@router.get("/", response_model=List[ApiKeyResponse])
def list_api_keys(
    current_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """List all API keys for the current user"""
    api_keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).all()
    return api_keys

@router.get("/{key_id}", response_model=ApiKeyResponse)
def get_api_key(
    key_id: str,
    current_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get a specific API key"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return api_key

@router.put("/{key_id}", response_model=ApiKeyResponse)
def update_api_key(
    key_id: str,
    request: UpdateApiKeyRequest,
    current_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Update an API key"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Update fields
    if request.name is not None:
        setattr(api_key, 'name', request.name)
    if request.permissions is not None:
        setattr(api_key, 'permissions', request.permissions)
    if request.is_active is not None:
        setattr(api_key, 'is_active', request.is_active)
    
    db.commit()
    db.refresh(api_key)
    return api_key

@router.delete("/{key_id}")
def delete_api_key(
    key_id: str,
    current_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Delete an API key"""
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
    current_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get usage statistics for an API key"""
    # First get the API key to verify ownership
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Get usage data
    usage = db.query(ApiKeyUsage).filter(
        ApiKeyUsage.api_key_id == api_key.id
    ).order_by(ApiKeyUsage.created_at.desc()).limit(limit).all()
    
    return usage

# Admin endpoints
@router.get("/admin/all", response_model=List[ApiKeyResponse])
def get_all_api_keys(
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get all API keys (admin only)"""
    api_keys = db.query(ApiKey).all()
    return api_keys

@router.get("/admin/stats")
def get_api_key_stats(
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get API key statistics (admin only)"""
    total_keys = db.query(ApiKey).count()
    active_keys = db.query(ApiKey).filter(ApiKey.is_active.is_(True)).count()
    expired_keys = db.query(ApiKey).filter(
        ApiKey.expires_at < datetime.datetime.utcnow()
    ).count()
    
    # Get usage in last 30 days
    thirty_days_ago = datetime.datetime.utcnow() - timedelta(days=30)
    recent_usage = db.query(ApiKeyUsage).filter(
        ApiKeyUsage.created_at >= thirty_days_ago
    ).count()
    
    return {
        "total_keys": total_keys,
        "active_keys": active_keys,
        "expired_keys": expired_keys,
        "usage_last_30_days": recent_usage
    } 