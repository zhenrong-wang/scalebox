from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import jwt
from datetime import datetime
from typing import Optional

from .database import get_db
from .models import User
from config import settings

# Security scheme
security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Get current user from JWT token - returns None if no token provided"""
    if not credentials:
        return None
        
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return None
    
    # Check if user is active by accessing the actual value
    if not getattr(user, 'is_active', True):
        return None
    
    return user

def get_current_user_required(
    current_user: Optional[User] = Depends(get_current_user)
) -> User:
    """Get current user - raises exception if not authenticated"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user

def get_current_admin_user(
    current_user: User = Depends(get_current_user_required)
) -> User:
    """Get current admin user - requires admin privileges"""
    if getattr(current_user, 'role', 'user') != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user 