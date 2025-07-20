# ScaleBox Database Schema

This document provides a comprehensive overview of all database tables, their columns, relationships, and constraints in the ScaleBox platform.

## Table Overview

The database consists of 8 main tables:

1. **users** - User accounts and authentication
2. **projects** - User projects for organizing sandboxes
3. **templates** - Sandbox templates (official, public, private)
4. **api_keys** - User API keys for authentication
5. **notifications** - User notifications and alerts
6. **sandboxes** - Sandbox instances
7. **sandbox_usage** - Usage tracking and billing
8. **sandbox_metrics** - Performance metrics
9. **billing_records** - Billing and cost tracking
10. **pending_signups** - Email verification for new users

---

## 1. users Table

**Purpose**: Core user accounts and authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `account_id` | String(12) | Unique, Not Null, Index | Business key - 12-digit numeric account ID |
| `email` | String(255) | Unique, Not Null, Index | User email address |
| `username` | String(100) | Unique, Not Null, Index | Username |
| `password_hash` | String(255) | Not Null | Hashed password |
| `full_name` | String(255) | Nullable | User's full name |
| `role` | String(50) | Not Null, Default: "user" | User role: "user" or "admin" |
| `is_active` | Boolean | Not Null, Default: true | Account active status |
| `is_verified` | Boolean | Not Null, Default: false | Email verification status |
| `verification_token` | String(255) | Nullable | Email verification token |
| `reset_token` | String(255) | Nullable | Password reset token |
| `reset_token_expiry` | DateTime | Nullable | Password reset token expiry |
| `last_login` | DateTime | Nullable | Last login timestamp |
| `last_password_reset_request` | DateTime | Nullable | Last password reset request |
| `created_at` | DateTime | Not Null, Default: now | Account creation timestamp |
| `updated_at` | DateTime | Not Null, Default: now | Last update timestamp |

**Relationships**:
- Has many `projects` (via `owner_account_id`)
- Has many `private_templates` (via `owner_account_id`)
- Has many `api_keys` (via `user_account_id`)
- Has many `notifications` (via `user_account_id`)
- Has many `sandboxes` (via `owner_account_id`)
- Has many `billing_records` (via `user_account_id`)
- Has many `usage_records` (via `user_account_id`)

---

## 2. projects Table

**Purpose**: User projects for organizing sandboxes

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `project_id` | String(25) | Unique, Not Null, Index | Business identifier (prj-xxxxxxxxxxxxxxxxx) |
| `name` | String(255) | Not Null | Project name |
| `description` | Text | Nullable | Project description |
| `owner_account_id` | String(12) | Foreign Key, Not Null, Index | Owner's account ID |
| `status` | String(20) | Not Null, Default: "active" | Status: "active" or "archived" |
| `is_default` | Boolean | Not Null, Default: false | Default project flag |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |
| `updated_at` | DateTime | Not Null, Default: now | Last update timestamp |

**Constraints**:
- Unique constraint: `unique_project_name_per_account` (owner_account_id, name)

**Relationships**:
- Belongs to `User` (via `owner_account_id`)
- Has many `sandboxes` (via `project_id`)

---

## 3. templates Table

**Purpose**: Sandbox templates (official, public, private)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `template_id` | String(25) | Unique, Not Null, Index | Business identifier (tpl-xxxxxxxxxxxxxxxxx) |
| `name` | String(255) | Not Null | Template name |
| `description` | Text | Nullable | Template description |
| `category` | String(100) | Not Null | Template category |
| `language` | String(100) | Not Null | Programming language |
| `min_cpu_required` | Float | Not Null, Default: 1.0 | Minimum CPU requirement |
| `min_memory_required` | Float | Not Null, Default: 1.0 | Minimum memory requirement (GB) |
| `is_official` | Boolean | Not Null, Default: false | Official template flag |
| `is_public` | Boolean | Not Null, Default: false | Public template flag |
| `owner_account_id` | String(12) | Foreign Key, Nullable, Index | Owner's account ID (NULL for official) |
| `repository_url` | String(500) | Not Null | Git repository URL |
| `tags` | JSON | Nullable | Template tags |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |
| `updated_at` | DateTime | Not Null, Default: now | Last update timestamp |

**Constraints**:
- Unique constraint: `unique_template_name_per_owner` (owner_account_id, name)

**Relationships**:
- Belongs to `User` (via `owner_account_id`) - optional for official templates
- Referenced by `sandboxes` (via `template_id`)

---

## 4. api_keys Table

**Purpose**: User API keys for authentication

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `api_key` | String(50) | Unique, Not Null, Index | Actual API key (sbk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx) |
| `key_id` | String(25) | Unique, Not Null, Index | Resource identifier (key-xxxxxxxxxxxxxxxxx) |
| `user_account_id` | String(12) | Foreign Key, Not Null, Index | Owner's account ID |
| `name` | String(255) | Not Null | API key name |
| `description` | Text | Nullable | API key description |
| `key_hash` | String(64) | Not Null | SHA-256 hash of the API key |
| `is_active` | Boolean | Not Null, Default: true | Active status |
| `last_used_at` | DateTime | Nullable | Last usage timestamp |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |
| `updated_at` | DateTime | Not Null, Default: now | Last update timestamp |

**Constraints**:
- Unique constraint: `unique_api_key_name_per_user` (user_account_id, name)

**Relationships**:
- Belongs to `User` (via `user_account_id`)

---

## 5. notifications Table

**Purpose**: User notifications and alerts

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `notification_id` | String(25) | Unique, Not Null, Index | Business identifier (not-xxxxxxxxxxxx) |
| `user_account_id` | String(12) | Foreign Key, Not Null, Index | Recipient's account ID |
| `title` | String(255) | Not Null | Notification title |
| `message` | Text | Not Null | Notification message |
| `type` | String(50) | Not Null, Default: "info" | Type: "info", "warning", "error", "success" |
| `is_read` | Boolean | Not Null, Default: false | Read status |
| `related_entity_type` | String(100) | Nullable | Related entity type |
| `related_entity_id` | String(255) | Nullable | Related entity ID |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |

**Relationships**:
- Belongs to `User` (via `user_account_id`)

---

## 6. sandboxes Table

**Purpose**: Sandbox instances

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `sandbox_id` | String(25) | Unique, Not Null, Index | Business identifier (sbx-xxxxxxxxxxxxxxxxx) |
| `name` | String(100) | Not Null | Sandbox name |
| `description` | Text | Nullable | Sandbox description |
| `template_id` | String(25) | Foreign Key, Not Null, Index | Template ID |
| `owner_account_id` | String(12) | Foreign Key, Not Null, Index | Owner's account ID |
| `project_id` | String(25) | Foreign Key, Nullable, Index | Project ID |
| `cpu_spec` | Float | Not Null, Default: 1.0 | CPU specification (1-8 vCPU) |
| `memory_spec` | Float | Not Null, Default: 1.0 | Memory specification (0.5-16 GB) |
| `max_running_seconds` | Integer | Not Null, Default: 86400 | Max running time (24 hours) |
| `status` | String(20) | Not Null, Default: "created" | Status: "created", "starting", "running", "stopped", "timeout", "recycled" |
| `latest_snapshot_id` | String(255) | Nullable | Internal snapshot ID |
| `snapshot_expires_at` | DateTime | Nullable | Snapshot expiry timestamp |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |
| `updated_at` | DateTime | Not Null, Default: now | Last update timestamp |
| `started_at` | DateTime | Nullable | Start timestamp |
| `stopped_at` | DateTime | Nullable | Stop timestamp |
| `timeout_at` | DateTime | Nullable | Timeout timestamp |
| `recycled_at` | DateTime | Nullable | Recycling timestamp |

**Constraints**:
- Unique constraint: `unique_sandbox_name_per_owner` (owner_account_id, name)

**Relationships**:
- Belongs to `User` (via `owner_account_id`)
- Belongs to `Project` (via `project_id`) - optional
- Belongs to `Template` (via `template_id`)
- Has many `usage_records` (via `sandbox_id`)
- Has many `metrics` (via `sandbox_id`)

---

## 7. sandbox_usage Table

**Purpose**: Usage tracking and billing

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `usage_id` | String(25) | Unique, Not Null, Index | Business identifier (usg-xxxxxxxxxxxx) |
| `sandbox_id` | String(25) | Foreign Key, Not Null, Index | Sandbox ID |
| `user_account_id` | String(12) | Foreign Key, Not Null, Index | User account ID |
| `start_time` | DateTime | Not Null, Index | Usage start time |
| `end_time` | DateTime | Nullable, Index | Usage end time |
| `running_seconds` | Integer | Default: 0 | Actual running time in seconds |
| `cpu_hours` | Float | Default: 0.0 | CPU hours consumed |
| `memory_hours` | Float | Default: 0.0 | Memory hours consumed |
| `storage_hours` | Float | Default: 0.0 | Storage hours consumed |
| `hourly_rate` | Float | Not Null | Hourly billing rate |
| `cost` | Float | Default: 0.0 | Total cost |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |

**Relationships**:
- Belongs to `Sandbox` (via `sandbox_id`)
- Belongs to `User` (via `user_account_id`)

---

## 8. sandbox_metrics Table

**Purpose**: Performance metrics

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `metric_id` | String(25) | Unique, Not Null, Index | Business identifier (mtr-xxxxxxxxxxxx) |
| `sandbox_id` | String(36) | Foreign Key, Not Null, Index | Sandbox ID |
| `timestamp` | DateTime | Not Null, Index | Metric timestamp |
| `cpu_utilization` | Float | Default: 0.0 | CPU utilization percentage |
| `memory_utilization` | Float | Default: 0.0 | Memory utilization percentage |
| `storage_utilization` | Float | Default: 0.0 | Storage utilization percentage |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |

**Relationships**:
- Belongs to `Sandbox` (via `sandbox_id`)

---

## 9. billing_records Table

**Purpose**: Billing and cost tracking

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `billing_id` | String(25) | Unique, Not Null, Index | Business identifier (bil-xxxxxxxxxxxx) |
| `user_account_id` | String(12) | Foreign Key, Not Null, Index | User account ID |
| `project_id` | String(25) | Foreign Key, Nullable, Index | Project ID |
| `sandbox_id` | String(25) | Foreign Key, Nullable, Index | Sandbox ID |
| `billing_date` | DateTime | Not Null, Index | Billing date |
| `service_type` | String(50) | Not Null | Service type: "sandbox_runtime", "storage", etc. |
| `usage_seconds` | Integer | Default: 0 | Usage in seconds |
| `hourly_rate` | Float | Not Null | Hourly rate |
| `amount` | Float | Not Null | Total amount |
| `description` | Text | Nullable | Billing description |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |

**Relationships**:
- Belongs to `User` (via `user_account_id`)
- Belongs to `Project` (via `project_id`) - optional
- Belongs to `Sandbox` (via `sandbox_id`) - optional

---

## 10. pending_signups Table

**Purpose**: Email verification for new users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | Integer | Primary Key, Auto Increment | Internal primary key |
| `signup_id` | String(25) | Unique, Not Null, Index | Business identifier (sgn-xxxxxxxxxxxx) |
| `email` | String(255) | Not Null, Index | Email address |
| `username` | String(100) | Not Null | Username |
| `full_name` | String(255) | Nullable | Full name |
| `verification_token` | String(255) | Not Null, Index | Verification token |
| `password_hash` | String(255) | Not Null | Hashed password |
| `created_at` | DateTime | Not Null, Default: now | Creation timestamp |
| `expires_at` | DateTime | Not Null, Index | Expiry timestamp |

---

## Key Design Principles

### 1. Business Keys vs Internal Keys
- **Internal Keys**: `id` (Integer, auto-increment) for database relationships and sorting
- **Business Keys**: Human-readable identifiers (e.g., `account_id`, `project_id`) for external APIs

### 2. Multi-tenancy
- All user-related data uses `account_id` (12-digit numeric) for business relationships
- Ensures data isolation and scalability

### 3. Resource ID Generation
- AWS-style resource IDs: `prefix-xxxxxxxxxxxxxxxxx`
- Examples: `prj-abc123def456ghi`, `sbx-xyz789uvw012abc`

### 4. Audit Trail
- All tables include `created_at` timestamp
- Most tables include `updated_at` timestamp with automatic updates

### 5. Soft Deletion
- Uses status flags (`is_active`, `status`) rather than hard deletion
- Preserves data integrity and audit trail

### 6. Indexing Strategy
- Business keys are indexed for fast lookups
- Foreign keys are indexed for relationship queries
- Timestamps are indexed for time-based queries
- Composite indexes for common query patterns

---

## Database Relationships

```
users (1) ←→ (many) projects
users (1) ←→ (many) api_keys
users (1) ←→ (many) notifications
users (1) ←→ (many) sandboxes
users (1) ←→ (many) billing_records
users (1) ←→ (many) usage_records

projects (1) ←→ (many) sandboxes
templates (1) ←→ (many) sandboxes

sandboxes (1) ←→ (many) usage_records
sandboxes (1) ←→ (many) metrics
sandboxes (1) ←→ (many) billing_records
```

This schema supports a multi-tenant SaaS platform with comprehensive user management, resource tracking, billing, and monitoring capabilities. 