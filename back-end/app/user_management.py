from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
import datetime
import secrets
import string
from passlib.context import CryptContext
from pydantic import BaseModel, validator

from .database import get_db
from .models import User, Account, Notification
from .auth import get_current_user_required
from config import settings
import aiosmtplib
from email.message import EmailMessage

router = APIRouter(prefix="/api/user-management", tags=["User Management"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models

class CreateUserRequest(BaseModel):
    username: str
    full_name: Optional[str] = None
    description: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Username must be at least 3 characters long')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, and hyphens')
        return v
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if v and len(v) > 100:
            raise ValueError('Full name must be less than 100 characters')
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v and len(v) > 500:
            raise ValueError('Description must be less than 500 characters')
        return v

class UpdateUserRequest(BaseModel):
    full_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    
    @validator('full_name')
    def validate_full_name(cls, v):
        if v and len(v) > 100:
            raise ValueError('Full name must be less than 100 characters')
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if v and len(v) > 500:
            raise ValueError('Description must be less than 500 characters')
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserResponse(BaseModel):
    user_id: str
    username: str
    full_name: Optional[str]
    description: Optional[str]
    is_active: bool
    is_root_user: bool
    is_verified: bool
    is_first_time_login: bool
    dedicated_signin_url: Optional[str]
    last_login: Optional[datetime.datetime]
    created_at: datetime.datetime
    updated_at: datetime.datetime

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

def generate_dedicated_signin_url() -> str:
    """Generate a unique dedicated signin URL"""
    return secrets.token_urlsafe(32)

def generate_initial_password() -> str:
    """Generate a secure initial password"""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for _ in range(12))

async def send_user_creation_email(
    root_user_email: str,
    new_user_username: str,
    new_user_full_name: str,
    dedicated_signin_url: str,
    initial_password: str,
    account_name: str
):
    """Send email to root user with new user credentials"""
    subject = f"New User Created in {account_name}"
    
    body = f"""
    Hello,

    A new user has been created in your ScaleBox account.

    User Details:
    - Username: {new_user_username}
    - Full Name: {new_user_full_name or 'Not specified'}
    - Dedicated Signin URL: {settings.APP_BASE_URL}/signin/{dedicated_signin_url}
    - Initial Password: {initial_password}

    Important Notes:
    1. The user must change their password on first login
    2. The dedicated signin URL is unique to this user
    3. Share these credentials securely with the user

    Best regards,
    ScaleBox Team
    """
    
    try:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = root_user_email
        message.set_content(body)
        
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            use_tls=settings.SMTP_PORT == 465
        )
    except Exception as e:
        print(f"Failed to send user creation email: {e}")

@router.post("/users", response_model=UserResponse)
async def create_user(
    request: CreateUserRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Create a new non-root user in the current user's account (root users only)"""
    # Check if current user is root user of their account
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can create new users"
        )
    
    # Check if username already exists in the account
    existing_user = db.query(User).filter(
        User.account_id == getattr(current_user, 'account_id', None),
        User.username == request.username
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username already exists in this account"
        )
    
    # Generate unique dedicated signin URL
    dedicated_signin_url = generate_dedicated_signin_url()
    while db.query(User).filter(User.dedicated_signin_url == dedicated_signin_url).first():
        dedicated_signin_url = generate_dedicated_signin_url()
    
    # Generate initial password
    initial_password = generate_initial_password()
    password_hash = pwd_context.hash(initial_password)
    
    # Create new user
    new_user = User(
        account_id=getattr(current_user, 'account_id', None),
        username=request.username,
        full_name=request.full_name,
        description=request.description,
        password_hash=password_hash,
        is_root_user=False,
        is_verified=True,  # Auto-verify since root user creates them
        dedicated_signin_url=dedicated_signin_url,
        is_first_time_login=True,
        email=f"{request.username}@{getattr(current_user, 'account_id', 'scalebox')}.scalebox.local"  # Generate internal email
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create user"
        )
    
    # Send email to root user with credentials
    account = db.query(Account).filter(Account.account_id == getattr(current_user, 'account_id', None)).first()
    account_name = getattr(account, 'name', None) if account else "Your Account"
    
    background_tasks.add_task(
        send_user_creation_email,
        getattr(current_user, 'email', ''),
        request.username,
        request.full_name or "Not specified",
        dedicated_signin_url,
        initial_password,
        account_name or "Your Account"
    )
    
    # Create notification for root user
    notification = Notification(
        user_id=getattr(current_user, 'user_id', None),
        title="New User Created",
        message=f"User '{request.username}' has been created successfully. Check your email for credentials.",
        type="success",
        related_entity_type="user",
        related_entity_id=getattr(new_user, 'user_id', None)
    )
    db.add(notification)
    db.commit()
    
    return UserResponse(
        user_id=getattr(new_user, 'user_id', ''),
        username=getattr(new_user, 'username', ''),
        full_name=getattr(new_user, 'full_name', None),
        description=getattr(new_user, 'description', None),
        is_active=getattr(new_user, 'is_active', True),
        is_root_user=getattr(new_user, 'is_root_user', False),
        is_verified=getattr(new_user, 'is_verified', False),
        is_first_time_login=getattr(new_user, 'is_first_time_login', True),
        dedicated_signin_url=getattr(new_user, 'dedicated_signin_url', None),
        last_login=getattr(new_user, 'last_login', None),
        created_at=getattr(new_user, 'created_at', datetime.datetime.utcnow()),
        updated_at=getattr(new_user, 'updated_at', datetime.datetime.utcnow())
    )

@router.get("/users", response_model=UserListResponse)
async def list_users(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """List all users in the current user's account (root users only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can view user list"
        )
    
    # Get all users in the account
    query = db.query(User).filter(User.account_id == getattr(current_user, 'account_id', None))
    total = query.count()
    users = query.offset(skip).limit(limit).all()
    
    user_responses = []
    for user in users:
        user_responses.append(UserResponse(
            user_id=getattr(user, 'user_id', ''),
            username=getattr(user, 'username', ''),
            full_name=getattr(user, 'full_name', None),
            description=getattr(user, 'description', None),
            is_active=getattr(user, 'is_active', True),
            is_root_user=getattr(user, 'is_root_user', False),
            is_verified=getattr(user, 'is_verified', False),
            is_first_time_login=getattr(user, 'is_first_time_login', True),
            dedicated_signin_url=getattr(user, 'dedicated_signin_url', None),
            last_login=getattr(user, 'last_login', None),
            created_at=getattr(user, 'created_at', datetime.datetime.utcnow()),
            updated_at=getattr(user, 'updated_at', datetime.datetime.utcnow())
        ))
    
    return UserListResponse(users=user_responses, total=total)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get a specific user in the account (root users only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can view user details"
        )
    
    # Get the user
    user = db.query(User).filter(
        User.user_id == user_id,
        User.account_id == getattr(current_user, 'account_id', None)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        user_id=getattr(user, 'user_id', ''),
        username=getattr(user, 'username', ''),
        full_name=getattr(user, 'full_name', None),
        description=getattr(user, 'description', None),
        is_active=getattr(user, 'is_active', True),
        is_root_user=getattr(user, 'is_root_user', False),
        is_verified=getattr(user, 'is_verified', False),
        is_first_time_login=getattr(user, 'is_first_time_login', True),
        dedicated_signin_url=getattr(user, 'dedicated_signin_url', None),
        last_login=getattr(user, 'last_login', None),
        created_at=getattr(user, 'created_at', datetime.datetime.utcnow()),
        updated_at=getattr(user, 'updated_at', datetime.datetime.utcnow())
    )

@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    request: UpdateUserRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Update a user in the account (root users only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can update users"
        )
    
    # Get the user
    user = db.query(User).filter(
        User.user_id == user_id,
        User.account_id == getattr(current_user, 'account_id', None)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent updating root users
    if getattr(user, 'is_root_user', False):
        raise HTTPException(
            status_code=400,
            detail="Cannot update root user"
        )
    
    # Update fields
    if request.full_name is not None:
        setattr(user, 'full_name', request.full_name)
    if request.description is not None:
        setattr(user, 'description', request.description)
    if request.is_active is not None:
        setattr(user, 'is_active', request.is_active)
    
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to update user"
        )
    
    return UserResponse(
        user_id=getattr(user, 'user_id', ''),
        username=getattr(user, 'username', ''),
        full_name=getattr(user, 'full_name', None),
        description=getattr(user, 'description', None),
        is_active=getattr(user, 'is_active', True),
        is_root_user=getattr(user, 'is_root_user', False),
        is_verified=getattr(user, 'is_verified', False),
        is_first_time_login=getattr(user, 'is_first_time_login', True),
        dedicated_signin_url=getattr(user, 'dedicated_signin_url', None),
        last_login=getattr(user, 'last_login', None),
        created_at=getattr(user, 'created_at', datetime.datetime.utcnow()),
        updated_at=getattr(user, 'updated_at', datetime.datetime.utcnow())
    )

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Delete a user from the account (root users only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can delete users"
        )
    
    # Get the user
    user = db.query(User).filter(
        User.user_id == user_id,
        User.account_id == getattr(current_user, 'account_id', None)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting root users
    if getattr(user, 'is_root_user', False):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete root user"
        )
    
    # Prevent deleting self
    if user.user_id == getattr(current_user, 'user_id', None):
        raise HTTPException(
            status_code=400,
            detail="Cannot delete yourself"
        )
    
    try:
        db.delete(user)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to delete user"
        )
    
    return {"message": "User deleted successfully"}

@router.post("/users/{user_id}/regenerate-signin-url")
async def regenerate_signin_url(
    user_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Regenerate dedicated signin URL for a user (root users only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can regenerate signin URLs"
        )
    
    # Get the user
    user = db.query(User).filter(
        User.user_id == user_id,
        User.account_id == getattr(current_user, 'account_id', None)
    ).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent regenerating for root users
    if getattr(user, 'is_root_user', False):
        raise HTTPException(
            status_code=400,
            detail="Cannot regenerate signin URL for root user"
        )
    
    # Generate new dedicated signin URL
    new_dedicated_signin_url = generate_dedicated_signin_url()
    while db.query(User).filter(User.dedicated_signin_url == new_dedicated_signin_url).first():
        new_dedicated_signin_url = generate_dedicated_signin_url()
    
    setattr(user, 'dedicated_signin_url', new_dedicated_signin_url)
    
    try:
        db.commit()
        db.refresh(user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to regenerate signin URL"
        )
    
    return {
        "message": "Signin URL regenerated successfully",
        "new_signin_url": new_dedicated_signin_url
    }

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Change password for non-root users (self-service)"""
    # Non-root users can only change their own password
    if getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Root users cannot use this endpoint"
        )
    
    # Verify current password
    if not pwd_context.verify(request.current_password, getattr(current_user, 'password_hash', '')):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_password_hash = pwd_context.hash(request.new_password)
    setattr(current_user, 'password_hash', new_password_hash)
    setattr(current_user, 'is_first_time_login', False)
    
    try:
        db.commit()
        db.refresh(current_user)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to change password"
        )
    
    return {"message": "Password changed successfully"} 