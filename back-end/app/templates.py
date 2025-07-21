from datetime import timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

from .database import get_db
from .models import Template, Notification, User, generate_template_id
from .auth import get_current_user, get_current_user_required, get_current_admin_user
from .schemas import (
    TemplateCreate, TemplateUpdate, TemplateResponse,
    TemplateListResponse
)


router = APIRouter(tags=["templates"])

# Configuration
OFFICIAL_REPO_PREFIX = "https://github.com/scalebox/official-templates/"
PRIVATE_REPO_PREFIX = "https://github.com/scalebox/private-templates/"


def generate_repository_url(template_id: str, is_official: bool = False) -> str:
    """Generate repository URL based on template type"""
    if is_official:
        return f"{OFFICIAL_REPO_PREFIX}{template_id}"
    else:
        return f"{PRIVATE_REPO_PREFIX}{template_id}"


def template_to_response(template: Template) -> TemplateResponse:
    """Convert Template model to TemplateResponse"""
    return TemplateResponse(
        id=getattr(template, 'template_id'),
        name=getattr(template, 'name'),
        description=getattr(template, 'description'),
        category=getattr(template, 'category'),
        language=getattr(template, 'language'),
        cpu_spec=getattr(template, 'min_cpu_required'),
        memory_spec=getattr(template, 'min_memory_required'),
        is_official=getattr(template, 'is_official'),
        is_public=getattr(template, 'is_public'),
        owner_id=getattr(template.owner, 'id', None) if template.owner else None,
        repository_url=getattr(template, 'repository_url'),
        tags=getattr(template, 'tags'),
        created_at=getattr(template, 'created_at'),
        updated_at=getattr(template, 'updated_at')
    )


@router.get("/", response_model=TemplateListResponse)
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    language: Optional[str] = None,
    is_official: Optional[bool] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Get templates with filtering - users can see official/public templates and their own private templates"""
    query = db.query(Template)

    # Apply filters
    if category:
        query = query.filter(Template.category == category)
    if language:
        query = query.filter(Template.language == language)
    if is_official is not None:
        query = query.filter(Template.is_official.is_(is_official))
    if is_public is not None:
        query = query.filter(Template.is_public.is_(is_public))

    # Permission filtering: users can see official templates, public templates, and their own private templates
    if getattr(current_user, 'role', 'user') != 'admin':
        query = query.filter(
            (Template.is_official.is_(True))
            | (Template.is_public.is_(True))
            | (Template.owner_user_id == current_user.user_id)
        )

    templates = query.offset(skip).limit(limit).all()

    return TemplateListResponse(
        templates=[template_to_response(template) for template in templates],
        total=query.count()
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Get a specific template by ID"""
    template = db.query(Template).filter(Template.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check permissions
    if getattr(current_user, 'role', 'user') != 'admin':
        if not getattr(template, 'is_official', False) and not getattr(template, 'is_public', False) and getattr(template, 'owner_user_id', None) != getattr(current_user, 'user_id', None):
            raise HTTPException(status_code=403, detail="Access denied")

    return template_to_response(template)


@router.post("/", response_model=TemplateResponse)
async def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Create a new template - only for private templates"""
    if template_data.is_official and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create official templates")

    # Validate name length (2-255 characters)
    if len(template_data.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Template name must be at least 2 characters")
    if len(template_data.name.strip()) > 255:
        raise HTTPException(status_code=400, detail="Template name must be 255 characters or less")

    # Generate template ID and repository URL
    template_id = generate_template_id()
    repository_url = generate_repository_url(template_id, template_data.is_official)

    # Check for duplicate name per owner
    existing_template = db.query(Template).filter(
        Template.name == template_data.name.strip(),
        Template.owner_user_id == current_user.user_id
    ).first()
    if existing_template:
        raise HTTPException(status_code=400, detail="Template name already exists for this user")

    template = Template(
        template_id=template_id,
        name=template_data.name.strip(),
        description=template_data.description,
        category=template_data.category,
        language=template_data.language,
        min_cpu_required=template_data.cpu_spec,
        min_memory_required=template_data.memory_spec,
        is_official=template_data.is_official,
        is_public=template_data.is_public,
        owner_user_id=current_user.user_id if not template_data.is_official else None,
        repository_url=repository_url,
        tags=template_data.tags
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return template_to_response(template)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Update a template - only owner or admin can update"""
    template = db.query(Template).filter(Template.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check permissions
    if getattr(current_user, 'role', 'user') != 'admin' and getattr(template, 'owner_user_id', None) != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Official templates can only be updated by admins
    if getattr(template, 'is_official', False) and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update official templates")

    # Validate name if being updated
    if template_data.name is not None:
        # Validate name length (2-255 characters)
        if len(template_data.name.strip()) < 2:
            raise HTTPException(status_code=400, detail="Template name must be at least 2 characters")
        if len(template_data.name.strip()) > 255:
            raise HTTPException(status_code=400, detail="Template name must be 255 characters or less")
        
        # Check for duplicate name per owner (excluding current template)
        existing_template = db.query(Template).filter(
            Template.name == template_data.name.strip(),
            Template.owner_user_id == current_user.user_id,
            Template.template_id != template_id
        ).first()
        if existing_template:
            raise HTTPException(status_code=400, detail="A template with this name already exists")

    # Update fields
    update_data = template_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == 'name':
            setattr(template, field, value.strip())
        elif field == 'cpu_spec':
            setattr(template, 'min_cpu_required', value)
        elif field == 'memory_spec':
            setattr(template, 'min_memory_required', value)
        else:
            setattr(template, field, value)

    # Update the updated_at field using setattr to avoid SQLAlchemy column assignment issues
    setattr(template, 'updated_at', datetime.now(timezone.utc))
    
    try:
        db.commit()
        db.refresh(template)
    except Exception as e:
        db.rollback()
        # Check if it's a duplicate name error from database constraint
        error_str = str(e).lower()
        if "unique_template_name_per_owner" in error_str or "duplicate" in error_str:
            raise HTTPException(
                status_code=400,
                detail="A template with this name already exists"
            )
        else:
            # Re-raise other database errors
            raise HTTPException(
                status_code=500,
                detail="Failed to update template. Please try again."
            )

    return template_to_response(template)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Delete a template - only owner or admin can delete. Allow deletion even if sandboxes reference it."""
    template = db.query(Template).filter(Template.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check permissions
    if getattr(current_user, 'role', 'user') != 'admin' and getattr(template, 'owner_user_id', None) != current_user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Official and public templates can only be deleted by admins
    if getattr(template, 'is_official', False) and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete official templates")
    
    if getattr(template, 'is_public', False) and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete public templates")

    # No longer check for sandboxes using this template. Allow deletion.

    # Send notification if admin is deleting
    if getattr(current_user, 'role', 'user') == 'admin' and getattr(template, 'owner_user_id', None):
        notification = Notification(
            user_id=template.owner_user_id,
            title="Template Deleted by Admin",
            message=f"Your template '{template.name}' has been deleted by an administrator.",
            type="warning",
            related_entity_type="template",
            related_entity_id=template_id
        )
        db.add(notification)

    db.delete(template)
    db.commit()

    return {"message": "Template deleted successfully"}


# Admin endpoints
@router.get("/admin/all", response_model=TemplateListResponse)
async def admin_get_all_templates(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to get all templates"""
    query = db.query(Template)
    templates = query.offset(skip).limit(limit).all()

    return TemplateListResponse(
        templates=[template_to_response(template) for template in templates],
        total=query.count()
    )


@router.post("/admin/{template_id}/make-official")
async def admin_make_template_official(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to make a template official"""
    template = db.query(Template).filter(Template.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if getattr(template, 'is_official', False):
        raise HTTPException(status_code=400, detail="Template is already official")

    setattr(template, 'is_official', True)
    setattr(template, 'owner_user_id', None)  # Official templates have no owner
    setattr(template, 'updated_at', datetime.now(timezone.utc))

    # Send notification to original owner if exists
    if getattr(template, 'owner_user_id', None):
        notification = Notification(
            user_id=template.owner_user_id,
            title="Template Made Official",
            message=f"Your template '{template.name}' has been made official by an administrator.",
            type="info",
            related_entity_type="template",
            related_entity_id=template_id
        )
        db.add(notification)

    db.commit()

    return {"message": f"Template '{template.name}' made official successfully"}


@router.post("/admin/{template_id}/make-public")
async def admin_make_template_public(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to make a template public"""
    template = db.query(Template).filter(Template.template_id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if getattr(template, 'is_public', False):
        raise HTTPException(status_code=400, detail="Template is already public")

    setattr(template, 'is_public', True)
    setattr(template, 'updated_at', datetime.now(timezone.utc))

    # Send notification to owner
    if getattr(template, 'owner_user_id', None):
        notification = Notification(
            user_id=template.owner_user_id,
            title="Template Made Public",
            message=f"Your template '{template.name}' has been made public by an administrator.",
            type="info",
            related_entity_type="template",
            related_entity_id=template_id
        )
        db.add(notification)

    db.commit()

    return {"message": f"Template '{template.name}' made public successfully"} 