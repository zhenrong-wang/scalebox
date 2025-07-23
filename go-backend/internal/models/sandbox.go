package models

import (
	"time"
)

type Sandbox struct {
	ID                uint       `json:"id" gorm:"primaryKey"`
	SandboxID         string     `json:"sandbox_id" gorm:"uniqueIndex;not null;size:25"`
	Name              string     `json:"name" gorm:"not null;size:100"`
	Description       *string    `json:"description" gorm:"type:text"`
	TemplateID        string     `json:"template_id" gorm:"index;not null;size:25"`
	OwnerUserID       string     `json:"owner_user_id" gorm:"index;not null;size:25"`
	ProjectID         string     `json:"project_id" gorm:"index;not null;size:25"`
	CPUSpec           float64    `json:"cpu_spec" gorm:"not null;default:1.0"`
	MemorySpec        float64    `json:"memory_spec" gorm:"not null;default:1.0"`
	MaxRunningSeconds int        `json:"max_running_seconds" gorm:"not null;default:86400"`
	Status            string     `json:"status" gorm:"default:created;size:20"`
	LatestSnapshotID  *string    `json:"latest_snapshot_id" gorm:"size:255"`
	SnapshotExpiresAt *time.Time `json:"snapshot_expires_at"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
	StartedAt         *time.Time `json:"started_at"`
	StoppedAt         *time.Time `json:"stopped_at"`
	TimeoutAt         *time.Time `json:"timeout_at"`
	RecycledAt        *time.Time `json:"recycled_at"`

	// Relationships
	Owner        User             `json:"owner" gorm:"foreignKey:OwnerUserID"`
	Project      Project          `json:"project" gorm:"foreignKey:ProjectID"`
	Template     Template         `json:"template" gorm:"foreignKey:TemplateID"`
	UsageRecords []SandboxUsage   `json:"usage_records" gorm:"foreignKey:SandboxID"`
	Metrics      []SandboxMetrics `json:"metrics" gorm:"foreignKey:SandboxID"`
}

type SandboxUsage struct {
	ID             uint       `json:"id" gorm:"primaryKey"`
	UsageID        string     `json:"usage_id" gorm:"uniqueIndex;not null;size:25"`
	SandboxID      string     `json:"sandbox_id" gorm:"index;not null;size:25"`
	UserID         string     `json:"user_id" gorm:"index;not null;size:25"`
	StartTime      time.Time  `json:"start_time" gorm:"index;not null"`
	EndTime        *time.Time `json:"end_time" gorm:"index"`
	RunningSeconds int        `json:"running_seconds" gorm:"default:0"`
	CPUHours       float64    `json:"cpu_hours" gorm:"default:0.0"`
	MemoryHours    float64    `json:"memory_hours" gorm:"default:0.0"`
	StorageHours   float64    `json:"storage_hours" gorm:"default:0.0"`
	HourlyRate     float64    `json:"hourly_rate" gorm:"not null"`
	Cost           float64    `json:"cost" gorm:"default:0.0"`
	CreatedAt      time.Time  `json:"created_at"`

	// Relationships
	Sandbox Sandbox `json:"sandbox" gorm:"foreignKey:SandboxID"`
	User    User    `json:"user" gorm:"foreignKey:UserID"`
}

type SandboxMetrics struct {
	ID                 uint      `json:"id" gorm:"primaryKey"`
	MetricID           string    `json:"metric_id" gorm:"uniqueIndex;not null;size:25"`
	SandboxID          string    `json:"sandbox_id" gorm:"index;not null;size:36"`
	Timestamp          time.Time `json:"timestamp" gorm:"index;not null"`
	CPUUtilization     float64   `json:"cpu_utilization" gorm:"default:0.0"`
	MemoryUtilization  float64   `json:"memory_utilization" gorm:"default:0.0"`
	StorageUtilization float64   `json:"storage_utilization" gorm:"default:0.0"`
	CreatedAt          time.Time `json:"created_at"`

	// Relationships
	Sandbox Sandbox `json:"sandbox" gorm:"foreignKey:SandboxID"`
}
