from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user")  # user, admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    last_login = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_password_reset_request = Column(DateTime, nullable=True)
    
    # Relationships
    sandboxes = relationship("Sandbox", back_populates="user")

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    language = Column(String(100), nullable=False)
    cpu_requirements = Column(Float, nullable=False, default=1.0)
    memory_requirements = Column(Float, nullable=False, default=1.0)
    is_official = Column(Boolean, nullable=False, default=False)
    is_public = Column(Boolean, nullable=False, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # NULL for official templates
    repository_url = Column(String(500), nullable=False)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sandbox_count = Column(Integer, default=0)
    api_key_count = Column(Integer, default=0)
    total_spent = Column(Float, default=0.0)
    status = Column(String(20), default="active")  # active, archived
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key_id = Column(String(36), unique=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    key_hash = Column(String(255), nullable=False)
    full_key = Column(String(255), nullable=False)
    prefix = Column(String(8), nullable=False)
    permissions = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    expires_in_days = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_used_at = Column(DateTime, nullable=True)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, warning, error, success
    is_read = Column(Boolean, default=False)
    related_entity_type = Column(String(100), nullable=True)
    related_entity_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Sandbox(Base):
    __tablename__ = "sandboxes"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    framework = Column(String(50), nullable=False)
    status = Column(String(20), nullable=False)
    user_id = Column(String(36), ForeignKey("users.account_id"), nullable=False, index=True)
    region = Column(String(20), nullable=False)
    visibility = Column(String(20), nullable=False)
    project_id = Column(String(36), nullable=True)
    cpu_usage = Column(Float, nullable=True)
    memory_usage = Column(Float, nullable=True)
    storage_usage = Column(Float, nullable=True)
    bandwidth_usage = Column(Float, nullable=True)
    hourly_rate = Column(Float, nullable=True)
    total_cost = Column(Float, nullable=True)
    created_at = Column(DateTime, nullable=False)
    updated_at = Column(DateTime, nullable=False)
    last_accessed_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="sandboxes")

class SandboxUsage(Base):
    __tablename__ = "sandbox_usage"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sandbox_id = Column(String(36), ForeignKey("sandboxes.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.account_id"), nullable=False)
    date = Column(DateTime, nullable=False)
    cpu_hours = Column(Float, default=0.0)
    memory_hours = Column(Float, default=0.0)
    storage_hours = Column(Float, default=0.0)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class SandboxMetrics(Base):
    __tablename__ = "sandbox_metrics"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sandbox_id = Column(String(36), ForeignKey("sandboxes.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    cpu_usage = Column(Float, default=0.0)
    memory_usage = Column(Float, default=0.0)
    storage_usage = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

class PendingSignup(Base):
    __tablename__ = "pending_signups"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), nullable=False)
    username = Column(String(100), nullable=False)
    full_name = Column(String(255), nullable=True)
    verification_token = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)

# Indexes
Index('idx_templates_owner', Template.owner_id)
Index('idx_templates_public', Template.is_public)
Index('unique_template_name_per_owner', Template.name, Template.owner_id, unique=True)

Index('idx_notifications_user', Notification.user_id)
Index('idx_notifications_read', Notification.is_read)
Index('idx_notifications_created', Notification.created_at)

Index('ix_api_keys_user_id', ApiKey.user_id)
Index('ix_api_keys_key_id', ApiKey.key_id, unique=True)
Index('ix_api_keys_prefix', ApiKey.prefix)

Index('ix_sandboxes_created_at', Sandbox.created_at) 