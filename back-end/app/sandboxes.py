import sys
import os

if __name__ == "__main__" or __package__ is None:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import uuid
import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, func,
    Float, Text, ForeignKey, Index
)
from sqlalchemy.orm import sessionmaker, Session, relationship
from sqlalchemy.orm.attributes import InstrumentedAttribute
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from config import settings
from .database import get_db
from .models import Base, User, Sandbox, SandboxUsage, SandboxMetrics
from .users import verify_admin_token
from datetime import datetime


router = APIRouter(prefix="/sandboxes", tags=["sandboxes"])


# Enums
class SandboxStatus(str, Enum):
    CREATED = "created"
    STARTING = "starting"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"
    DELETED = "deleted"
    TIMEOUT = "timeout"
    RECYCLED = "recycled"


class SandboxVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


# Pydantic models for API requests/responses
class SandboxCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    framework: str = Field(..., max_length=50)
    region: str = Field(..., max_length=20)
    cpu_spec: float = Field(..., ge=1.0, le=8.0)  # 1-8 vCPU
    memory_spec: float = Field(..., ge=0.5, le=16.0)  # 0.5, 1, 2, 4, 8, 16 GB
    visibility: SandboxVisibility = SandboxVisibility.PRIVATE
    project_id: Optional[str] = None


class SandboxUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[SandboxStatus] = None
    visibility: Optional[SandboxVisibility] = None
    project_id: Optional[str] = None


class SandboxResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    framework: str
    status: SandboxStatus
    user_id: str
    user_name: str
    user_email: str
    region: str
    visibility: SandboxVisibility
    project_id: Optional[str]
    project_name: Optional[str]
    resources: Dict[str, Any]
    cost: Dict[str, float]
    created_at: datetime
    updated_at: datetime
    last_accessed_at: Optional[datetime]
    uptime: int  # minutes
    cpu_spec: Optional[float] = None
    memory_spec: Optional[float] = None


class SandboxFilters(BaseModel):
    status: Optional[List[SandboxStatus]] = None
    framework: Optional[List[str]] = None
    region: Optional[List[str]] = None
    visibility: Optional[List[SandboxVisibility]] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None


class SandboxStats(BaseModel):
    total_sandboxes: int
    running_sandboxes: int
    stopped_sandboxes: int
    error_sandboxes: int
    deleted_sandboxes: int
    total_cost: float
    avg_cpu_usage: float
    avg_memory_usage: float
    total_uptime_hours: float







# Helper functions
def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
) -> User:
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


def calculate_uptime(started_at: Optional[datetime]) -> int:
    if not started_at:
        return 0
    now = datetime.utcnow()
    delta = now - started_at
    return int(delta.total_seconds() / 60)  # Return minutes


def calculate_cost(hourly_rate: float, uptime_minutes: int) -> float:
    return hourly_rate * (uptime_minutes / 60)


def get_sandbox_resources(sandbox: Sandbox) -> Dict[str, Any]:
    def safe_float(val):
        return float(val) if not isinstance(val, InstrumentedAttribute) and val is not None else 0.0
    return {
        "cpu": safe_float(getattr(sandbox, "cpu_usage", 0.0)),
        "memory": safe_float(getattr(sandbox, "memory_usage", 0.0)),
        "storage": safe_float(getattr(sandbox, "storage_usage", 0.0)),
        "bandwidth": safe_float(getattr(sandbox, "bandwidth_usage", 0.0)),
    }


def get_sandbox_cost(sandbox: Sandbox) -> Dict[str, float]:
    def safe_float(val):
        return float(val) if not isinstance(val, InstrumentedAttribute) and val is not None else 0.0
    return {
        "hourlyRate": safe_float(getattr(sandbox, "hourly_rate", 0.0)),
        "totalCost": safe_float(getattr(sandbox, "total_cost", 0.0)),
    }


def get_sandbox_status_value(status):
    # Helper to ensure we always get the string value for status
    if isinstance(status, Enum):
        return status.value
    return status


def get_sandbox_visibility_value(visibility):
    if isinstance(visibility, Enum):
        return visibility.value
    return visibility


# Helper function to safely get datetime values
def safe_datetime(val, default=None):
    """Safely extract datetime value from SQLAlchemy attribute"""
    if isinstance(val, InstrumentedAttribute):
        return default
    if isinstance(val, datetime):
        return val
    return default


# API Endpoints
@router.get("/", response_model=List[SandboxResponse])
def list_sandboxes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    status: Optional[SandboxStatus] = Query(None),
    framework: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    visibility: Optional[SandboxVisibility] = Query(None),
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0)
):
    """List sandboxes for the current user with filtering and pagination."""
    query = db.query(Sandbox).filter(Sandbox.owner_account_id == current_user.account_id)

    # Apply filters
    if status:
        query = query.filter(Sandbox.status == status.value)
    # Framework filter removed since framework is not in the model
    # if framework:
    #     query = query.filter(Sandbox.framework == framework)
    if region:
        query = query.filter(Sandbox.region == region)
    if visibility:
        query = query.filter(Sandbox.visibility == visibility.value)
    if project_id:
        query = query.filter(Sandbox.project_id == project_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Sandbox.name.ilike(search_term)) |
            (Sandbox.description.ilike(search_term))
        )

    # Apply sorting
    if sort_by == "name":
        query = query.order_by(
            Sandbox.name.desc() if sort_order == "desc" else Sandbox.name.asc()
        )
    elif sort_by == "status":
        query = query.order_by(
            Sandbox.status.desc() if sort_order == "desc" else Sandbox.status.asc()
        )
    # Framework sorting removed since framework is not in the model
    # elif sort_by == "framework":
    #     query = query.order_by(
    #         Sandbox.framework.desc() if sort_order == "desc" else Sandbox.framework.asc()
    #     )
    elif sort_by == "region":
        query = query.order_by(
            Sandbox.region.desc() if sort_order == "desc" else Sandbox.region.asc()
        )
    else:  # created_at
        query = query.order_by(
            Sandbox.created_at.desc() if sort_order == "desc" else Sandbox.created_at.asc()
        )

    # Apply pagination
    sandboxes = query.offset(offset).limit(limit).all()

    # Convert to response format
    result = []
    for sandbox in sandboxes:
        started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
        uptime = calculate_uptime(started_at_val)

        created_at_val = safe_datetime(
            getattr(sandbox, 'created_at', None), datetime.utcnow()
        )
        updated_at_val = safe_datetime(
            getattr(sandbox, 'updated_at', None), datetime.utcnow()
        )
        last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

        # Get user display name
        user_name = (
            str(current_user.full_name) if current_user.full_name is not None
            else str(current_user.username) if current_user.username is not None
            else str(current_user.email.split('@')[0])
        )

        result.append(SandboxResponse(
            id=str(getattr(sandbox, 'sandbox_id', '')),
            name=str(getattr(sandbox, 'name', '')),
            description=str(getattr(sandbox, 'description', ''))
            if getattr(sandbox, 'description', None) is not None else None,
            framework="python",  # Default framework since it's not in the model
            status=SandboxStatus(str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value))),
            user_id=str(getattr(sandbox, 'owner_account_id', '')),
            user_name=user_name,
            user_email=str(current_user.email),
            region=str(getattr(sandbox, 'region', '')),
            visibility=SandboxVisibility(
                str(getattr(sandbox, 'visibility', SandboxVisibility.PRIVATE.value))
            ),
            project_id=str(getattr(sandbox, 'project_id', ''))
            if getattr(sandbox, 'project_id', None) is not None else None,
            project_name=None,  # TODO: Add project name lookup
            resources={
                "cpu": 0.0,
                "memory": 0.0,
                "storage": 0.0,
                "bandwidth": 0.0,
            },
            cost={
                "hourlyRate": 0.0,
                "totalCost": 0.0,
            },
            created_at=created_at_val,
            updated_at=updated_at_val,
            last_accessed_at=last_accessed_at_val,
            uptime=uptime,
            cpu_spec=getattr(sandbox, 'cpu_spec', None),
            memory_spec=getattr(sandbox, 'memory_spec', None)
        ))

    return result


@router.get("/stats", response_model=SandboxStats)
def get_sandbox_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sandbox statistics for the current user."""
    user_sandboxes = db.query(Sandbox).filter(
        Sandbox.owner_account_id == current_user.account_id
    ).all()

    total_sandboxes = len(user_sandboxes)
    running_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value
    ])
    stopped_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.STOPPED.value
    ])
    error_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.ERROR.value
    ])
    deleted_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.DELETED.value
    ])

    total_cost = float(sum(float(getattr(s, 'total_cost', 0.0)) for s in user_sandboxes))
    avg_cpu_usage = (
        float(sum(float(getattr(s, 'cpu_usage', 0.0)) for s in user_sandboxes) / total_sandboxes)
        if total_sandboxes > 0 else 0.0
    )
    avg_memory_usage = (
        float(sum(float(getattr(s, 'memory_usage', 0.0)) for s in user_sandboxes) / total_sandboxes)
        if total_sandboxes > 0 else 0.0
    )
    total_uptime_hours = float(
        sum(calculate_uptime(getattr(s, 'started_at', None)) for s in user_sandboxes) / 60
    )

    return SandboxStats(
        total_sandboxes=total_sandboxes,
        running_sandboxes=running_sandboxes,
        stopped_sandboxes=stopped_sandboxes,
        error_sandboxes=error_sandboxes,
        deleted_sandboxes=deleted_sandboxes,
        total_cost=total_cost,
        avg_cpu_usage=avg_cpu_usage,
        avg_memory_usage=avg_memory_usage,
        total_uptime_hours=total_uptime_hours
    )


@router.post("/", response_model=SandboxResponse)
def create_sandbox(
    sandbox_data: SandboxCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new sandbox for the current user."""
    # Create new sandbox
    new_sandbox = Sandbox(
        name=sandbox_data.name,
        description=sandbox_data.description,
        framework=sandbox_data.framework,
        status=SandboxStatus.STOPPED,
        owner_account_id=current_user.account_id,
        region=sandbox_data.region,
        visibility=sandbox_data.visibility,
        project_id=sandbox_data.project_id,
        hourly_rate=0.10  # Default hourly rate
    )

    db.add(new_sandbox)
    db.commit()
    db.refresh(new_sandbox)

    # Return response
    started_at_val = safe_datetime(getattr(new_sandbox, 'started_at', None))
    uptime = calculate_uptime(started_at_val)

    created_at_val = safe_datetime(
        getattr(new_sandbox, 'created_at', None), datetime.utcnow()
    )
    updated_at_val = safe_datetime(
        getattr(new_sandbox, 'updated_at', None), datetime.utcnow()
    )
    last_accessed_at_val = safe_datetime(getattr(new_sandbox, 'last_accessed_at', None))

    # Get user display name
    user_name = (
        str(current_user.full_name) if current_user.full_name is not None
        else str(current_user.username) if current_user.username is not None
        else str(current_user.email.split('@')[0])
    )

    return SandboxResponse(
        id=str(new_sandbox.id),
        name=str(new_sandbox.name),
        description=str(new_sandbox.description) if new_sandbox.description is not None else None,
        framework=str(new_sandbox.framework),
        status=SandboxStatus(new_sandbox.status),
        user_id=str(new_sandbox.user_id),
        user_name=user_name,
        user_email=str(current_user.email),
        region=str(new_sandbox.region),
        visibility=SandboxVisibility(new_sandbox.visibility),
        project_id=str(new_sandbox.project_id) if new_sandbox.project_id is not None else None,
        project_name=None,
        resources=get_sandbox_resources(new_sandbox),
        cost=get_sandbox_cost(new_sandbox),
        created_at=created_at_val,
        updated_at=updated_at_val,
        last_accessed_at=last_accessed_at_val,
        uptime=uptime
    )


@router.get("/{sandbox_id}", response_model=SandboxResponse)
def get_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific sandbox by ID."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.id == sandbox_id,
        Sandbox.owner_account_id == current_user.account_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
    uptime = calculate_uptime(started_at_val)

    created_at_val = safe_datetime(
        getattr(sandbox, 'created_at', None), datetime.utcnow()
    )
    updated_at_val = safe_datetime(
        getattr(sandbox, 'updated_at', None), datetime.utcnow()
    )
    last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

    # Get user display name
    user_name = (
        str(current_user.full_name) if current_user.full_name is not None
        else str(current_user.username) if current_user.username is not None
        else str(current_user.email.split('@')[0])
    )

    return SandboxResponse(
        id=str(getattr(sandbox, 'id', '')),
        name=str(getattr(sandbox, 'name', '')),
        description=str(getattr(sandbox, 'description', ''))
        if getattr(sandbox, 'description', None) is not None else None,
        framework=str(getattr(sandbox, 'framework', '')),
        status=SandboxStatus(str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value))),
        user_id=str(getattr(sandbox, 'user_id', '')),
        user_name=user_name,
        user_email=str(current_user.email),
        region=str(getattr(sandbox, 'region', '')),
        visibility=SandboxVisibility(
            str(getattr(sandbox, 'visibility', SandboxVisibility.PRIVATE.value))
        ),
        project_id=str(getattr(sandbox, 'project_id', ''))
        if getattr(sandbox, 'project_id', None) is not None else None,
        project_name=None,  # TODO: Add project name lookup
        resources=get_sandbox_resources(sandbox),
        cost=get_sandbox_cost(sandbox),
        created_at=created_at_val,
        updated_at=updated_at_val,
        last_accessed_at=last_accessed_at_val,
        uptime=uptime,
        cpu_spec=getattr(sandbox, 'cpu_spec', None),
        memory_spec=getattr(sandbox, 'memory_spec', None)
    )


@router.put("/{sandbox_id}", response_model=SandboxResponse)
def update_sandbox(
    sandbox_id: str,
    sandbox_data: SandboxUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a sandbox."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.id == sandbox_id,
        Sandbox.owner_account_id == current_user.account_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Update fields if provided
    if sandbox_data.name is not None:
        setattr(sandbox, 'name', sandbox_data.name)
    if sandbox_data.description is not None:
        setattr(sandbox, 'description', sandbox_data.description)
    if sandbox_data.status is not None:
        setattr(sandbox, 'status', sandbox_data.status.value)
    if sandbox_data.visibility is not None:
        setattr(sandbox, 'visibility', sandbox_data.visibility.value)
    if sandbox_data.project_id is not None:
        setattr(sandbox, 'project_id', sandbox_data.project_id)

    db.commit()
    db.refresh(sandbox)

    started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
    uptime = calculate_uptime(started_at_val)

    created_at_val = safe_datetime(
        getattr(sandbox, 'created_at', None), datetime.utcnow()
    )
    updated_at_val = safe_datetime(
        getattr(sandbox, 'updated_at', None), datetime.utcnow()
    )
    last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

    # Get user display name
    user_name = (
        str(current_user.full_name) if current_user.full_name is not None
        else str(current_user.username) if current_user.username is not None
        else str(current_user.email.split('@')[0])
    )

    return SandboxResponse(
        id=str(sandbox.id),
        name=str(sandbox.name),
        description=str(sandbox.description) if sandbox.description is not None else None,
        framework=str(sandbox.framework),
        status=SandboxStatus(sandbox.status),
        user_id=str(sandbox.user_id),
        user_name=user_name,
        user_email=str(current_user.email),
        region=str(sandbox.region),
        visibility=SandboxVisibility(sandbox.visibility),
        project_id=str(sandbox.project_id) if sandbox.project_id is not None else None,
        project_name=None,
        resources=get_sandbox_resources(sandbox),
        cost=get_sandbox_cost(sandbox),
        created_at=created_at_val,
        updated_at=updated_at_val,
        last_accessed_at=last_accessed_at_val,
        uptime=uptime
    )


@router.post("/{sandbox_id}/recycle")
def recycle_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recycle a sandbox - marks it as recycled for later cleanup."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.id == sandbox_id,
        Sandbox.owner_account_id == current_user.account_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Cannot recycle an already recycled sandbox
    if str(sandbox.status) == SandboxStatus.RECYCLED.value:
        raise HTTPException(status_code=400, detail="Sandbox is already recycled")

    # Mark as recycled and set recycled timestamp
    setattr(sandbox, 'status', SandboxStatus.RECYCLED.value)
    setattr(sandbox, 'recycled_at', datetime.utcnow())
    db.commit()

    return {"message": "Sandbox recycled successfully"}


@router.post("/{sandbox_id}/start")
def start_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a sandbox."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.id == sandbox_id,
        Sandbox.owner_account_id == current_user.account_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Sandbox is already running")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.DELETED.value:
        raise HTTPException(status_code=400, detail="Cannot start a deleted sandbox")

    # Update status and timestamps
    setattr(sandbox, 'status', SandboxStatus.RUNNING.value)
    setattr(sandbox, 'last_accessed_at', datetime.utcnow())
    setattr(sandbox, 'started_at', datetime.utcnow())
    db.commit()

    return {"message": "Sandbox started successfully"}


@router.post("/{sandbox_id}/stop")
def stop_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Stop a sandbox."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.id == sandbox_id,
        Sandbox.owner_account_id == current_user.account_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.STOPPED.value:
        raise HTTPException(status_code=400, detail="Sandbox is already stopped")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.DELETED.value:
        raise HTTPException(status_code=400, detail="Cannot stop a deleted sandbox")

    # Calculate cost before stopping
    started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
    if started_at_val is not None:
        uptime_minutes = calculate_uptime(started_at_val)
        hourly_rate_val = float(getattr(sandbox, 'hourly_rate', 0.0))
        cost_increment = calculate_cost(hourly_rate_val, uptime_minutes)
        current_total_cost = float(getattr(sandbox, 'total_cost', 0.0))
        setattr(sandbox, 'total_cost', current_total_cost + cost_increment)

    # Update status and timestamps
    setattr(sandbox, 'status', SandboxStatus.STOPPED.value)
    setattr(sandbox, 'last_accessed_at', datetime.utcnow())
    setattr(sandbox, 'started_at', None)
    db.commit()

    return {"message": "Sandbox stopped successfully"}


@router.get("/{sandbox_id}/metrics")
def get_sandbox_metrics(
    sandbox_id: str,
    metric_type: str = Query("cpu", enum=["cpu", "memory", "storage"]),
    start: Optional[datetime] = Query(None),
    end: Optional[datetime] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(SandboxMetrics).filter(SandboxMetrics.sandbox_id == sandbox_id)
    if start:
        query = query.filter(SandboxMetrics.timestamp >= start)
    if end:
        query = query.filter(SandboxMetrics.timestamp <= end)
    query = query.order_by(SandboxMetrics.timestamp.asc())
    data = query.all()
    result = []
    for row in data:
        if metric_type == "cpu":
            value = row.cpu_usage
        elif metric_type == "memory":
            value = row.memory_usage
        elif metric_type == "storage":
            value = row.storage_usage
        else:
            value = None
        result.append({"timestamp": row.timestamp, "value": value})
    return {"metrics": result}


# Admin endpoints
@router.get("/admin/all", response_model=List[SandboxResponse])
def get_all_sandboxes_admin(
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db),
    status: Optional[SandboxStatus] = Query(None),
    framework: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    visibility: Optional[SandboxVisibility] = Query(None),
    user_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0)
):
    """Admin endpoint to list all sandboxes with filtering and pagination."""
    query = db.query(Sandbox)

    # Apply filters
    if status:
        query = query.filter(Sandbox.status == status.value)
    if framework:
        query = query.filter(Sandbox.framework == framework)
    if region:
        query = query.filter(Sandbox.region == region)
    if visibility:
        query = query.filter(Sandbox.visibility == visibility.value)
    if user_id:
        query = query.filter(Sandbox.owner_account_id == user_id)
    if project_id:
        query = query.filter(Sandbox.project_id == project_id)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Sandbox.name.ilike(search_term)) |
            (Sandbox.description.ilike(search_term))
        )

    # Apply sorting
    if sort_by == "name":
        query = query.order_by(
            Sandbox.name.desc() if sort_order == "desc" else Sandbox.name.asc()
        )
    elif sort_by == "status":
        query = query.order_by(
            Sandbox.status.desc() if sort_order == "desc" else Sandbox.status.asc()
        )
    # Framework sorting removed since framework is not in the model
    # elif sort_by == "framework":
    #     query = query.order_by(
    #         Sandbox.framework.desc() if sort_order == "desc" else Sandbox.framework.asc()
    #     )
    elif sort_by == "region":
        query = query.order_by(
            Sandbox.region.desc() if sort_order == "desc" else Sandbox.region.asc()
        )
    else:  # created_at
        query = query.order_by(
            Sandbox.created_at.desc() if sort_order == "desc" else Sandbox.created_at.asc()
        )

    # Apply pagination
    sandboxes = query.offset(offset).limit(limit).all()

    # Convert to response format
    result = []
    for sandbox in sandboxes:
        # Get user info
        user = db.query(User).filter(User.account_id == sandbox.owner_account_id).first()
        user_name = (
            user.full_name or user.username or user.email.split('@')[0]
            if user is not None else "Unknown"
        )
        user_email = user.email if user is not None else "unknown@example.com"

        started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
        uptime = calculate_uptime(started_at_val)

        created_at_val = safe_datetime(
            getattr(sandbox, 'created_at', None), datetime.utcnow()
        )
        updated_at_val = safe_datetime(
            getattr(sandbox, 'updated_at', None), datetime.utcnow()
        )
        last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

        result.append(SandboxResponse(
            id=str(sandbox.id),
            name=str(sandbox.name),
            description=str(sandbox.description) if sandbox.description is not None else None,
            framework=str(sandbox.framework),
            status=SandboxStatus(sandbox.status),
            user_id=str(sandbox.owner_account_id),
            user_name=str(user_name),
            user_email=str(user_email),
            region=str(sandbox.region),
            visibility=SandboxVisibility(sandbox.visibility),
            project_id=str(sandbox.project_id) if sandbox.project_id is not None else None,
            project_name=None,
            resources=get_sandbox_resources(sandbox),
            cost=get_sandbox_cost(sandbox),
            created_at=created_at_val,
            updated_at=updated_at_val,
            last_accessed_at=last_accessed_at_val,
            uptime=uptime
        ))

    return result


@router.get("/admin/stats", response_model=SandboxStats)
def get_admin_sandbox_stats(
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Get sandbox statistics for admin."""
    all_sandboxes = db.query(Sandbox).all()

    total_sandboxes = len(all_sandboxes)
    running_sandboxes = len([
        s for s in all_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value
    ])
    stopped_sandboxes = len([
        s for s in all_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.STOPPED.value
    ])
    error_sandboxes = len([
        s for s in all_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.ERROR.value
    ])
    deleted_sandboxes = len([
        s for s in all_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.DELETED.value
    ])

    total_cost = float(sum(float(getattr(s, 'total_cost', 0.0)) for s in all_sandboxes))
    avg_cpu_usage = (
        float(sum(float(getattr(s, 'cpu_usage', 0.0)) for s in all_sandboxes) / total_sandboxes)
        if total_sandboxes > 0 else 0.0
    )
    avg_memory_usage = (
        float(sum(float(getattr(s, 'memory_usage', 0.0)) for s in all_sandboxes) / total_sandboxes)
        if total_sandboxes > 0 else 0.0
    )

    total_uptime_hours = float(
        sum(calculate_uptime(getattr(s, 'started_at', None)) for s in all_sandboxes) / 60
    )

    return SandboxStats(
        total_sandboxes=total_sandboxes,
        running_sandboxes=running_sandboxes,
        stopped_sandboxes=stopped_sandboxes,
        error_sandboxes=error_sandboxes,
        deleted_sandboxes=deleted_sandboxes,
        total_cost=total_cost,
        avg_cpu_usage=avg_cpu_usage,
        avg_memory_usage=avg_memory_usage,
        total_uptime_hours=total_uptime_hours
    )


@router.post("/admin/{sandbox_id}/action")
def admin_sandbox_action(
    sandbox_id: str,
    action: str,
    reason: Optional[str] = None,
    admin_user: User = Depends(verify_admin_token),
    db: Session = Depends(get_db)
):
    """Admin endpoint to perform actions on sandboxes."""
    sandbox = db.query(Sandbox).filter(Sandbox.id == sandbox_id).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if action == "start":
        if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value:
            raise HTTPException(status_code=400, detail="Sandbox is already running")
        setattr(sandbox, 'status', SandboxStatus.RUNNING.value)
        setattr(sandbox, 'last_accessed_at', datetime.utcnow())
        setattr(sandbox, 'started_at', datetime.utcnow())
        message = "Sandbox started by admin"
    elif action == "stop":
        if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.STOPPED.value:
            raise HTTPException(status_code=400, detail="Sandbox is already stopped")
        # Calculate cost before stopping
        started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
        if started_at_val is not None:
            uptime_minutes = calculate_uptime(started_at_val)
            hourly_rate_val = float(getattr(sandbox, 'hourly_rate', 0.0))
            cost_increment = calculate_cost(hourly_rate_val, uptime_minutes)
            current_total_cost = float(getattr(sandbox, 'total_cost', 0.0))
            setattr(sandbox, 'total_cost', current_total_cost + cost_increment)
        setattr(sandbox, 'status', SandboxStatus.STOPPED.value)
        setattr(sandbox, 'last_accessed_at', datetime.utcnow())
        setattr(sandbox, 'started_at', None)
        message = "Sandbox stopped by admin"
    elif action == "delete":
        setattr(sandbox, 'status', SandboxStatus.DELETED.value)
        message = "Sandbox deleted by admin"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()

    return {"message": message, "reason": reason}
