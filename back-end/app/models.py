from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Float, JSON, ForeignKey, Index, BigInteger, UniqueConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
import secrets
import string
import hashlib
import base64

Base = declarative_base()

def generate_account_id():
    """Generate a 12-digit numeric account ID"""
    return str(secrets.randbelow(10**12)).zfill(12)

def generate_resource_id(prefix: str, length: int = 17) -> str:
    """Generate AWS-style resource ID: prefix-xxxxxxxxxxxxxxxxx (17 chars)"""
    chars = string.ascii_lowercase + string.digits
    suffix = ''.join(secrets.choice(chars) for _ in range(length))
    return f"{prefix}-{suffix}"

def generate_project_id():
    """Generate a project ID: prj-xxxxxxxxxxxxxxxxx (21 chars total)"""
    return generate_resource_id("prj", 17)

def generate_template_id():
    """Generate a template ID: tpl-xxxxxxxxxxxxxxxxx (21 chars total)"""
    return generate_resource_id("tpl", 17)

def generate_sandbox_id():
    """Generate a sandbox ID: sbx-xxxxxxxxxxxxxxxxx (21 chars total)"""
    return generate_resource_id("sbx", 17)

def generate_api_key():
    """Generate a user-facing API key: sbk- + 40 chars (43 chars total)"""
    chars = string.ascii_letters + string.digits
    suffix = ''.join(secrets.choice(chars) for _ in range(40))
    return f"sbk-{suffix}"

def hash_api_key(api_key: str) -> str:
    """Hash an API key for secure storage"""
    return hashlib.sha256(api_key.encode()).hexdigest()

def generate_notification_id():
    """Generate a notification ID: not-xxxxxxxxxxxx"""
    return generate_resource_id("not", 12)

def generate_usage_id():
    """Generate a usage record ID: usg-xxxxxxxxxxxx"""
    return generate_resource_id("usg", 12)

def generate_metric_id():
    """Generate a metric record ID: mtr-xxxxxxxxxxxx"""
    return generate_resource_id("mtr", 12)

def generate_billing_id():
    """Generate a billing record ID: bil-xxxxxxxxxxxx"""
    return generate_resource_id("bil", 12)

def generate_signup_id():
    """Generate a signup record ID: sgn-xxxxxxxxxxxx"""
    return generate_resource_id("sgn", 12)

class User(Base):
    __tablename__ = "users"
    
    # Internal primary key for sorting and relationships
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business key - globally unique, numeric account identifier
    account_id = Column(String(12), unique=True, nullable=False, index=True, default=generate_account_id)
    
    # User credentials and profile
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # user, admin
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Authentication tokens
    verification_token = Column(String(255), nullable=True)
    reset_token = Column(String(255), nullable=True)
    reset_token_expiry = Column(DateTime, nullable=True)
    
    # Activity tracking
    last_login = Column(DateTime, nullable=True)
    last_password_reset_request = Column(DateTime, nullable=True)
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships - all use account_id for business logic
    projects = relationship("Project", back_populates="owner", foreign_keys="Project.owner_account_id")
    private_templates = relationship("Template", back_populates="owner", foreign_keys="Template.owner_account_id")
    api_keys = relationship("ApiKey", back_populates="user", foreign_keys="ApiKey.user_account_id")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_account_id")
    sandboxes = relationship("Sandbox", back_populates="owner", foreign_keys="Sandbox.owner_account_id")
    billing_records = relationship("BillingRecord", back_populates="user", foreign_keys="BillingRecord.user_account_id")
    usage_records = relationship("SandboxUsage", foreign_keys="SandboxUsage.user_account_id")

class Project(Base):
    __tablename__ = "projects"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    project_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_project_id)
    
    # Project details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Ownership - uses account_id for business relationships
    owner_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=False, index=True)
    
    # Status and flags
    status = Column(String(20), default="active", nullable=False)  # active, archived
    is_default = Column(Boolean, default=False, nullable=False)  # Default project that cannot be deleted
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="projects", foreign_keys=[owner_account_id])
    sandboxes = relationship("Sandbox", back_populates="project", foreign_keys="Sandbox.project_id")
    # api_keys = relationship("ApiKey", foreign_keys="ApiKey.project_id")  # REMOVE
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('owner_account_id', 'name', name='unique_project_name_per_account'),
    )

class Template(Base):
    __tablename__ = "templates"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier (map template_id to id for the response)
    template_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_template_id)
    
    # Template details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=False)
    language = Column(String(100), nullable=False)
    
    # Resource requirements (map min_cpu_required to cpu_spec, min_memory_required to memory_spec)
    min_cpu_required = Column(Float, nullable=False, default=1.0)  # Minimum CPU requirement
    min_memory_required = Column(Float, nullable=False, default=1.0)  # Minimum Memory requirement in GB
    
    # Visibility and ownership
    is_official = Column(Boolean, nullable=False, default=False)  # Official templates (admin-managed)
    is_public = Column(Boolean, nullable=False, default=False)  # Public templates
    owner_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=True, index=True)  # NULL for official templates
    
    # Repository and metadata
    repository_url = Column(String(500), nullable=False)
    tags = Column(JSON, nullable=True)
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="private_templates", foreign_keys=[owner_account_id])
    
    # Properties to map database fields to response schema fields
    @property
    def cpu_spec(self):
        return self.min_cpu_required
    
    @cpu_spec.setter
    def cpu_spec(self, value):
        self.min_cpu_required = value
    
    @property
    def memory_spec(self):
        return self.min_memory_required
    
    @memory_spec.setter
    def memory_spec(self, value):
        self.min_memory_required = value
    
    @property
    def owner_id(self):
        # Return the user's ID from the relationship if owner exists
        return self.owner.id if self.owner else None
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('owner_account_id', 'name', name='unique_template_name_per_owner'),
    )

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier (the actual API key)
    api_key = Column(String(50), unique=True, nullable=False, index=True, default=generate_api_key)
    
    # Ownership - uses account_id for business relationships
    user_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=False, index=True)
    
    # Key details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Security - store only the hash, not the plaintext
    key_hash = Column(String(64), nullable=False)  # SHA-256 hash
    
    # Status - simplified to just active/inactive
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Activity tracking
    last_used_at = Column(DateTime, nullable=True)
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="api_keys", foreign_keys=[user_account_id])
    # project = relationship("Project", foreign_keys=[project_id])  # REMOVE
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_account_id', 'name', name='unique_api_key_name_per_user'),
    )

class Notification(Base):
    __tablename__ = "notifications"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    notification_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_notification_id)
    
    # Ownership - uses account_id for business relationships
    user_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=False, index=True)
    
    # Notification content
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info", nullable=False)  # info, warning, error, success
    
    # Status
    is_read = Column(Boolean, default=False, nullable=False)
    
    # Related entity (for linking to specific resources)
    related_entity_type = Column(String(100), nullable=True)
    related_entity_id = Column(String(255), nullable=True)
    
    # Audit timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="notifications", foreign_keys=[user_account_id])

class Sandbox(Base):
    __tablename__ = "sandboxes"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    sandbox_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_sandbox_id)
    
    # Sandbox details
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationships - all use business keys
    template_id = Column(String(25), ForeignKey("templates.template_id"), nullable=False, index=True)
    owner_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=False, index=True)
    project_id = Column(String(25), ForeignKey("projects.project_id"), nullable=True, index=True)
    
    # Configuration
    cpu_spec = Column(Float, nullable=False, default=1.0)  # 1-8 vCPU
    memory_spec = Column(Float, nullable=False, default=1.0)  # 0.5, 1, 2, 4, 8, 16 GB
    max_running_seconds = Column(Integer, nullable=False, default=86400)  # Max 24 hours (86400 seconds)
    
    # Status and lifecycle
    status = Column(String(20), nullable=False, default="created")  # created, starting, running, stopped, timeout, recycled
    
    # Internal snapshot management
    latest_snapshot_id = Column(String(255), nullable=True)  # Internal snapshot ID
    snapshot_expires_at = Column(DateTime, nullable=True)  # When snapshot will be deleted
    
    # Lifecycle timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    started_at = Column(DateTime, nullable=True)
    stopped_at = Column(DateTime, nullable=True)
    timeout_at = Column(DateTime, nullable=True)
    recycled_at = Column(DateTime, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="sandboxes", foreign_keys=[owner_account_id])
    project = relationship("Project", back_populates="sandboxes", foreign_keys=[project_id])
    template = relationship("Template", foreign_keys=[template_id])
    usage_records = relationship("SandboxUsage", back_populates="sandbox", foreign_keys="SandboxUsage.sandbox_id")
    metrics = relationship("SandboxMetrics", back_populates="sandbox", foreign_keys="SandboxMetrics.sandbox_id")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('owner_account_id', 'name', name='unique_sandbox_name_per_owner'),
    )

class SandboxUsage(Base):
    __tablename__ = "sandbox_usage"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    usage_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_usage_id)
    
    # Relationships - all use business keys
    sandbox_id = Column(String(25), ForeignKey("sandboxes.sandbox_id"), nullable=False, index=True)
    user_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=False, index=True)
    
    # Usage tracking
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=True, index=True)
    running_seconds = Column(Integer, default=0)  # Actual running time in seconds
    cpu_hours = Column(Float, default=0.0)
    memory_hours = Column(Float, default=0.0)
    storage_hours = Column(Float, default=0.0)
    
    # Billing
    hourly_rate = Column(Float, nullable=False)
    cost = Column(Float, default=0.0)
    
    # Audit timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    sandbox = relationship("Sandbox", back_populates="usage_records", foreign_keys=[sandbox_id])
    user = relationship("User", foreign_keys=[user_account_id])

class SandboxMetrics(Base):
    __tablename__ = "sandbox_metrics"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    metric_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_metric_id)
    
    # Relationship - uses business key
    sandbox_id = Column(String(36), ForeignKey("sandboxes.sandbox_id"), nullable=False, index=True)
    
    # Metric timestamp
    timestamp = Column(DateTime, nullable=False, index=True)
    
    # Current utilization
    cpu_utilization = Column(Float, default=0.0)  # Percentage
    memory_utilization = Column(Float, default=0.0)  # Percentage
    storage_utilization = Column(Float, default=0.0)  # Percentage
    
    # Audit timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    sandbox = relationship("Sandbox", back_populates="metrics", foreign_keys=[sandbox_id])

class BillingRecord(Base):
    __tablename__ = "billing_records"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    billing_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_billing_id)
    
    # Relationships - all use business keys
    user_account_id = Column(String(12), ForeignKey("users.account_id"), nullable=False, index=True)
    project_id = Column(String(25), ForeignKey("projects.project_id"), nullable=True, index=True)
    sandbox_id = Column(String(25), ForeignKey("sandboxes.sandbox_id"), nullable=True, index=True)
    
    # Billing details
    billing_date = Column(DateTime, nullable=False, index=True)
    service_type = Column(String(50), nullable=False)  # sandbox_runtime, storage, etc.
    usage_seconds = Column(Integer, default=0)
    hourly_rate = Column(Float, nullable=False)
    amount = Column(Float, nullable=False)
    
    # Metadata
    description = Column(Text, nullable=True)
    
    # Audit timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="billing_records", foreign_keys=[user_account_id])

class PendingSignup(Base):
    __tablename__ = "pending_signups"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    signup_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_signup_id)
    
    # Signup details
    email = Column(String(255), nullable=False, index=True)
    username = Column(String(100), nullable=False)
    full_name = Column(String(255), nullable=True)
    verification_token = Column(String(255), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)  # Store hashed password for verification
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)

# Comprehensive indexing for performance and data integrity
# Account-level indexes for multi-tenancy
Index('idx_user_account_id', User.account_id)
Index('idx_user_email', User.email)
Index('idx_user_username', User.username)

# Project indexes
Index('idx_project_owner_account', Project.owner_account_id)
Index('idx_project_status', Project.status)
Index('idx_project_created', Project.created_at)

# Template indexes
Index('idx_template_owner_account', Template.owner_account_id)
Index('idx_template_public', Template.is_public)
Index('idx_template_official', Template.is_official)
Index('idx_template_category', Template.category)
Index('idx_template_language', Template.language)

# API Key indexes
Index('idx_api_key_user_account', ApiKey.user_account_id)
Index('idx_api_key_active', ApiKey.is_active)
Index('idx_api_key_last_used', ApiKey.last_used_at)

# Notification indexes
Index('idx_notification_user_account', Notification.user_account_id)
Index('idx_notification_read', Notification.is_read)
Index('idx_notification_created', Notification.created_at)
Index('idx_notification_type', Notification.type)

# Sandbox indexes
Index('idx_sandbox_owner_account', Sandbox.owner_account_id)
Index('idx_sandbox_project', Sandbox.project_id)
Index('idx_sandbox_template', Sandbox.template_id)
Index('idx_sandbox_status', Sandbox.status)
Index('idx_sandbox_created', Sandbox.created_at)
Index('idx_sandbox_started', Sandbox.started_at)
Index('idx_sandbox_stopped', Sandbox.stopped_at)

# Usage indexes
Index('idx_usage_sandbox', SandboxUsage.sandbox_id)
Index('idx_usage_user_account', SandboxUsage.user_account_id)
Index('idx_usage_start_time', SandboxUsage.start_time)
Index('idx_usage_end_time', SandboxUsage.end_time)

# Metrics indexes
Index('idx_metrics_sandbox', SandboxMetrics.sandbox_id)
Index('idx_metrics_timestamp', SandboxMetrics.timestamp)

# Billing indexes
Index('idx_billing_user_account', BillingRecord.user_account_id)
Index('idx_billing_project', BillingRecord.project_id)
Index('idx_billing_sandbox', BillingRecord.sandbox_id)
Index('idx_billing_date', BillingRecord.billing_date)
Index('idx_billing_service_type', BillingRecord.service_type)

# Pending signup indexes
Index('idx_pending_signup_email', PendingSignup.email)
Index('idx_pending_signup_token', PendingSignup.verification_token)
Index('idx_pending_signup_expires', PendingSignup.expires_at) 