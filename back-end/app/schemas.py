from pydantic import BaseModel, Field, ConfigDict, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

# Existing schemas...

class TemplateType(str, Enum):
    OFFICIAL = "official"
    PRIVATE = "private"
    PUBLIC = "public"

class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    language: str = Field(..., min_length=1, max_length=100)
    cpu_spec: float = Field(..., ge=1.0, le=8.0)
    memory_spec: float = Field(..., description="Allowed: 0.5, 1, 2, 4, 8, 16")
    is_official: bool = False
    is_public: bool = False
    tags: Optional[List[str]] = None

    @validator('memory_spec')
    def validate_memory_spec(cls, value):
        allowed = {0.5, 1, 2, 4, 8, 16}
        if value not in allowed:
            raise ValueError("memory_spec must be one of: 0.5, 1, 2, 4, 8, 16")
        return value

class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    language: Optional[str] = Field(None, min_length=1, max_length=100)
    cpu_spec: Optional[float] = Field(None, ge=1.0, le=8.0)
    memory_spec: Optional[float] = Field(None, description="Allowed: 0.5, 1, 2, 4, 8, 16")
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

    @validator('memory_spec')
    def validate_memory_spec(cls, value):
        if value is None:
            return value
        allowed = {0.5, 1, 2, 4, 8, 16}
        if value not in allowed:
            raise ValueError("memory_spec must be one of: 0.5, 1, 2, 4, 8, 16")
        return value

class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    id: str
    name: str
    description: Optional[str]
    category: str
    language: str
    cpu_spec: float
    memory_spec: float
    is_official: bool
    is_public: bool
    owner_id: Optional[int]
    repository_url: str
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

class TemplateListResponse(BaseModel):
    templates: List[TemplateResponse]
    total: int

# Project schemas
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|archived)$")

class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    project_id: str
    name: str
    description: Optional[str]
    owner_account_id: str
    status: str
    is_default: bool
    created_at: datetime
    updated_at: datetime
    
    # Computed fields (will be set to defaults)
    sandbox_count: int = 0
    total_spent: float = 0.0

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int

# Sandbox schemas
class SandboxResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    description: Optional[str]
    status: str
    user_account_id: str
    user_name: str
    user_email: str
    project_id: Optional[str]
    project_name: Optional[str]
    template_id: Optional[str]
    template_name: Optional[str]
    resources: Dict[str, float]
    cpu_spec: Optional[float]
    memory_spec: Optional[float]
    cost: Dict[str, float]
    created_at: datetime
    updated_at: datetime
    last_accessed_at: Optional[datetime]
    uptime: int

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: str
    title: str
    message: str
    type: NotificationType
    is_read: bool
    related_entity_type: Optional[str]
    related_entity_id: Optional[str]
    created_at: datetime

class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    total: int
    unread_count: int 