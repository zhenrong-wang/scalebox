from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid

from .database import get_db
from .models import Template, Notification, User
from .auth import get_current_user, get_current_user_required, get_current_admin_user
from .schemas import (
    TemplateCreate, TemplateUpdate, TemplateResponse,
    TemplateListResponse
)


router = APIRouter(prefix="/api/templates", tags=["templates"])

# Configuration
OFFICIAL_REPO_PREFIX = "https://github.com/scalebox/official-templates/"
PRIVATE_REPO_PREFIX = "https://github.com/scalebox/private-templates/"


def generate_repository_url(template_id: str, is_official: bool = False) -> str:
    """Generate repository URL based on template type"""
    if is_official:
        return f"{OFFICIAL_REPO_PREFIX}{template_id}"
    else:
        return f"{PRIVATE_REPO_PREFIX}{template_id}"


@router.get("/", response_model=TemplateListResponse)
async def get_templates(
    skip: int = 0,
    limit: int = 100,
    category: Optional[str] = None,
    language: Optional[str] = None,
    is_official: Optional[bool] = None,
    is_public: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
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
    if not current_user or getattr(current_user, 'role', 'user') != 'admin':
        query = query.filter(
            (Template.is_official.is_(True))
            | (Template.is_public.is_(True))
            | (current_user and Template.owner_account_id == current_user.id)
        )

    templates = query.offset(skip).limit(limit).all()

    return TemplateListResponse(
        templates=[TemplateResponse.from_orm(template) for template in templates],
        total=query.count()
    )


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Get a specific template by ID"""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check permissions
    if not current_user or getattr(current_user, 'role', 'user') != 'admin':
        if not getattr(template, 'is_official', False) and not getattr(template, 'is_public', False) and getattr(template, 'owner_account_id', None) != getattr(current_user, 'id', None):
            raise HTTPException(status_code=403, detail="Access denied")

    return TemplateResponse.from_orm(template)


@router.post("/", response_model=TemplateResponse)
async def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Create a new template - only for private templates"""
    if template_data.is_official and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can create official templates")

    # Generate template ID and repository URL
    template_id = str(uuid.uuid4())
    repository_url = generate_repository_url(template_id, template_data.is_official)

    # Check for duplicate name per owner
    existing_template = db.query(Template).filter(
        Template.name == template_data.name,
        Template.owner_account_id == current_user.id
    ).first()
    if existing_template:
        raise HTTPException(status_code=400, detail="Template name already exists for this user")

    template = Template(
        id=template_id,
        name=template_data.name,
        description=template_data.description,
        category=template_data.category,
        language=template_data.language,
        cpu_spec=template_data.cpu_spec,
        memory_spec=template_data.memory_spec,
        is_official=template_data.is_official,
        is_public=template_data.is_public,
        owner_account_id=current_user.id if not template_data.is_official else None,
        repository_url=repository_url,
        tags=template_data.tags
    )

    db.add(template)
    db.commit()
    db.refresh(template)

    return TemplateResponse.from_orm(template)


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Update a template - only owner or admin can update"""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check permissions
    if getattr(current_user, 'role', 'user') != 'admin' and getattr(template, 'owner_account_id', None) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Official templates can only be updated by admins
    if getattr(template, 'is_official', False) and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can update official templates")

    # Update fields
    for field, value in template_data.dict(exclude_unset=True).items():
        setattr(template, field, value)

    # Update the updated_at field using setattr to avoid SQLAlchemy column assignment issues
    setattr(template, 'updated_at', datetime.utcnow())
    db.commit()
    db.refresh(template)

    return TemplateResponse.from_orm(template)


@router.delete("/{template_id}")
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_required)
):
    """Delete a template - only owner or admin can delete"""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Check permissions
    if getattr(current_user, 'role', 'user') != 'admin' and getattr(template, 'owner_account_id', None) != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Official templates can only be deleted by admins
    if getattr(template, 'is_official', False) and getattr(current_user, 'role', 'user') != 'admin':
        raise HTTPException(status_code=403, detail="Only admins can delete official templates")

    # Send notification if admin is deleting
    if getattr(current_user, 'role', 'user') == 'admin' and getattr(template, 'owner_account_id', None):
        notification = Notification(
            user_account_id=template.owner_account_id,
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
        templates=[TemplateResponse.from_orm(template) for template in templates],
        total=query.count()
    )


@router.post("/admin/{template_id}/make-official")
async def admin_make_template_official(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Admin endpoint to make a template official"""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if getattr(template, 'is_official', False):
        raise HTTPException(status_code=400, detail="Template is already official")

    setattr(template, 'is_official', True)
    setattr(template, 'owner_account_id', None)  # Official templates have no owner
    setattr(template, 'updated_at', datetime.utcnow())

    # Send notification to original owner if exists
    if getattr(template, 'owner_account_id', None):
        notification = Notification(
            user_account_id=template.owner_account_id,
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
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if getattr(template, 'is_public', False):
        raise HTTPException(status_code=400, detail="Template is already public")

    setattr(template, 'is_public', True)
    setattr(template, 'updated_at', datetime.utcnow())

    # Send notification to owner
    if getattr(template, 'owner_account_id', None):
        notification = Notification(
            user_account_id=template.owner_account_id,
            title="Template Made Public",
            message=f"Your template '{template.name}' has been made public by an administrator.",
            type="info",
            related_entity_type="template",
            related_entity_id=template_id
        )
        db.add(notification)

    db.commit()

    return {"message": f"Template '{template.name}' made public successfully"} 