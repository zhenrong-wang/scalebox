from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict
from datetime import datetime, timezone

from .database import get_db
from .models import Base, User, Project, Sandbox, BillingRecord
from .auth import get_current_user, get_current_user_required
from .schemas import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse, SandboxResponse
from .api_keys import get_user_projects_query, check_project_access

# Import helper functions from sandboxes module
def safe_datetime(val, default=None):
    """Safe datetime conversion"""
    if val is None:
        return default
    if isinstance(val, datetime):
        return val
    try:
        return datetime.fromisoformat(str(val).replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return default

def calculate_uptime(started_at: Optional[datetime]) -> int:
    """Calculate uptime in minutes"""
    if not started_at:
        return 0
    now = datetime.now(timezone.utc)
    if isinstance(started_at, str):
        started_at = safe_datetime(started_at)
    if not started_at:
        return 0
    
    # Ensure both datetimes are timezone-aware
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    
    diff = now - started_at
    return int(diff.total_seconds() / 60)

router = APIRouter(tags=["projects"])

def calculate_project_stats(db: Session, project_id: str) -> dict:
    """Calculate sandbox count and total spent for a project"""
    # Get the project owner
    project = db.query(Project).filter(Project.project_id == project_id).first()
    if not project:
        return {"sandbox_count": 0, "total_spent": 0.0}
    
    # Count sandboxes for this project
    sandbox_count = db.query(Sandbox).filter(
        Sandbox.project_id == project_id
    ).count()
    
    # Calculate total spent from billing records for this project
    total_spent = db.query(func.sum(BillingRecord.amount)).filter(
        BillingRecord.project_id == project_id
    ).scalar() or 0.0
    
    return {
        "sandbox_count": sandbox_count,
        "total_spent": float(total_spent)
    }

def ensure_default_project(db: Session, user: User):
    """Ensure user has a default project, create one if not exists"""
    default_project = db.query(Project).filter(
        Project.owner_user_id == user.user_id,
        Project.is_default  # type: ignore
    ).first()
    
    if not default_project:
        # Create default project
        default_project = Project(
            name="Default Project",
            description="Your default project for organizing sandboxes and resources.",
            owner_user_id=user.user_id,
            is_default=True
        )
        db.add(default_project)
        db.commit()
        db.refresh(default_project)
    
    return default_project

@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """List projects for the current user based on permissions"""
    # Ensure user has a default project
    ensure_default_project(db, current_user)
    
    # Use permission-based query
    query = get_user_projects_query(current_user, db)
    
    if status:
        query = query.filter(Project.status == status)
    
    projects = query.offset(skip).limit(limit).all()
    total = query.count()
    
    # Calculate stats for each project
    project_responses = []
    for project in projects:
        stats = calculate_project_stats(db, str(project.project_id))
        project_dict = {
            "project_id": project.project_id,
            "name": project.name,
            "description": project.description,
            "owner_account_id": project.owner_user_id,
            "status": project.status,
            "is_default": bool(project.is_default),
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "sandbox_count": stats["sandbox_count"],
            "total_spent": stats["total_spent"]
        }
        project_responses.append(ProjectResponse(**project_dict))
    
    return ProjectListResponse(
        projects=project_responses,
        total=total
    )

@router.post("/", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Create a new project"""
    # Ensure user has a default project first
    ensure_default_project(db, current_user)
    
    # Validate name length (2-255 characters)
    if len(project.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Project name must be at least 2 characters")
    if len(project.name.strip()) > 255:
        raise HTTPException(status_code=400, detail="Project name must be 255 characters or less")
    
    db_project = Project(
        name=project.name.strip(),
        description=project.description,
        owner_user_id=current_user.user_id,
        is_default=False  # New projects are never default
    )
    
    try:
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
    except Exception as e:
        db.rollback()
        # Check if it's a duplicate name error
        error_str = str(e).lower()
        if "unique_project_name_per_account" in error_str or "duplicate" in error_str:
            raise HTTPException(
                status_code=400,
                detail="A project with this name already exists. Please choose a different name."
            )
        else:
            # Re-raise other database errors
            raise HTTPException(
                status_code=500,
                detail="Failed to create project. Please try again."
            )
    
    # Calculate stats for the new project
    stats = calculate_project_stats(db, str(db_project.project_id))
    project_dict = {
        "project_id": db_project.project_id,
        "name": db_project.name,
        "description": db_project.description,
        "owner_account_id": db_project.owner_user_id,
        "status": db_project.status,
        "is_default": bool(db_project.is_default),
        "created_at": db_project.created_at,
        "updated_at": db_project.updated_at,
        "sandbox_count": stats["sandbox_count"],
        "total_spent": stats["total_spent"]
    }
    
    return ProjectResponse(**project_dict)

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Get a specific project based on permissions"""
    project = db.query(Project).filter(Project.project_id == project_id).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check permissions
    if not check_project_access(current_user, project):
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Calculate stats for the project
    stats = calculate_project_stats(db, str(project.project_id))
    project_dict = {
        "project_id": project.project_id,
        "name": project.name,
        "description": project.description,
        "owner_account_id": project.owner_user_id,
        "status": project.status,
        "is_default": bool(project.is_default),
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "sandbox_count": stats["sandbox_count"],
        "total_spent": stats["total_spent"]
    }
    
    return ProjectResponse(**project_dict)

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_update: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Update a project"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.owner_user_id == current_user.user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Prevent updating default project name
    if bool(project.is_default) and project_update.name is not None:
        raise HTTPException(
            status_code=400, 
            detail="Cannot rename the default project"
        )
    
    # Validate name if being updated
    if project_update.name is not None:
        # Validate name length (2-255 characters)
        if len(project_update.name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Project name must be at least 2 characters")
        if len(project_update.name.strip()) > 255:
            raise HTTPException(status_code=400, detail="Project name must be 255 characters or less")
        
        # Check for duplicate name per owner (excluding current project)
        existing_project = db.query(Project).filter(
            Project.name == project_update.name.strip(),
            Project.owner_user_id == current_user.user_id,
            Project.project_id != project_id
        ).first()
        if existing_project:
            raise HTTPException(status_code=400, detail="A project with this name already exists")
    
    if project_update.name is not None:
        setattr(project, 'name', project_update.name.strip())
    if project_update.description is not None:
        setattr(project, 'description', project_update.description)
    if project_update.status is not None:
        setattr(project, 'status', project_update.status)
    
    setattr(project, 'updated_at', datetime.now(timezone.utc))
    
    try:
        db.commit()
        db.refresh(project)
    except Exception as e:
        db.rollback()
        # Check if it's a duplicate name error from database constraint
        error_str = str(e).lower()
        if "unique_project_name_per_account" in error_str or "duplicate" in error_str:
            raise HTTPException(
                status_code=400,
                detail="A project with this name already exists"
            )
        else:
            # Re-raise other database errors
            raise HTTPException(
                status_code=500,
                detail="Failed to update project. Please try again."
            )
    
    # Calculate stats for the updated project
    stats = calculate_project_stats(db, project_id)
    project_dict = {
        "project_id": project.project_id,
        "name": project.name,
        "description": project.description,
        "owner_account_id": project.owner_user_id,
        "status": project.status,
        "is_default": bool(project.is_default),
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "sandbox_count": stats["sandbox_count"],
        "total_spent": stats["total_spent"]
    }
    
    return ProjectResponse(**project_dict)

@router.get("/{project_id}/sandboxes", response_model=List[SandboxResponse])
async def list_project_sandboxes(
    project_id: str,
    skip: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """List sandboxes in a specific project"""
    # Verify project exists and user has access
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.owner_user_id == current_user.user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Query sandboxes in this project
    query = db.query(Sandbox).filter(Sandbox.project_id == project_id)
    
    if status:
        query = query.filter(Sandbox.status == status)
    
    sandboxes = query.offset(skip).limit(limit).all()
    
    # Convert to response format
    sandbox_responses = []
    for sandbox in sandboxes:
        # Get user info for the sandbox
        user = db.query(User).filter(User.user_id == sandbox.owner_user_id).first()
        user_name = (
            user.display_name or user.username or user.email.split('@')[0]
            if user is not None else "Unknown"
        )
        user_email = user.email if user is not None else "unknown@example.com"
        
        # Get project name
        project_name = project.name if project else "Unknown Project"
        
        # Get template info
        template_name = None
        if getattr(sandbox, 'template_id', None) is not None:
            from .templates import Template
            template = db.query(Template).filter(Template.template_id == sandbox.template_id).first()
            template_name = str(template.name) if template is not None else None
        
        # Calculate uptime
        started_at_val = safe_datetime(getattr(sandbox, 'started_at', None))
        uptime = calculate_uptime(started_at_val)
        
        sandbox_dict = {
            "id": str(sandbox.sandbox_id),
            "name": str(sandbox.name),
            "description": str(sandbox.description) if sandbox.description is not None else None,
            "status": sandbox.status,
            "user_account_id": str(sandbox.owner_user_id),
            "user_name": str(user_name),
            "user_email": str(user_email),
            "project_id": str(sandbox.project_id) if sandbox.project_id is not None else None,
            "project_name": str(project_name),
            "template_id": str(sandbox.template_id) if sandbox.template_id is not None else None,
            "template_name": template_name,
            "resources": {
                "cpu": float(getattr(sandbox, 'cpu_usage', 0) or 0),
                "memory": float(getattr(sandbox, 'memory_usage', 0) or 0),
                "storage": float(getattr(sandbox, 'storage_usage', 0) or 0),
                "bandwidth": float(getattr(sandbox, 'bandwidth_usage', 0) or 0)
            },
            "cpu_spec": float(getattr(sandbox, 'cpu_spec', 0) or 0),
            "memory_spec": float(getattr(sandbox, 'memory_spec', 0) or 0),
            "cost": {
                "hourlyRate": float(getattr(sandbox, 'hourly_rate', 0) or 0),
                "totalCost": float(getattr(sandbox, 'total_cost', 0) or 0)
            },
            "created_at": safe_datetime(sandbox.created_at),
            "updated_at": safe_datetime(sandbox.updated_at),
            "last_accessed_at": safe_datetime(getattr(sandbox, 'last_accessed_at', None)),
            "uptime": uptime
        }
        sandbox_responses.append(SandboxResponse(**sandbox_dict))
    
    return sandbox_responses

@router.post("/{project_id}/sandboxes/{sandbox_id}/evict")
async def evict_sandbox_from_project(
    project_id: str,
    sandbox_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Evict a sandbox from a project (move to default project)"""
    # Verify project exists and user has access
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.owner_user_id == current_user.user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Prevent evicting from default project
    if bool(project.is_default):
        raise HTTPException(status_code=400, detail="Cannot evict sandboxes from the default project")
    
    # Find the sandbox
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.project_id == project_id
    ).first()
    
    if not sandbox:
        raise HTTPException(status_code=404, detail="Sandbox not found in this project")
    
    # Prevent evicting archived sandboxes
    if str(sandbox.status) == "archived":
        raise HTTPException(status_code=400, detail="Cannot evict archived sandboxes")
    
    # Get or create default project
    default_project = ensure_default_project(db, current_user)
    
    # Move sandbox to default project
    setattr(sandbox, 'project_id', str(default_project.project_id))
    setattr(sandbox, 'updated_at', datetime.now(timezone.utc))
    
    db.commit()
    db.refresh(sandbox)
    
    return {"message": f"Sandbox '{sandbox.name}' moved to default project"}

@router.post("/{project_id}/sandboxes/{sandbox_id}/add")
async def add_sandbox_to_project(
    project_id: str,
    sandbox_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Add a sandbox to a project (only from default project)"""
    # Verify project exists and user has access
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.owner_user_id == current_user.user_id
    ).first()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find the sandbox (must belong to the same user)
    sandbox = db.query(Sandbox).filter(
        Sandbox.sandbox_id == sandbox_id,
        Sandbox.owner_user_id == current_user.user_id
    ).first()
    if sandbox is None:
        raise HTTPException(status_code=404, detail="Sandbox not found")

    # Prevent adding archived sandboxes
    if str(sandbox.status) == "archived":
        raise HTTPException(status_code=400, detail="Cannot add archived sandboxes to projects")

    # Check if sandbox is already in this project
    if str(sandbox.project_id) == project_id:
        raise HTTPException(status_code=400, detail="Sandbox is already in this project")

    # Only allow adding from default project
    default_project = ensure_default_project(db, current_user)
    if str(sandbox.project_id) != str(default_project.project_id):
        raise HTTPException(status_code=400, detail="Can only add sandboxes from the default project")

    # Move sandbox to this project
    setattr(sandbox, 'project_id', project_id)
    setattr(sandbox, 'updated_at', datetime.now(timezone.utc))
    db.commit()
    db.refresh(sandbox)
    return {"message": f"Sandbox '{sandbox.name}' added to project '{project.name}'"}

@router.delete("/{project_id}", response_model=Dict[str, str])
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Delete a project - move all sandboxes to default project first"""
    project = db.query(Project).filter(
        Project.project_id == project_id,
        Project.owner_user_id == current_user.user_id
    ).first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Check if it's a default project
    if project.is_default:  # type: ignore
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete the default project"
        )
    
    # Get or create default project
    default_project = ensure_default_project(db, current_user)
    
    # Move all sandboxes to default project
    sandboxes = db.query(Sandbox).filter(Sandbox.project_id == project_id).all()
    for sandbox in sandboxes:
        setattr(sandbox, 'project_id', str(default_project.project_id))
        setattr(sandbox, 'updated_at', datetime.now(timezone.utc))
    
    # Delete the project
    db.delete(project)
    db.commit()
    
    return {"message": f"Project deleted successfully. {len(sandboxes)} sandbox(es) moved to default project."} 