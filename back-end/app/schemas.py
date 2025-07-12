from pydantic import BaseModel, Field, ConfigDict
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
    cpu_requirements: float = Field(..., ge=0.1, le=32.0)
    memory_requirements: float = Field(..., ge=0.1, le=128.0)
    is_official: bool = False
    is_public: bool = False
    tags: Optional[List[str]] = None

class TemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    language: Optional[str] = Field(None, min_length=1, max_length=100)
    cpu_requirements: Optional[float] = Field(None, ge=0.1, le=32.0)
    memory_requirements: Optional[float] = Field(None, ge=0.1, le=128.0)
    is_public: Optional[bool] = None
    tags: Optional[List[str]] = None

class TemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    name: str
    description: Optional[str]
    category: str
    language: str
    cpu_requirements: float
    memory_requirements: float
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
    
    id: str
    name: str
    description: Optional[str]
    user_id: int
    sandbox_count: int
    api_key_count: int
    total_spent: float
    status: str
    created_at: datetime
    updated_at: datetime

class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    user_id: int
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