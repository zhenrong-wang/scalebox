import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, validator
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from config import settings
import secrets
import string
import datetime
from typing import Optional, List
import aiosmtplib
from email.message import EmailMessage
from .users import create_access_token

from .database import get_db
from .models import User, Account, Notification, AccountEmailChange
from .auth import get_current_user_required
from datetime import timezone

router = APIRouter(prefix="/api/user-management", tags=["User Management"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models

class CreateUserRequest(BaseModel):
    username: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Username cannot be empty')
        if len(v) > 100:
            raise ValueError('Username must be 100 characters or less')
        if not v.replace('-', '').replace('_', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, hyphens, and underscores')
        return v.strip()
    
    @validator('display_name')
    def validate_display_name(cls, v):
        if v is not None and len(v) > 255:
            raise ValueError('Display name must be 255 characters or less')
        return v.strip() if v else None
    
    @validator('description')
    def validate_description(cls, v):
        if v is not None and len(v) > 1000:
            raise ValueError('Description must be 1000 characters or less')
        return v.strip() if v else None

class UpdateUserRequest(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    # Note: dedicated_signin_url is immutable and cannot be updated
    
    @validator('display_name')
    def validate_display_name(cls, v):
        if v is not None and len(v) > 255:
            raise ValueError('Display name must be 255 characters or less')
        return v.strip() if v else None
    
    @validator('description')
    def validate_description(cls, v):
        if v is not None and len(v) > 1000:
            raise ValueError('Description must be 1000 characters or less')
        return v.strip() if v else None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class AccountEmailChangeRequest(BaseModel):
    current_email: str
    new_email: str
    
    @validator('current_email', 'new_email')
    def validate_email(cls, v):
        if not v or '@' not in v:
            raise ValueError('Invalid email format')
        return v.lower().strip()
    
    @validator('new_email')
    def validate_new_email_different(cls, v, values):
        if 'current_email' in values and v == values['current_email']:
            raise ValueError('New email must be different from current email')
        return v

class AccountEmailChangeConfirmation(BaseModel):
    token: str

class UserResponse(BaseModel):
    user_id: str
    username: str  # Immutable
    display_name: Optional[str]
    description: Optional[str]
    is_active: bool
    is_root_user: bool
    is_verified: bool
    is_first_time_login: bool
    dedicated_signin_url: Optional[str]  # Immutable - never changes once created
    last_login: Optional[datetime.datetime]
    created_at: datetime.datetime
    updated_at: datetime.datetime

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int

def generate_dedicated_signin_url(account_id: str) -> str:
    """Generate a unique dedicated signin URL using short random string + account_id"""
    # Generate a short random string (6 characters)
    random_part = secrets.token_urlsafe(4)  # 4 bytes = 6 characters in base64
    # Combine with account_id for global uniqueness
    return f"{random_part}-{account_id}"

def generate_initial_password() -> str:
    """Generate a secure initial password"""
    # Use safer special characters that are less likely to cause issues
    alphabet = string.ascii_letters + string.digits + "!@#$%^&"
    return ''.join(secrets.choice(alphabet) for _ in range(12))

async def send_user_creation_email(
    root_user_email: str,
    new_user_username: str,
    new_user_display_name: str,
    dedicated_signin_url: str,
    initial_password: str,
    account_name: str
):
    """Send email to root user with new user credentials"""
    subject = f"New User Created in {account_name}"
    
    body = f"""
    A new user has been created in your ScaleBox account.
    
    - Username: {new_user_username}
    - Display Name: {new_user_display_name or 'Not specified'}
    - Dedicated Signin URL: {dedicated_signin_url}
    - Initial Password: {initial_password}
    
    The user can sign in using their dedicated signin URL and the initial password provided above.
    They will be required to change their password on first login.
    
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

async def send_password_reset_email(
    user_email: str,
    reset_token: str,
    user_name: str
):
    """Send password reset email to root user"""
    subject = "Password Reset Request - ScaleBox"
    
    reset_url = f"{settings.APP_BASE_URL}/reset-password?token={reset_token}"
    
    body = f"""
    Hello {user_name},

    You have requested a password reset for your ScaleBox account.

    To reset your password, please click the link below:
    {reset_url}

    This link will expire in 1 hour.

    If you did not request this password reset, please ignore this email.

    Best regards,
    ScaleBox Team
    """
    
    try:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = user_email
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
        print(f"Failed to send password reset email: {e}")

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
    
    # Generate dedicated signin URL
    dedicated_signin_url = generate_dedicated_signin_url(getattr(current_user, 'account_id', ''))
    
    # Generate initial password
    initial_password = generate_initial_password()
    password_hash = pwd_context.hash(initial_password)
    
    # Create new user
    new_user = User(
        account_id=getattr(current_user, 'account_id', None),
        username=request.username,
        display_name=request.display_name,
        description=request.description,
        password_hash=password_hash,
        is_root_user=False,
        is_verified=True,  # Auto-verify since root user creates them
        dedicated_signin_url=dedicated_signin_url,
        is_first_time_login=True,
        email=f"{request.username}_{secrets.token_hex(4)}@{getattr(current_user, 'account_id', 'scalebox')}.scalebox.local"  # Generate unique internal email
    )
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except Exception as e:
        db.rollback()
        print(f"Database error creating user: {e}")
        # Check for specific constraint violations
        if "unique_email_per_account" in str(e):
            raise HTTPException(
                status_code=400,
                detail="Email already exists in this account"
            )
        elif "unique_username_per_account" in str(e):
            raise HTTPException(
                status_code=400,
                detail="Username already exists in this account"
            )
        elif "dedicated_signin_url" in str(e):
            raise HTTPException(
                status_code=500,
                detail="Failed to generate unique signin URL. Please try again."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to create user: {str(e)}"
            )
    
    # Send email to root user with credentials
    account = db.query(Account).filter(Account.account_id == getattr(current_user, 'account_id', None)).first()
    account_name = getattr(account, 'name', None) if account else "Your Account"
    
    background_tasks.add_task(
        send_user_creation_email,
        getattr(current_user, 'email', ''),
        request.username,
        request.display_name or "Not specified",
        dedicated_signin_url,
        initial_password,
        account_name or "Your Account"
    )
    
    # Create notification for root user only
    if getattr(current_user, 'is_root_user', False):
        notification = Notification(
            user_id=getattr(current_user, 'user_id', None),
            title="New User Created",
            message=f"User '{request.username}' has been created successfully. Check your email for credentials.",
            type="success",
            related_entity_type="user",
            related_entity_id=getattr(new_user, 'user_id', None)
        )
        db.add(notification)
    
    # Create welcome notification for the new user
    welcome_notification = Notification(
        user_id=getattr(new_user, 'user_id', None),
        title="Welcome to ScaleBox! 🎉",
        message=f"Hello {request.display_name or request.username}! Welcome to ScaleBox. Your account has been successfully created. You can now access your dedicated signin URL and start using our platform. If you have any questions, please contact your account administrator.",
        type="info",
        related_entity_type="user",
        related_entity_id=getattr(new_user, 'user_id', None)
    )
    db.add(welcome_notification)
    db.commit()
    
    return UserResponse(
        user_id=getattr(new_user, 'user_id', ''),
        username=getattr(new_user, 'username', ''),
        display_name=getattr(new_user, 'display_name', None),
        description=getattr(new_user, 'description', None),
        is_active=getattr(new_user, 'is_active', True),
        is_root_user=getattr(new_user, 'is_root_user', False),
        is_verified=getattr(new_user, 'is_verified', False),
        is_first_time_login=getattr(new_user, 'is_first_time_login', True),
        dedicated_signin_url=getattr(new_user, 'dedicated_signin_url', None),
        last_login=getattr(new_user, 'last_login', None),
        created_at=getattr(new_user, 'created_at', datetime.datetime.now(timezone.utc)),
        updated_at=getattr(new_user, 'updated_at', datetime.datetime.now(timezone.utc))
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
            display_name=getattr(user, 'display_name', None),
            description=getattr(user, 'description', None),
            is_active=getattr(user, 'is_active', True),
            is_root_user=getattr(user, 'is_root_user', False),
            is_verified=getattr(user, 'is_verified', False),
            is_first_time_login=getattr(user, 'is_first_time_login', True),
            dedicated_signin_url=getattr(user, 'dedicated_signin_url', None),
            last_login=getattr(user, 'last_login', None),
            created_at=getattr(user, 'created_at', datetime.datetime.now(timezone.utc)),
            updated_at=getattr(user, 'updated_at', datetime.datetime.now(timezone.utc))
        ))
    
    return UserListResponse(users=user_responses, total=total)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get a specific user by ID (root users only)"""
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
        display_name=getattr(user, 'display_name', None),
        description=getattr(user, 'description', None),
        is_active=getattr(user, 'is_active', True),
        is_root_user=getattr(user, 'is_root_user', False),
        is_verified=getattr(user, 'is_verified', False),
        is_first_time_login=getattr(user, 'is_first_time_login', True),
        dedicated_signin_url=getattr(user, 'dedicated_signin_url', None),
        last_login=getattr(user, 'last_login', None),
        created_at=getattr(user, 'created_at', datetime.datetime.now(timezone.utc)),
        updated_at=getattr(user, 'updated_at', datetime.datetime.now(timezone.utc))
    )

@router.put("/users/me")
async def update_own_profile(
    request: dict,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Update own profile information"""
    display_name = request.get("display_name")
    
    if display_name is not None:
        if len(display_name) > 255:
            raise HTTPException(status_code=400, detail="Display name must be 255 characters or less")
        setattr(current_user, 'display_name', display_name)
    
    db.commit()
    db.refresh(current_user)
    
    return {
        "message": "Profile updated successfully",
        "user_id": getattr(current_user, 'user_id', ''),
        "username": getattr(current_user, 'username', ''),
        "display_name": getattr(current_user, 'display_name', None)
    }

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
    if request.display_name is not None:
        setattr(user, 'display_name', request.display_name)
    if request.description is not None:
        setattr(user, 'description', request.description)
    if request.is_active is not None:
        # Prevent disabling root users
        if getattr(user, 'is_root_user', False) and not request.is_active:
            raise HTTPException(
                status_code=400,
                detail="Cannot disable root users"
            )
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
        display_name=getattr(user, 'display_name', None),
        description=getattr(user, 'description', None),
        is_active=getattr(user, 'is_active', True),
        is_root_user=getattr(user, 'is_root_user', False),
        is_verified=getattr(user, 'is_verified', False),
        is_first_time_login=getattr(user, 'is_first_time_login', True),
        dedicated_signin_url=getattr(user, 'dedicated_signin_url', None),
        last_login=getattr(user, 'last_login', None),
        created_at=getattr(user, 'created_at', datetime.datetime.now(timezone.utc)),
        updated_at=getattr(user, 'updated_at', datetime.datetime.now(timezone.utc))
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
    """Regenerate dedicated signin URL for a user (DISABLED - URLs are immutable)"""
    raise HTTPException(
        status_code=403,
        detail="Dedicated signin URLs are immutable and cannot be regenerated"
    )

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
        
        # Create welcome notification for first-time login completion
        welcome_notification = Notification(
            user_id=getattr(current_user, 'user_id', None),
            title="Welcome to ScaleBox! 🎉",
            message=f"Hello {getattr(current_user, 'display_name', '') or getattr(current_user, 'username', '')}! Welcome to ScaleBox. Your account setup is now complete and you're ready to start using our platform. We're excited to have you on board!",
            type="success",
            related_entity_type="user",
            related_entity_id=getattr(current_user, 'user_id', None)
        )
        db.add(welcome_notification)
        db.commit()
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to change password"
        )
    
    return {"message": "Password changed successfully"} 

@router.get("/validate-signin-url/{signin_url}")
async def validate_signin_url(
    signin_url: str,
    db: Session = Depends(get_db)
):
    """Validate a dedicated signin URL and return user info"""
    user = db.query(User).filter(User.dedicated_signin_url == signin_url).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Invalid signin URL")
    
    if not getattr(user, 'is_active', True):
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    # Get account info
    account = db.query(Account).filter(Account.account_id == getattr(user, 'account_id', None)).first()
    
    return {
        "user_id": getattr(user, 'user_id', ''),
        "username": getattr(user, 'username', ''),
        "display_name": getattr(user, 'display_name', ''),
        "account_name": getattr(account, 'name', 'Your Account') if account else "Your Account",
        "account_email": getattr(account, 'email', '') if account else "",
        "account_display_name": getattr(account, 'display_name', '') if account else "",
        "is_root_user": getattr(user, 'is_root_user', False)
    }

@router.post("/dedicated-signin")
async def dedicated_signin(
    request: dict,
    db: Session = Depends(get_db)
):
    """Sign in using dedicated signin URL and username/password"""
    signin_url = request.get("signin_url")
    username = request.get("username")
    password = request.get("password")
    
    if not signin_url or not username or not password:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Find user by dedicated signin URL
    user = db.query(User).filter(User.dedicated_signin_url == signin_url).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid signin URL")
    
    # Verify username matches
    if getattr(user, 'username', '') != username:
        raise HTTPException(status_code=401, detail="Invalid username")
    
    # Verify password
    if not pwd_context.verify(password, getattr(user, 'password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    if not getattr(user, 'is_active', True):
        raise HTTPException(status_code=400, detail="User account is inactive")
    
    # Check if this is first time login
    is_first_time_login = getattr(user, 'is_first_time_login', False)
    
    # Update last login
    setattr(user, 'last_login', datetime.datetime.now(timezone.utc))
    
    # Only set is_first_time_login to False after successful password change
    # For first-time users, we'll keep it True until they change their password
    if not is_first_time_login:
        # For non-first-time users, create access token and proceed normally
        access_token = create_access_token({
            "sub": str(user.id),
            "email": getattr(user, 'email', ''),
            "user_id": getattr(user, 'user_id', ''),
            "account_id": getattr(user, 'account_id', ''),
            "is_root_user": getattr(user, 'is_root_user', False)
        })
        
        db.commit()
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "user_id": getattr(user, 'user_id', ''),
                "username": getattr(user, 'username', ''),
                "display_name": getattr(user, 'display_name', ''),
                "is_root_user": getattr(user, 'is_root_user', False),
                "account_id": getattr(user, 'account_id', ''),
                "is_first_time_login": False
            }
        }
    else:
        # For first-time users, don't create access token yet
        # They need to change their password first
        db.commit()
        
        return {
            "requires_password_change": True,
            "message": "First-time login detected. Please change your password to continue.",
            "user": {
                "user_id": getattr(user, 'user_id', ''),
                "username": getattr(user, 'username', ''),
                "display_name": getattr(user, 'display_name', ''),
                "is_root_user": getattr(user, 'is_root_user', False),
                "account_id": getattr(user, 'account_id', ''),
                "is_first_time_login": True
            }
        } 

@router.post("/rotate-password")
async def rotate_password(
    request: dict,
    db: Session = Depends(get_db)
):
    """Rotate password for dedicated signin users"""
    signin_url = request.get("signin_url")
    new_password = request.get("new_password")
    
    if not signin_url or not new_password:
        raise HTTPException(status_code=400, detail="Signin URL and new password are required")
    
    # Find user by dedicated signin URL
    user = db.query(User).filter(User.dedicated_signin_url == signin_url).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash the new password
    hashed_password = pwd_context.hash(new_password)
    setattr(user, 'password_hash', hashed_password)
    setattr(user, 'is_first_time_login', False)  # Mark as no longer first time login
    
    # Generate new dedicated signin URL for security
    setattr(user, 'dedicated_signin_url', generate_dedicated_signin_url(getattr(user, 'account_id', '')))
    
    db.commit()
    db.refresh(user)
    
    # Create welcome notification for first-time login completion
    welcome_notification = Notification(
        user_id=getattr(user, 'user_id', None),
        title="Welcome to ScaleBox! 🎉",
        message=f"Hello {getattr(user, 'display_name', '') or getattr(user, 'username', '')}! Welcome to ScaleBox. Your account setup is now complete and you're ready to start using our platform. We're excited to have you on board!",
        type="success",
        related_entity_type="user",
        related_entity_id=getattr(user, 'user_id', None)
    )
    db.add(welcome_notification)
    db.commit()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
            "is_root_user": user.is_root_user,
            "account_id": user.account_id
        }
    } 

@router.post("/users/{user_id}/reset-password")
async def reset_user_password(
    user_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Reset password for a non-root user (root users only)"""
    # Check if current user is root user of their account
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can reset user passwords"
        )
    
    # Find the user to reset
    user_to_reset = db.query(User).filter(
        User.user_id == user_id,
        User.account_id == getattr(current_user, 'account_id', None)
    ).first()
    
    if not user_to_reset:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    
    # Cannot reset root user password
    if getattr(user_to_reset, 'is_root_user', False):
        raise HTTPException(
            status_code=400,
            detail="Cannot reset root user password"
        )
    
    # Generate new initial password
    new_initial_password = generate_initial_password()
    password_hash = pwd_context.hash(new_initial_password)
    
    # Generate new dedicated signin URL
    new_dedicated_signin_url = generate_dedicated_signin_url(getattr(current_user, 'account_id', ''))
    
    # Update user
    setattr(user_to_reset, 'password_hash', password_hash)
    setattr(user_to_reset, 'dedicated_signin_url', new_dedicated_signin_url)
    setattr(user_to_reset, 'is_first_time_login', True)  # Force password change on next login
    
    db.commit()
    db.refresh(user_to_reset)
    
    # Get account information for email
    account = db.query(Account).filter(Account.account_id == getattr(current_user, 'account_id', None)).first()
    account_name = getattr(account, 'name', 'Unknown Account') if account else 'Unknown Account'
    
    # Send email to root user with new credentials
    background_tasks.add_task(
        send_user_creation_email,
        getattr(current_user, 'email', ''),  # Send to root user's email
        getattr(user_to_reset, 'username', ''),
        getattr(user_to_reset, 'display_name', '') or getattr(user_to_reset, 'username', ''),
        new_dedicated_signin_url,
        new_initial_password,
        account_name
    )
    
    return {
        "message": "Password reset successfully. New credentials have been sent to your email.",
        "user_id": getattr(user_to_reset, 'user_id', ''),
        "username": getattr(user_to_reset, 'username', '')
    }

@router.post("/request-password-reset")
async def request_password_reset(
    request: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Request password reset via email - for root users only"""
    email = request.get("email")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        # Don't reveal if user exists or not for security
        return {"message": "If the email exists, a reset link has been sent"}
    
    # Only root users can use email reset
    if not getattr(user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Non-root users cannot use email reset"
        )
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    reset_token_expiry = datetime.datetime.now(timezone.utc) + datetime.timedelta(hours=1)
    
    # Store reset token
    setattr(user, 'reset_token', reset_token)
    setattr(user, 'reset_token_expiry', reset_token_expiry)
    setattr(user, 'last_password_reset_request', datetime.datetime.now(timezone.utc))
    
    db.commit()
    
    # Send reset email
    background_tasks.add_task(
        send_password_reset_email,
        getattr(user, 'email', ''),
        reset_token,
        getattr(user, 'display_name', '') or getattr(user, 'username', '')
    )
    
    return {"message": "If the email exists, a reset link has been sent"}

@router.post("/reset-password-with-token")
async def reset_password_with_token(
    request: dict,
    db: Session = Depends(get_db)
):
    """Reset password using reset token - for root users only"""
    reset_token = request.get("reset_token")
    new_password = request.get("new_password")
    
    if not reset_token or not new_password:
        raise HTTPException(status_code=400, detail="Reset token and new password are required")
    
    # Find user by reset token
    user = db.query(User).filter(
        User.reset_token == reset_token,
        User.reset_token_expiry > datetime.datetime.now(timezone.utc)
    ).first()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Only root users can use email reset
    if not getattr(user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Non-root users cannot use email reset"
        )
    
    # Validate password strength
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    # Hash the new password
    hashed_password = pwd_context.hash(new_password)
    setattr(user, 'password_hash', hashed_password)
    setattr(user, 'reset_token', None)  # Clear reset token
    setattr(user, 'reset_token_expiry', None)
    
    db.commit()
    
    return {"message": "Password reset successfully"} 

@router.post("/reset-own-password")
async def reset_own_password(
    request: dict,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Reset own password (non-root users only)"""
    current_password = request.get("current_password")
    new_password = request.get("new_password")
    
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Verify current password
    if not pwd_context.verify(current_password, getattr(current_user, 'password_hash', '')):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Validate new password
    if len(new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
    
    # Update password
    setattr(current_user, 'password_hash', pwd_context.hash(new_password))
    setattr(current_user, 'is_first_time_login', False)
    
    try:
        db.commit()
        db.refresh(current_user)
        
        # Create welcome notification for password change completion
        welcome_notification = Notification(
            user_id=getattr(current_user, 'user_id', None),
            title="Welcome to ScaleBox! 🎉",
            message=f"Hello {getattr(current_user, 'display_name', '') or getattr(current_user, 'username', '')}! Welcome to ScaleBox. Your account setup is now complete and you're ready to start using our platform. We're excited to have you on board!",
            type="success",
            related_entity_type="user",
            related_entity_id=getattr(current_user, 'user_id', None)
        )
        db.add(welcome_notification)
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to change password"
        )
    
    return {"message": "Password changed successfully"}

@router.post("/account/request-email-change")
async def request_account_email_change(
    request: AccountEmailChangeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Request account email change (root users only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can change account email"
        )
    
    # Get the account
    account = db.query(Account).filter(Account.account_id == getattr(current_user, 'account_id', None)).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Verify current email matches account email
    if getattr(account, 'email', '') != request.current_email:
        raise HTTPException(status_code=400, detail="Current email does not match account email")
    
    # Check if new email is already in use by any account
    existing_account = db.query(Account).filter(Account.email == request.new_email).first()
    if existing_account:
        raise HTTPException(status_code=400, detail="New email is already in use by another account")
    
    # Check if new email is already in use by any user
    existing_user = db.query(User).filter(User.email == request.new_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="New email is already in use by a user")
    
    # Generate tokens
    current_email_token = secrets.token_urlsafe(32)
    new_email_token = secrets.token_urlsafe(32)
    
    # Set expiration (30 minutes)
    expires_at = datetime.datetime.now(timezone.utc) + datetime.timedelta(minutes=30)
    
    # Create email change record
    email_change = AccountEmailChange(
        account_id=getattr(current_user, 'account_id', None),
        current_email=request.current_email,
        new_email=request.new_email,
        current_email_token=current_email_token,
        new_email_token=new_email_token,
        expires_at=expires_at
    )
    
    try:
        db.add(email_change)
        db.commit()
        db.refresh(email_change)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to create email change request"
        )
    
    # Send confirmation emails
    background_tasks.add_task(
        send_email_change_confirmation,
        request.current_email,
        current_email_token,
        "current",
        getattr(account, 'name', 'Your Account')
    )
    
    background_tasks.add_task(
        send_email_change_confirmation,
        request.new_email,
        new_email_token,
        "new",
        getattr(account, 'name', 'Your Account')
    )
    
    return {
        "message": "Email change request created. Please check both email addresses for confirmation links.",
        "expires_at": expires_at.isoformat()
    }

@router.post("/account/confirm-email-change")
async def confirm_account_email_change(
    request: AccountEmailChangeConfirmation,
    db: Session = Depends(get_db)
):
    """Confirm account email change using token"""
    # Find the email change record
    email_change = db.query(AccountEmailChange).filter(
        (AccountEmailChange.current_email_token == request.token) |
        (AccountEmailChange.new_email_token == request.token)
    ).first()
    
    if not email_change:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
    
    # Check if expired
    expires_at = getattr(email_change, 'expires_at', None)
    if expires_at is None or expires_at < datetime.datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token has expired")
    
    # Determine which email is being confirmed
    current_token = getattr(email_change, 'current_email_token', '')
    new_token = getattr(email_change, 'new_email_token', '')
    
    is_current_email = current_token == request.token
    is_new_email = new_token == request.token
    
    if is_current_email:
        setattr(email_change, 'current_email_confirmed', True)
    elif is_new_email:
        setattr(email_change, 'new_email_confirmed', True)
    
    # Check if both emails are confirmed
    if getattr(email_change, 'current_email_confirmed', False) and getattr(email_change, 'new_email_confirmed', False):
        # Update account email
        account = db.query(Account).filter(Account.account_id == email_change.account_id).first()
        if account:
            setattr(account, 'email', email_change.new_email)
            setattr(email_change, 'completed_at', datetime.datetime.now(timezone.utc))
            
            # Update all users in the account with the new email
            users = db.query(User).filter(User.account_id == email_change.account_id).all()
            for user in users:
                # Generate new internal email for each user
                new_internal_email = f"{getattr(user, 'username', '')}_{secrets.token_hex(4)}@{email_change.new_email.split('@')[1]}"
                setattr(user, 'email', new_internal_email)
            
            try:
                db.commit()
                
                # Create notification for root user
                root_user = db.query(User).filter(
                    User.account_id == email_change.account_id,
                    User.is_root_user == True
                ).first()
                
                if root_user:
                    notification = Notification(
                        user_id=getattr(root_user, 'user_id', None),
                        title="Account Email Changed",
                        message=f"Your account email has been successfully changed from {email_change.current_email} to {email_change.new_email}.",
                        type="success",
                        related_entity_type="account",
                        related_entity_id=email_change.account_id
                    )
                    db.add(notification)
                    db.commit()
                
                return {"message": "Account email changed successfully"}
            except Exception as e:
                db.rollback()
                raise HTTPException(
                    status_code=500,
                    detail="Failed to update account email"
                )
    else:
        # Just mark as confirmed
        try:
            db.commit()
            return {"message": "Email confirmed. Please check the other email address for the second confirmation link."}
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Failed to confirm email"
            )

async def send_email_change_confirmation(
    email: str,
    token: str,
    email_type: str,
    account_name: str
):
    """Send email change confirmation email"""
    subject = f"Confirm Account Email Change - {account_name}"
    
    confirmation_url = f"{settings.APP_BASE_URL}/confirm-email-change?token={token}"
    
    body = f"""
    Hello,
    
    You have requested to change the account email for {account_name}.
    
    This is the confirmation email for the {email_type} email address ({email}).
    
    To complete the email change, please click the following link:
    {confirmation_url}
    
    This link will expire in 30 minutes.
    
    If you did not request this change, please ignore this email.
    
    Best regards,
    ScaleBox Team
    """
    
    try:
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = settings.SMTP_FROM
        message["To"] = email
        message.set_content(body)
        
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASS,
            use_tls=settings.SMTP_PORT == 465
        )
        print(f"Email change confirmation sent to {email}: {confirmation_url}")
    except Exception as e:
        print(f"Failed to send email change confirmation to {email}: {e}")
        # Don't raise exception to avoid breaking the background task

# Cleanup expired email change requests (can be called periodically)
@router.post("/account/cleanup-expired-email-changes")
async def cleanup_expired_email_changes(
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Clean up expired email change requests (admin only)"""
    # Check if current user is root user
    if not getattr(current_user, 'is_root_user', False):
        raise HTTPException(
            status_code=403,
            detail="Only root users can perform cleanup"
        )
    
    # Delete expired email change requests
    expired_changes = db.query(AccountEmailChange).filter(
        AccountEmailChange.expires_at < datetime.datetime.now(timezone.utc)
    ).all()
    
    for change in expired_changes:
        db.delete(change)
    
    try:
        db.commit()
        return {"message": f"Cleaned up {len(expired_changes)} expired email change requests"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Failed to cleanup expired email changes"
        ) 