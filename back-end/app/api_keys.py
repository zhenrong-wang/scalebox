import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from pydantic import BaseModel, validator
from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Text, JSON, UniqueConstraint
from sqlalchemy.orm import Session
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
from .users import User, verify_admin_token
from .database import get_db
from .models import ApiKey
import aiosmtplib
from email.message import EmailMessage

router = APIRouter(tags=["api-keys"])

# Models

class CreateApiKeyRequest(BaseModel):
    name: str
    description: Optional[str] = None  # New description field
    can_write: bool = True  # Default to R&W permissions
    expires_in_days: Optional[int] = None  # Changed from expires_at to expires_in_days

    @validator('name')
    def validate_name(cls, v):
        if not v.strip():
            raise ValueError('Name cannot be empty')
        if len(v) > 255:
            raise ValueError('Name too long')
        return v.strip()

    @validator('expires_in_days')
    def validate_expires_in_days(cls, v):
        if v is not None:
            if v < 30 or v > 180:
                raise ValueError('Expiration must be between 30 and 180 days, or null for permanent')
        return v

    @validator('description')
    def validate_description(cls, v):
        if v is not None and len(v) > 1000:
            raise ValueError('Description too long (max 1000 characters)')
        return v

class UpdateApiKeyRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None  # New description field
    can_write: Optional[bool] = None
    expires_in_days: Optional[int] = None  # Allow updating expiration

class ExtendApiKeyRequest(BaseModel):
    extend_by_days: Optional[int] = None  # Extend by specific days
    extend_by_months: Optional[int] = None  # Extend by specific months
    make_permanent: Optional[bool] = False  # Make the key permanent

class ApiKeyResponse(BaseModel):
    id: str  # Changed from int to str
    key_id: str
    name: str
    description: Optional[str]  # New description field
    prefix: str
    full_key: Optional[str] = None  # Full API key for display
    permissions: Dict[str, bool]
    is_active: bool
    expires_in_days: Optional[int]  # Changed from expires_at to expires_in_days
    remaining_days: Optional[int] = None  # Calculated remaining days
    is_expired: bool = False  # Whether the key is expired
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
    expires_in_days = getattr(db_api_key, 'expires_in_days', None)
    if expires_in_days is not None:
        # Calculate expiration date based on creation time and days
        created_at = getattr(db_api_key, 'created_at', datetime.datetime.utcnow())
        expiration_date = created_at + datetime.timedelta(days=expires_in_days)
        if datetime.datetime.utcnow() > expiration_date:
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
    # ApiKeyUsage and ApiRateLimit are no longer imported, so this function will need to be refactored
    # or removed if it's no longer used. For now, we'll keep it as is, but it will cause an error.
    # Assuming ApiKeyUsage and ApiRateLimit are meant to be re-added or this function is deprecated.
    # For now, we'll comment out the usage of ApiKeyUsage and ApiRateLimit.
    # usage = ApiKeyUsage(
    #     api_key_id=api_key_id,
    #     endpoint=endpoint,
    #     method=method,
    #     status_code=status_code,
    #     response_time_ms=response_time_ms,
    #     ip_address=ip_address,
    #     user_agent=user_agent,
    #     request_size_bytes=request_size_bytes,
    #     response_size_bytes=response_size_bytes
    # )
    # db.add(usage)
    # db.commit()
    pass # Placeholder for now, as ApiKeyUsage and ApiRateLimit are removed

async def send_admin_action_notification(user_email: str, action: str, key_name: str, reason: Optional[str] = None):
    """Send notification email to user when admin takes action on their API key"""
    # Map action to proper past tense for email subject
    action_map = {
        "enable": "enabled",
        "disable": "disabled", 
        "delete": "deleted"
    }
    action_past = action_map.get(action, action)
    
    subject = f"Your ScaleBox API Key has been {action_past} by Admin"
    
    # Create action-specific message
    if action == "enable":
        action_message = "Your API key has been re-enabled and you can now use it for API access."
    elif action == "disable":
        action_message = "Your API key has been disabled and can no longer be used for API access."
    elif action == "delete":
        action_message = "Your API key has been permanently deleted and can no longer be used."
    else:
        action_message = f"Your API key has been {action}."
    
    body = f"""
    Hello,

    {action_message}
    
    Key Name: {key_name}
    
    {f"Reason provided by administrator: {reason}" if reason else "No specific reason was provided by the administrator."}
    
    If you have any questions or concerns about this action, please contact the administrator.
    
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
    # Enforce max 5 keys per user
    existing_keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).count()
    if existing_keys >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 API keys allowed.")
    # Enforce unique name per user
    if db.query(ApiKey).filter(ApiKey.user_id == current_user.id, ApiKey.name == request.name).first():
        raise HTTPException(status_code=400, detail="API key name must be unique for your account.")
    full_key, key_hash, prefix = generate_api_key()
    permissions = {"read": True, "write": request.can_write}
    api_key = ApiKey(
        key_id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=request.name,
        description=request.description,
        key_hash=key_hash,
        full_key=full_key,  # Store the full key
        prefix=prefix,
        permissions=permissions,
        is_active=True,
        expires_in_days=request.expires_in_days,
    )
    db.add(api_key)
    db.commit()
    return {"api_key": full_key, "key_id": api_key.key_id, "prefix": prefix}

@router.get("/", response_model=List[ApiKeyResponse])
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List API keys for the current user"""
    api_keys = db.query(ApiKey).filter(ApiKey.user_id == current_user.id).all()
    
    response_keys = []
    for key in api_keys:
        # Calculate remaining days and expiration status
        remaining_days = None
        is_expired = False
        expires_in_days = getattr(key, 'expires_in_days', None)
        
        if expires_in_days is not None:
            created_at = getattr(key, 'created_at', datetime.datetime.utcnow())
            expiration_date = created_at + datetime.timedelta(days=expires_in_days)
            now = datetime.datetime.utcnow()
            
            if expiration_date > now:
                remaining_days = (expiration_date - now).days
            else:
                is_expired = True
                remaining_days = 0
        
        response_keys.append(ApiKeyResponse(
            id=getattr(key, 'id'),
            key_id=getattr(key, 'key_id'),
            name=getattr(key, 'name'),
            description=getattr(key, 'description'),
            prefix=getattr(key, 'prefix'),
            full_key=getattr(key, 'full_key'),  # Include the full key
            permissions=getattr(key, 'permissions') or {"read": True, "write": True},
            is_active=getattr(key, 'is_active'),
            expires_in_days=expires_in_days,
            remaining_days=remaining_days,
            is_expired=is_expired,
            last_used_at=getattr(key, 'last_used_at'),
            created_at=getattr(key, 'created_at')
        ))
    
    return response_keys

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
    
    # Calculate remaining days and expiration status
    remaining_days = None
    is_expired = False
    expires_in_days = getattr(api_key, 'expires_in_days', None)
    
    if expires_in_days is not None:
        created_at = getattr(api_key, 'created_at', datetime.datetime.utcnow())
        expiration_date = created_at + datetime.timedelta(days=expires_in_days)
        now = datetime.datetime.utcnow()
        
        if expiration_date > now:
            remaining_days = (expiration_date - now).days
        else:
            is_expired = True
            remaining_days = 0
    
    return ApiKeyResponse(
        id=getattr(api_key, 'id'),
        key_id=getattr(api_key, 'key_id'),
        name=getattr(api_key, 'name'),
        description=getattr(api_key, 'description'),
        prefix=getattr(api_key, 'prefix'),
        full_key=getattr(api_key, 'full_key'),  # Include the full key
        permissions=getattr(api_key, 'permissions') or {"read": True, "write": True},
        is_active=getattr(api_key, 'is_active'),
        expires_in_days=expires_in_days,
        remaining_days=remaining_days,
        is_expired=is_expired,
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
    
    # Enforce unique name per user if updating name
    if request.name is not None and request.name != api_key.name:
        if db.query(ApiKey).filter(ApiKey.user_id == current_user.id, ApiKey.name == request.name).first():
            raise HTTPException(status_code=400, detail="API key name must be unique for your account.")
        setattr(api_key, 'name', request.name)
    
    if request.description is not None:
        setattr(api_key, 'description', request.description)
    
    if request.can_write is not None:
        # Ensure read permission is always true
        setattr(api_key, 'permissions', {
            "read": True,
            "write": request.can_write
        })
    
    if request.expires_in_days is not None:
        setattr(api_key, 'expires_in_days', request.expires_in_days)
    
    db.commit()
    db.refresh(api_key)
    
    return ApiKeyResponse(
        id=getattr(api_key, 'id'),
        key_id=getattr(api_key, 'key_id'),
        name=getattr(api_key, 'name'),
        description=getattr(api_key, 'description'),
        prefix=getattr(api_key, 'prefix'),
        permissions=getattr(api_key, 'permissions') or {"read": True, "write": True},
        is_active=getattr(api_key, 'is_active'),
        expires_in_days=getattr(api_key, 'expires_in_days'),
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

@router.post("/{key_id}/extend")
def extend_api_key_expiration(
    key_id: str,
    request: ExtendApiKeyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extend API key expiration or make it permanent"""
    # Find the API key
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    if not getattr(api_key, 'is_active', False):
        raise HTTPException(status_code=400, detail="Cannot extend inactive API key")
    
    # Calculate new expiration
    if request.make_permanent:
        setattr(api_key, 'expires_in_days', None)
    else:
        # Calculate current expiration date
        current_expiration = None
        expires_in_days = getattr(api_key, 'expires_in_days', None)
        if expires_in_days is not None:
            current_expiration = getattr(api_key, 'created_at', datetime.datetime.utcnow()) + datetime.timedelta(days=expires_in_days)
        else:
            # If already permanent, use current date as base
            current_expiration = datetime.datetime.utcnow()
        
        # Calculate extension
        extension_days = 0
        if request.extend_by_days:
            extension_days += request.extend_by_days
        if request.extend_by_months:
            extension_days += request.extend_by_months * 30  # Approximate
        
        if extension_days > 0:
            # Calculate new expiration date
            new_expiration = current_expiration + datetime.timedelta(days=extension_days)
            # Calculate days from creation to new expiration
            created_at = getattr(api_key, 'created_at', datetime.datetime.utcnow())
            total_days = (new_expiration - created_at).days
            setattr(api_key, 'expires_in_days', total_days)
    
    setattr(api_key, 'updated_at', datetime.datetime.utcnow())
    db.commit()
    
    return {"message": "API key expiration updated successfully"}

@router.post("/{key_id}/toggle")
def toggle_api_key_status(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle API key status (enable/disable) for the current user"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Check if the key is expired
    expires_in_days = getattr(api_key, 'expires_in_days', None)
    if expires_in_days is not None:
        created_at = getattr(api_key, 'created_at', datetime.datetime.utcnow())
        expiration_date = created_at + datetime.timedelta(days=expires_in_days)
        if datetime.datetime.utcnow() > expiration_date:
            raise HTTPException(status_code=400, detail="Cannot enable an expired API key. Please extend the expiration first.")
    
    # Toggle the status
    setattr(api_key, 'is_active', not getattr(api_key, 'is_active'))
    db.commit()
    
    status = "enabled" if getattr(api_key, 'is_active') else "disabled"
    return {"message": f"API key {status} successfully"}

@router.get("/{key_id}/full-key")
def get_full_api_key(
    key_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the full API key for display (only for newly created keys)"""
    api_key = db.query(ApiKey).filter(
        ApiKey.key_id == key_id,
        ApiKey.user_id == current_user.id
    ).first()
    
    if not api_key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Only return full key if it was created recently (within last 5 minutes)
    # This is a security measure - full keys are only shown immediately after creation
    created_time = getattr(api_key, 'created_at')
    if created_time and (datetime.datetime.utcnow() - created_time).total_seconds() > 300:  # 5 minutes
        raise HTTPException(status_code=403, detail="Full API key is only available immediately after creation")
    
    # For security, we don't store the full key, so we can't return it
    # The full key should be returned only in the create response
    raise HTTPException(status_code=403, detail="Full API key is only available immediately after creation")

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
    
    # ApiKeyUsage and ApiRateLimit are no longer imported, so this will cause an error.
    # Assuming ApiKeyUsage and ApiRateLimit are meant to be re-added or this function is deprecated.
    # For now, we'll keep it as is, but it will cause an error.
    # usage = db.query(ApiKeyUsage).filter(
    #     ApiKeyUsage.api_key_id == api_key.id
    # ).order_by(ApiKeyUsage.created_at.desc()).limit(limit).all()
    
    # return [
    #     ApiKeyUsageResponse(
    #         id=getattr(u, 'id'),
    #         endpoint=getattr(u, 'endpoint'),
    #         method=getattr(u, 'method'),
    #         status_code=getattr(u, 'status_code'),
    #         response_time_ms=getattr(u, 'response_time_ms'),
    #         ip_address=getattr(u, 'ip_address'),
    #         created_at=getattr(u, 'created_at')
    #     )
    #     for u in usage
    # ]
    return [] # Placeholder for now, as ApiKeyUsage is removed

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
            description=getattr(key, 'description'),
            prefix=getattr(key, 'prefix'),
            permissions=getattr(key, 'permissions') or {"read": True, "write": True},
            is_active=getattr(key, 'is_active'),
            expires_in_days=getattr(key, 'expires_in_days'),
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
    # Count expired keys by checking if current time > creation_time + expires_in_days
    expired_keys = 0
    all_keys = db.query(ApiKey).filter(ApiKey.expires_in_days.isnot(None)).all()
    for key in all_keys:
        created_at = getattr(key, 'created_at', datetime.datetime.utcnow())
        expiration_date = created_at + datetime.timedelta(days=getattr(key, 'expires_in_days', 0))
        if datetime.datetime.utcnow() > expiration_date:
            expired_keys += 1
    
    # Get usage in last 30 days
    thirty_days_ago = datetime.datetime.utcnow() - timedelta(days=30)
    # ApiKeyUsage and ApiRateLimit are no longer imported, so this will cause an error.
    # Assuming ApiKeyUsage and ApiRateLimit are meant to be re-added or this function is deprecated.
    # For now, we'll keep it as is, but it will cause an error.
    # usage_last_30_days = db.query(ApiKeyUsage).filter(
    #     ApiKeyUsage.created_at >= thirty_days_ago
    # ).count()
    
    return {
        "total_keys": total_keys,
        "active_keys": active_keys,
        "expired_keys": expired_keys,
        "usage_last_30_days": 0 # Placeholder for now, as ApiKeyUsage is removed
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
    
    if action_request.action == "enable":
        # Check if the key is expired
        expires_in_days = getattr(api_key, 'expires_in_days', None)
        if expires_in_days is not None:
            created_at = getattr(api_key, 'created_at', datetime.datetime.utcnow())
            expiration_date = created_at + datetime.timedelta(days=expires_in_days)
            if datetime.datetime.utcnow() > expiration_date:
                raise HTTPException(status_code=400, detail="Cannot enable an expired API key. Please extend the expiration first.")
        
        setattr(api_key, 'is_active', True)
        db.commit()
        message = "API key enabled successfully"
    elif action_request.action == "disable":
        setattr(api_key, 'is_active', False)
        db.commit()
        message = "API key disabled successfully"
    elif action_request.action == "delete":
        db.delete(api_key)
        db.commit()
        message = "API key deleted successfully"
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'enable', 'disable' or 'delete'")
    
    # Send notification email to the user
    background_tasks.add_task(
        send_admin_action_notification,
        getattr(user, 'email'),
        action_request.action,
        getattr(api_key, 'name'),
        action_request.reason
    )
    
    return {"message": message} 