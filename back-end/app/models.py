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

def generate_user_id():
    """Generate a user ID: usr-xxxxxxxxxxxxxxxxx (21 chars total)"""
    return generate_resource_id("usr", 17)

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

def generate_api_key_resource_id():
    """Generate an API key resource ID: key-xxxxxxxxxxxxxxxxx (21 chars total)"""
    return generate_resource_id("key", 17)

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
    """Generate a unique signup ID"""
    return generate_resource_id("sgn", 22)

def generate_dedicated_signin_url() -> str:
    """Generate a unique dedicated signin URL for non-root users"""
    import secrets
    import string
    chars = string.ascii_letters + string.digits
    token = ''.join(secrets.choice(chars) for _ in range(32))
    return f"signin-{token}"

def generate_initial_password() -> str:
    """Generate a secure initial password for new users"""
    import secrets
    import string
    # Generate a 12-character password with at least one of each type
    lowercase = string.ascii_lowercase
    uppercase = string.ascii_uppercase
    digits = string.digits
    symbols = "!@#$%^&*"
    
    # Ensure at least one of each type
    password = [
        secrets.choice(lowercase),
        secrets.choice(uppercase),
        secrets.choice(digits),
        secrets.choice(symbols)
    ]
    
    # Fill the rest with random characters
    all_chars = lowercase + uppercase + digits + symbols
    password.extend(secrets.choice(all_chars) for _ in range(8))
    
    # Shuffle the password
    password_list = list(password)
    secrets.SystemRandom().shuffle(password_list)
    return ''.join(password_list)

class Account(Base):
    """Account entity - represents a tenant/organization"""
    __tablename__ = "accounts"
    
    # Internal primary key for sorting and relationships
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business key - globally unique, numeric account identifier
    account_id = Column(String(12), unique=True, nullable=False, index=True, default=generate_account_id)
    
    # Account details
    name = Column(String(255), nullable=False)  # Account/Organization name
    description = Column(Text, nullable=True)
    
    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Billing and subscription info (for future use)
    subscription_plan = Column(String(50), default="free", nullable=False)
    subscription_status = Column(String(50), default="active", nullable=False)
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="account", foreign_keys="User.account_id")
    root_user = relationship("User", foreign_keys="User.account_id", primaryjoin="and_(Account.account_id==User.account_id, User.is_root_user==True)", uselist=False)

class User(Base):
    """User entity - represents individual users within an account"""
    __tablename__ = "users"
    
    # Internal primary key for sorting and relationships
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business key - globally unique user identifier
    user_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_user_id)
    
    # Account relationship - each user belongs to exactly one account
    account_id = Column(String(12), ForeignKey("accounts.account_id"), nullable=False, index=True)
    
    # User credentials and profile
    email = Column(String(255), nullable=False, index=True)
    username = Column(String(100), nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # user, admin
    
    # User status within account
    is_active = Column(Boolean, default=True, nullable=False)
    is_root_user = Column(Boolean, default=False, nullable=False)  # Root user of the account
    is_verified = Column(Boolean, default=False, nullable=False)
    
    # Multi-user specific fields
    dedicated_signin_url = Column(String(255), nullable=True, unique=True, index=True)  # Unique signin URL for non-root users
    is_first_time_login = Column(Boolean, default=True, nullable=False)  # Force password change on first login
    description = Column(Text, nullable=True)  # User description set by root user
    
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
    
    # Relationships
    account = relationship("Account", back_populates="users", foreign_keys=[account_id])
    projects = relationship("Project", back_populates="owner", foreign_keys="Project.owner_user_id")
    private_templates = relationship("Template", back_populates="owner", foreign_keys="Template.owner_user_id")
    api_keys = relationship("ApiKey", back_populates="user", foreign_keys="ApiKey.user_id")
    notifications = relationship("Notification", back_populates="user", foreign_keys="Notification.user_id")
    sandboxes = relationship("Sandbox", back_populates="owner", foreign_keys="Sandbox.owner_user_id")
    billing_records = relationship("BillingRecord", back_populates="user", foreign_keys="BillingRecord.user_id")
    usage_records = relationship("SandboxUsage", foreign_keys="SandboxUsage.user_id")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('account_id', 'email', name='unique_email_per_account'),
        UniqueConstraint('account_id', 'username', name='unique_username_per_account'),
    )

class Project(Base):
    __tablename__ = "projects"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    project_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_project_id)
    
    # Project details
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Ownership - each project belongs to exactly one user
    owner_user_id = Column(String(25), ForeignKey("users.user_id"), nullable=False, index=True)
    
    # Status and flags
    status = Column(String(20), default="active", nullable=False)  # active, archived
    is_default = Column(Boolean, default=False, nullable=False)  # Default project that cannot be deleted
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="projects", foreign_keys=[owner_user_id])
    sandboxes = relationship("Sandbox", back_populates="project", foreign_keys="Sandbox.project_id")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('owner_user_id', 'name', name='unique_project_name_per_user'),
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
    owner_user_id = Column(String(25), ForeignKey("users.user_id"), nullable=True, index=True)  # NULL for official templates
    
    # Repository and metadata
    repository_url = Column(String(500), nullable=False)
    tags = Column(JSON, nullable=True)
    
    # Audit timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="private_templates", foreign_keys=[owner_user_id])
    
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
        UniqueConstraint('owner_user_id', 'name', name='unique_template_name_per_owner'),
    )

class ApiKey(Base):
    __tablename__ = "api_keys"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier (the actual API key)
    api_key = Column(String(50), unique=True, nullable=False, index=True, default=generate_api_key)
    
    # Resource identifier (AWS-style resource ID)
    key_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_api_key_resource_id)
    
    # Ownership - each API key belongs to exactly one user
    user_id = Column(String(25), ForeignKey("users.user_id"), nullable=False, index=True)
    
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
    user = relationship("User", back_populates="api_keys", foreign_keys=[user_id])
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'name', name='unique_api_key_name_per_user'),
    )

class Notification(Base):
    __tablename__ = "notifications"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    notification_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_notification_id)
    
    # Ownership - each notification belongs to exactly one user
    user_id = Column(String(25), ForeignKey("users.user_id"), nullable=False, index=True)
    
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
    user = relationship("User", back_populates="notifications", foreign_keys=[user_id])

class Sandbox(Base):
    __tablename__ = "sandboxes"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    sandbox_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_sandbox_id)
    
    # Sandbox details
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationships - each sandbox belongs to exactly one project and one user
    template_id = Column(String(25), ForeignKey("templates.template_id"), nullable=False, index=True)
    owner_user_id = Column(String(25), ForeignKey("users.user_id"), nullable=False, index=True)
    project_id = Column(String(25), ForeignKey("projects.project_id"), nullable=False, index=True)  # Now required
    
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
    owner = relationship("User", back_populates="sandboxes", foreign_keys=[owner_user_id])
    project = relationship("Project", back_populates="sandboxes", foreign_keys=[project_id])
    template = relationship("Template", foreign_keys=[template_id])
    usage_records = relationship("SandboxUsage", back_populates="sandbox", foreign_keys="SandboxUsage.sandbox_id")
    metrics = relationship("SandboxMetrics", back_populates="sandbox", foreign_keys="SandboxMetrics.sandbox_id")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('owner_user_id', 'name', name='unique_sandbox_name_per_owner'),
    )

class SandboxUsage(Base):
    __tablename__ = "sandbox_usage"
    
    # Internal primary key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Business identifier
    usage_id = Column(String(25), unique=True, nullable=False, index=True, default=generate_usage_id)
    
    # Relationships - all use business keys
    sandbox_id = Column(String(25), ForeignKey("sandboxes.sandbox_id"), nullable=False, index=True)
    user_id = Column(String(25), ForeignKey("users.user_id"), nullable=False, index=True)
    
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
    user = relationship("User", foreign_keys=[user_id])

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
    user_id = Column(String(25), ForeignKey("users.user_id"), nullable=False, index=True)
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
    user = relationship("User", back_populates="billing_records", foreign_keys=[user_id])

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
Index('idx_account_account_id', Account.account_id)
Index('idx_account_name', Account.name)
Index('idx_account_active', Account.is_active)
Index('idx_account_verified', Account.is_verified)

# User indexes
Index('idx_user_account_id', User.account_id)
Index('idx_user_user_id', User.user_id)
Index('idx_user_email', User.email)
Index('idx_user_username', User.username)
Index('idx_user_active', User.is_active)
Index('idx_user_root_user', User.is_root_user)
Index('idx_user_verified', User.is_verified)

# Project indexes
Index('idx_project_owner_user', Project.owner_user_id)
Index('idx_project_status', Project.status)
Index('idx_project_created', Project.created_at)

# Template indexes
Index('idx_template_owner_user', Template.owner_user_id)
Index('idx_template_public', Template.is_public)
Index('idx_template_official', Template.is_official)
Index('idx_template_category', Template.category)
Index('idx_template_language', Template.language)

# API Key indexes
Index('idx_api_key_user_id', ApiKey.user_id)
Index('idx_api_key_active', ApiKey.is_active)
Index('idx_api_key_last_used', ApiKey.last_used_at)

# Notification indexes
Index('idx_notification_user_id', Notification.user_id)
Index('idx_notification_read', Notification.is_read)
Index('idx_notification_created', Notification.created_at)
Index('idx_notification_type', Notification.type)

# Sandbox indexes
Index('idx_sandbox_owner_user', Sandbox.owner_user_id)
Index('idx_sandbox_project', Sandbox.project_id)
Index('idx_sandbox_template', Sandbox.template_id)
Index('idx_sandbox_status', Sandbox.status)
Index('idx_sandbox_created', Sandbox.created_at)
Index('idx_sandbox_started', Sandbox.started_at)
Index('idx_sandbox_stopped', Sandbox.stopped_at)

# Usage indexes
Index('idx_usage_user_id', SandboxUsage.user_id)
Index('idx_usage_sandbox', SandboxUsage.sandbox_id)
Index('idx_usage_start_time', SandboxUsage.start_time)
Index('idx_usage_end_time', SandboxUsage.end_time)

# Metrics indexes
Index('idx_metrics_sandbox', SandboxMetrics.sandbox_id)
Index('idx_metrics_timestamp', SandboxMetrics.timestamp)

# Billing indexes
Index('idx_billing_user_id', BillingRecord.user_id)
Index('idx_billing_project', BillingRecord.project_id)
Index('idx_billing_sandbox', BillingRecord.sandbox_id)
Index('idx_billing_date', BillingRecord.billing_date)
Index('idx_billing_service_type', BillingRecord.service_type)

# Pending signup indexes
Index('idx_pending_signup_email', PendingSignup.email)
Index('idx_pending_signup_token', PendingSignup.verification_token)
Index('idx_pending_signup_expires', PendingSignup.expires_at) 