from datetime import timezone
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
from .projects import Project
from .users import verify_admin_token
from .schemas import SandboxResponse
from .auth import get_current_user_required
from .api_keys import get_user_sandboxes_query, check_sandbox_access
from datetime import datetime


router = APIRouter(tags=["sandboxes"])


# Enums
class SandboxStatus(str, Enum):
    STARTING = "starting"
    RUNNING = "running"
    STOPPED = "stopped"
    TIMEOUT = "timeout"
    ARCHIVED = "archived"


# Pydantic models for API requests/responses
class SandboxCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    cpu_spec: float = Field(..., ge=1.0, le=8.0)  # 1-8 vCPU
    memory_spec: float = Field(..., ge=0.5, le=16.0)  # 0.5-16 GB
    project_id: Optional[str] = None


class SandboxUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[SandboxStatus] = None
    project_id: Optional[str] = None





class SandboxFilters(BaseModel):
    status: Optional[List[SandboxStatus]] = None
    user_id: Optional[str] = None
    project_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None


class SandboxStats(BaseModel):
    total_sandboxes: int
    running_sandboxes: int
    stopped_sandboxes: int
    timeout_sandboxes: int
    archived_sandboxes: int
    total_cost: float
    avg_cpu_usage: float
    avg_memory_usage: float
    total_uptime_hours: float


class SwitchProjectRequest(BaseModel):
    project_id: str


# Helper functions
def calculate_uptime(started_at: Optional[datetime]) -> int:
    if not started_at:
        return 0
    now = datetime.now(timezone.utc)
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
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db),
    status: Optional[SandboxStatus] = Query(None),
    project_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0)
):
    """List sandboxes for the current user with filtering and pagination."""
    query = get_user_sandboxes_query(current_user, db)

    # Apply filters
    if status:
        query = query.filter(Sandbox.status == status.value)
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
            getattr(sandbox, 'created_at', None), datetime.now(timezone.utc)
        )
        updated_at_val = safe_datetime(
            getattr(sandbox, 'updated_at', None), datetime.now(timezone.utc)
        )
        last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

        # Get user display name
        user_name = (
            str(current_user.display_name) if current_user.display_name is not None
            else str(current_user.username) if current_user.username is not None
            else str(current_user.email.split('@')[0])
        )

        # Get project info
        project_name = None
        if getattr(sandbox, 'project_id', None) is not None:
            project = db.query(Project).filter(Project.project_id == sandbox.project_id).first()
            project_name = str(project.name) if project is not None else None

        # Get template info
        template_name = None
        if getattr(sandbox, 'template_id', None) is not None:
            from .templates import Template
            template = db.query(Template).filter(Template.template_id == sandbox.template_id).first()
            template_name = str(template.name) if template is not None else None

        result.append(SandboxResponse(
            id=str(getattr(sandbox, 'sandbox_id', '')),
            name=str(getattr(sandbox, 'name', '')),
            description=str(getattr(sandbox, 'description', ''))
            if getattr(sandbox, 'description', None) is not None else None,
            status=SandboxStatus(str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value))),
            user_account_id=str(getattr(sandbox, 'owner_user_id', '')),
            user_name=user_name,
            user_email=str(current_user.email),
            project_id=str(getattr(sandbox, 'project_id', ''))
            if getattr(sandbox, 'project_id', None) is not None else None,
            project_name=project_name,
            template_id=str(getattr(sandbox, 'template_id', '')) if getattr(sandbox, 'template_id', None) is not None else None,
            template_name=template_name,
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
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get sandbox statistics for the current user."""
    user_sandboxes = db.query(Sandbox).filter(Sandbox.owner_user_id == current_user.user_id).all()

    total_sandboxes = len(user_sandboxes)
    running_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value
    ])
    stopped_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.STOPPED.value
    ])
    timeout_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.TIMEOUT.value
    ])
    archived_sandboxes = len([
        s for s in user_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.ARCHIVED.value
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
        timeout_sandboxes=timeout_sandboxes,
        archived_sandboxes=archived_sandboxes,
        total_cost=total_cost,
        avg_cpu_usage=avg_cpu_usage,
        avg_memory_usage=avg_memory_usage,
        total_uptime_hours=total_uptime_hours
    )


@router.post("/", response_model=SandboxResponse)
def create_sandbox(
    sandbox_data: SandboxCreateRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Create a new sandbox for the current user."""
    # Validate name length (2-100 characters)
    if len(sandbox_data.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Sandbox name must be at least 2 characters")
    if len(sandbox_data.name.strip()) > 100:
        raise HTTPException(status_code=400, detail="Sandbox name must be 100 characters or less")
    
    # Check for duplicate name per owner
    existing_sandbox = db.query(Sandbox).filter(
        Sandbox.name == sandbox_data.name.strip(),
        Sandbox.owner_user_id == current_user.user_id
    ).first()
    if existing_sandbox:
        raise HTTPException(status_code=400, detail="A sandbox with this name already exists")
    
    # Create new sandbox
    new_sandbox = Sandbox(
        name=sandbox_data.name.strip(),
        description=sandbox_data.description,
        template_id="default-template-id",  # TODO: Get from request or use default
        status=SandboxStatus.STOPPED,
        owner_user_id=current_user.user_id,
        project_id=sandbox_data.project_id,
        cpu_spec=sandbox_data.cpu_spec,
        memory_spec=sandbox_data.memory_spec
    )

    try:
        db.add(new_sandbox)
        db.commit()
        db.refresh(new_sandbox)
    except Exception as e:
        db.rollback()
        # Check if it's a duplicate name error from database constraint
        error_str = str(e).lower()
        if "unique_sandbox_name_per_owner" in error_str or "duplicate" in error_str:
            raise HTTPException(
                status_code=400,
                detail="A sandbox with this name already exists"
            )
        else:
            # Re-raise other database errors
            raise HTTPException(
                status_code=500,
                detail="Failed to create sandbox. Please try again."
            )

    # Return response
    started_at_val = safe_datetime(getattr(new_sandbox, 'started_at', None))
    uptime = calculate_uptime(started_at_val)

    created_at_val = safe_datetime(
        getattr(new_sandbox, 'created_at', None), datetime.now(timezone.utc)
    )
    updated_at_val = safe_datetime(
        getattr(new_sandbox, 'updated_at', None), datetime.now(timezone.utc)
    )
    last_accessed_at_val = safe_datetime(getattr(new_sandbox, 'last_accessed_at', None))

    # Get user display name
    user_name = (
        str(current_user.display_name) if current_user.display_name is not None
        else str(current_user.username) if current_user.username is not None
        else str(current_user.email.split('@')[0])
    )

    # Get template info
    template_name = None
    if new_sandbox.template_id is not None:
        from .templates import Template
        template = db.query(Template).filter(Template.template_id == new_sandbox.template_id).first()
        template_name = str(template.name) if template is not None else None

    return SandboxResponse(
        id=str(new_sandbox.sandbox_id),
        name=str(new_sandbox.name),
        description=str(new_sandbox.description) if new_sandbox.description is not None else None,
        status=SandboxStatus(new_sandbox.status),
        user_account_id=str(new_sandbox.owner_user_id),
        user_name=user_name,
        user_email=str(current_user.email),
        project_id=str(new_sandbox.project_id) if new_sandbox.project_id is not None else None,
        project_name=None,
        template_id=str(new_sandbox.template_id) if new_sandbox.template_id is not None else None,
        template_name=template_name,
        resources=get_sandbox_resources(new_sandbox),
        cost=get_sandbox_cost(new_sandbox),
        created_at=created_at_val,
        updated_at=updated_at_val,
        last_accessed_at=last_accessed_at_val,
        uptime=uptime,
        cpu_spec=getattr(new_sandbox, 'cpu_spec', None),
        memory_spec=getattr(new_sandbox, 'memory_spec', None)
    )


@router.get("/{sandbox_id}", response_model=SandboxResponse)
def get_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Get a specific sandbox by ID based on permissions."""
    sandbox = db.query(Sandbox).filter(Sandbox.sandbox_id == sandbox_id).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Check permissions
    if not check_sandbox_access(current_user, sandbox):
        raise HTTPException(status_code=403, detail="Access denied")

    started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
    uptime = calculate_uptime(started_at_val)

    created_at_val = safe_datetime(
        getattr(sandbox, 'created_at', None), datetime.now(timezone.utc)
    )
    updated_at_val = safe_datetime(
        getattr(sandbox, 'updated_at', None), datetime.now(timezone.utc)
    )
    last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

    # Get user display name
    user_name = (
        str(current_user.display_name) if current_user.display_name is not None
        else str(current_user.username) if current_user.username is not None
        else str(current_user.email.split('@')[0])
    )

    # Get project info
    project_name = None
    if getattr(sandbox, 'project_id', None) is not None:
        project = db.query(Project).filter(Project.project_id == sandbox.project_id).first()
        project_name = str(project.name) if project is not None else None

    # Get template info
    template_name = None
    if getattr(sandbox, 'template_id', None) is not None:
        from .templates import Template
        template = db.query(Template).filter(Template.template_id == sandbox.template_id).first()
        template_name = str(template.name) if template is not None else None

    return SandboxResponse(
        id=str(getattr(sandbox, 'sandbox_id', '')),
        name=str(getattr(sandbox, 'name', '')),
        description=str(getattr(sandbox, 'description', ''))
        if getattr(sandbox, 'description', None) is not None else None,
        status=SandboxStatus(str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value))),
        user_account_id=str(getattr(sandbox, 'owner_user_id', '')),
        user_name=user_name,
        user_email=str(current_user.email),
        project_id=str(getattr(sandbox, 'project_id', ''))
        if getattr(sandbox, 'project_id', None) is not None else None,
        project_name=project_name,
        template_id=str(getattr(sandbox, 'template_id', '')) if getattr(sandbox, 'template_id', None) is not None else None,
        template_name=template_name,
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
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Update a sandbox."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.owner_user_id == current_user.user_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Validate name if being updated
    if sandbox_data.name is not None:
        # Validate name length (2-100 characters)
        if len(sandbox_data.name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Sandbox name must be at least 2 characters")
        if len(sandbox_data.name.strip()) > 100:
            raise HTTPException(status_code=400, detail="Sandbox name must be 100 characters or less")
        
        # Check for duplicate name per owner (excluding current sandbox)
        existing_sandbox = db.query(Sandbox).filter(
            Sandbox.name == sandbox_data.name.strip(),
            Sandbox.owner_user_id == current_user.user_id,
            Sandbox.sandbox_id != sandbox_id
        ).first()
        if existing_sandbox:
            raise HTTPException(status_code=400, detail="A sandbox with this name already exists")

    # Update fields if provided
    if sandbox_data.name is not None:
        setattr(sandbox, 'name', sandbox_data.name.strip())
    if sandbox_data.description is not None:
        setattr(sandbox, 'description', sandbox_data.description)
    if sandbox_data.status is not None:
        setattr(sandbox, 'status', sandbox_data.status.value)
    if sandbox_data.project_id is not None:
        setattr(sandbox, 'project_id', sandbox_data.project_id)

    try:
        db.commit()
        db.refresh(sandbox)
    except Exception as e:
        db.rollback()
        # Check if it's a duplicate name error from database constraint
        error_str = str(e).lower()
        if "unique_sandbox_name_per_owner" in error_str or "duplicate" in error_str:
            raise HTTPException(
                status_code=400,
                detail="A sandbox with this name already exists"
            )
        else:
            # Re-raise other database errors
            raise HTTPException(
                status_code=500,
                detail="Failed to update sandbox. Please try again."
            )

    started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
    uptime = calculate_uptime(started_at_val)

    created_at_val = safe_datetime(
        getattr(sandbox, 'created_at', None), datetime.now(timezone.utc)
    )
    updated_at_val = safe_datetime(
        getattr(sandbox, 'updated_at', None), datetime.now(timezone.utc)
    )
    last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

    # Get user display name
    user_name = (
        str(current_user.display_name) if current_user.display_name is not None
        else str(current_user.username) if current_user.username is not None
        else str(current_user.email.split('@')[0])
    )

    # Get project info
    project_name = None
    if sandbox.project_id is not None:
        project = db.query(Project).filter(Project.project_id == sandbox.project_id).first()
        project_name = str(project.name) if project is not None else None

    # Get template info
    template_name = None
    if sandbox.template_id is not None:
        from .templates import Template
        template = db.query(Template).filter(Template.template_id == sandbox.template_id).first()
        template_name = str(template.name) if template is not None else None

    return SandboxResponse(
        id=str(sandbox.sandbox_id),
        name=str(sandbox.name),
        description=str(sandbox.description) if sandbox.description is not None else None,
        status=SandboxStatus(sandbox.status),
        user_account_id=str(sandbox.owner_user_id),
        user_name=user_name,
        user_email=str(current_user.email),
        project_id=str(sandbox.project_id) if sandbox.project_id is not None else None,
        project_name=project_name,
        template_id=str(sandbox.template_id) if sandbox.template_id is not None else None,
        template_name=template_name,
        resources=get_sandbox_resources(sandbox),
        cost=get_sandbox_cost(sandbox),
        created_at=created_at_val,
        updated_at=updated_at_val,
        last_accessed_at=last_accessed_at_val,
        uptime=uptime,
        cpu_spec=getattr(sandbox, 'cpu_spec', None),
        memory_spec=getattr(sandbox, 'memory_spec', None)
    )


@router.post("/{sandbox_id}/archive")
def archive_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Archive a sandbox - marks it as archived for retention of metrics and usage data."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.owner_user_id == current_user.user_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Cannot archive an already archived sandbox
    if str(sandbox.status) == SandboxStatus.ARCHIVED.value:
        raise HTTPException(status_code=400, detail="Sandbox is already archived")

    # Mark as archived and set archived timestamp
    setattr(sandbox, 'status', SandboxStatus.ARCHIVED.value)
    setattr(sandbox, 'archived_at', datetime.now(timezone.utc))
    db.commit()

    return {"message": "Sandbox archived successfully"}


@router.post("/{sandbox_id}/start")
def start_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Start a sandbox."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.owner_user_id == current_user.user_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value:
        raise HTTPException(status_code=400, detail="Sandbox is already running")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.ARCHIVED.value:
        raise HTTPException(status_code=400, detail="Cannot start an archived sandbox")

    # Update status and timestamps
    setattr(sandbox, 'status', SandboxStatus.RUNNING.value)
    setattr(sandbox, 'last_accessed_at', datetime.now(timezone.utc))
    setattr(sandbox, 'started_at', datetime.now(timezone.utc))
    db.commit()

    return {"message": "Sandbox started successfully"}


@router.post("/{sandbox_id}/stop")
def stop_sandbox(
    sandbox_id: str,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Stop a sandbox."""
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.owner_user_id == current_user.user_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.STOPPED.value:
        raise HTTPException(status_code=400, detail="Sandbox is already stopped")

    if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.ARCHIVED.value:
        raise HTTPException(status_code=400, detail="Cannot stop an archived sandbox")

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
    setattr(sandbox, 'last_accessed_at', datetime.now(timezone.utc))
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
    if user_id:
        query = query.filter(Sandbox.owner_user_id == user_id)
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
        user = db.query(User).filter(User.user_id == sandbox.owner_user_id).first()
        user_name = (
            user.display_name or user.username or user.email.split('@')[0]
            if user is not None else "Unknown"
        )
        user_email = user.email if user is not None else "unknown@example.com"

        started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
        uptime = calculate_uptime(started_at_val)

        created_at_val = safe_datetime(
            getattr(sandbox, 'created_at', None), datetime.now(timezone.utc)
        )
        updated_at_val = safe_datetime(
            getattr(sandbox, 'updated_at', None), datetime.now(timezone.utc)
        )
        last_accessed_at_val = safe_datetime(getattr(sandbox, 'last_accessed_at', None))

        # Get project info
        project_name = None
        if sandbox.project_id is not None:
            project = db.query(Project).filter(Project.project_id == sandbox.project_id).first()
            project_name = str(project.name) if project is not None else None

        # Get template info
        template_name = None
        if sandbox.template_id is not None:
            from .templates import Template
            template = db.query(Template).filter(Template.template_id == sandbox.template_id).first()
            template_name = str(template.name) if template is not None else None

        result.append(SandboxResponse(
            id=str(sandbox.sandbox_id),
            name=str(sandbox.name),
            description=str(sandbox.description) if sandbox.description is not None else None,
            status=SandboxStatus(sandbox.status),
            user_account_id=str(sandbox.owner_user_id),
            user_name=str(user_name),
            user_email=str(user_email),
            project_id=str(sandbox.project_id) if sandbox.project_id is not None else None,
            project_name=project_name,
            template_id=str(sandbox.template_id) if sandbox.template_id is not None else None,
            template_name=template_name,
            resources=get_sandbox_resources(sandbox),
            cost=get_sandbox_cost(sandbox),
            created_at=created_at_val,
            updated_at=updated_at_val,
            last_accessed_at=last_accessed_at_val,
            uptime=uptime,
            cpu_spec=getattr(sandbox, 'cpu_spec', None),
            memory_spec=getattr(sandbox, 'memory_spec', None)
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
    timeout_sandboxes = len([
        s for s in all_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.TIMEOUT.value
    ])
    archived_sandboxes = len([
        s for s in all_sandboxes
        if str(getattr(s, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.ARCHIVED.value
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
        timeout_sandboxes=timeout_sandboxes,
        archived_sandboxes=archived_sandboxes,
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
    sandbox = db.query(Sandbox).filter(Sandbox.sandbox_id == sandbox_id).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    if action == "start":
        if str(getattr(sandbox, 'status', SandboxStatus.STOPPED.value)) == SandboxStatus.RUNNING.value:
            raise HTTPException(status_code=400, detail="Sandbox is already running")
        setattr(sandbox, 'status', SandboxStatus.RUNNING.value)
        setattr(sandbox, 'last_accessed_at', datetime.now(timezone.utc))
        setattr(sandbox, 'started_at', datetime.now(timezone.utc))
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
        setattr(sandbox, 'last_accessed_at', datetime.now(timezone.utc))
        setattr(sandbox, 'started_at', None)
        message = "Sandbox stopped by admin"
    elif action == "archive":
        setattr(sandbox, 'status', SandboxStatus.ARCHIVED.value)
        setattr(sandbox, 'archived_at', datetime.now(timezone.utc))
        message = "Sandbox archived by admin"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()

    return {"message": message, "reason": reason}

@router.post("/{sandbox_id}/switch-project")
def switch_sandbox_project(
    sandbox_id: str,
    req: SwitchProjectRequest,
    current_user: User = Depends(get_current_user_required),
    db: Session = Depends(get_db)
):
    """Switch a sandbox to a different project."""
    # Find the sandbox
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.owner_user_id == current_user.user_id
    ).first()

    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Prevent switching archived sandboxes
    if str(sandbox.status) == SandboxStatus.ARCHIVED.value:
        raise HTTPException(status_code=400, detail="Cannot switch archived sandboxes between projects")

    # Verify the target project exists and user has access
    from .projects import Project
    project = db.query(Project).filter(
        Project.project_id == req.project_id,
        Project.owner_user_id == current_user.user_id
    ).first()

    if not project:
        raise HTTPException(status_code=404, detail="Target project not found")

    # Check if sandbox is already in this project
    if str(sandbox.project_id) == req.project_id:
        raise HTTPException(status_code=400, detail="Sandbox is already in this project")
    
    # Move sandbox to the new project
    setattr(sandbox, 'project_id', req.project_id)
    setattr(sandbox, 'updated_at', datetime.now(timezone.utc))

    db.commit()
    db.refresh(sandbox)

    return {"message": f"Sandbox '{sandbox.name}' moved to project '{project.name}'"}
