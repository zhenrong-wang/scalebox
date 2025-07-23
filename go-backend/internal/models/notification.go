package models

import (
	"time"
)

type Notification struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	NotificationID    string    `json:"notification_id" gorm:"uniqueIndex;not null;size:25"`
	UserID            string    `json:"user_id" gorm:"index;not null;size:25"`
	Title             string    `json:"title" gorm:"not null;size:255"`
	Message           string    `json:"message" gorm:"not null;type:text"`
	Type              string    `json:"type" gorm:"default:info;size:50"`
	IsRead            bool      `json:"is_read" gorm:"default:false"`
	RelatedEntityType *string   `json:"related_entity_type" gorm:"size:100"`
	RelatedEntityID   *string   `json:"related_entity_id" gorm:"size:255"`
	CreatedAt         time.Time `json:"created_at"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}

type APIKey struct {
	ID          uint       `json:"id" gorm:"primaryKey"`
	APIKey      string     `json:"api_key" gorm:"uniqueIndex;not null;size:50"`
	KeyID       string     `json:"key_id" gorm:"uniqueIndex;not null;size:25"`
	UserID      string     `json:"user_id" gorm:"index;not null;size:25"`
	Name        string     `json:"name" gorm:"not null;size:255"`
	Description *string    `json:"description" gorm:"type:text"`
	KeyHash     string     `json:"-" gorm:"not null;size:64"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	LastUsedAt  *time.Time `json:"last_used_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// Relationships
	User User `json:"user" gorm:"foreignKey:UserID"`
}

type BillingRecord struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	BillingID    string    `json:"billing_id" gorm:"uniqueIndex;not null;size:25"`
	UserID       string    `json:"user_id" gorm:"index;not null;size:25"`
	ProjectID    *string   `json:"project_id" gorm:"index;size:25"`
	SandboxID    *string   `json:"sandbox_id" gorm:"index;size:25"`
	BillingDate  time.Time `json:"billing_date" gorm:"index;not null"`
	ServiceType  string    `json:"service_type" gorm:"not null;size:50"`
	UsageSeconds int       `json:"usage_seconds" gorm:"default:0"`
	HourlyRate   float64   `json:"hourly_rate" gorm:"not null"`
	Amount       float64   `json:"amount" gorm:"not null"`
	Description  *string   `json:"description" gorm:"type:text"`
	CreatedAt    time.Time `json:"created_at"`

	// Relationships
	User    User     `json:"user" gorm:"foreignKey:UserID"`
	Project *Project `json:"project" gorm:"foreignKey:ProjectID"`
	Sandbox *Sandbox `json:"sandbox" gorm:"foreignKey:SandboxID"`
}

type PendingSignup struct {
	ID                uint      `json:"id" gorm:"primaryKey"`
	SignupID          string    `json:"signup_id" gorm:"uniqueIndex;not null;size:25"`
	Email             string    `json:"email" gorm:"index;not null;size:255"`
	Username          string    `json:"username" gorm:"not null;size:100"`
	VerificationToken string    `json:"-" gorm:"index;not null;size:255"`
	PasswordHash      string    `json:"-" gorm:"not null;size:255"`
	DisplayName       *string   `json:"display_name" gorm:"size:255"`
	CreatedAt         time.Time `json:"created_at"`
	ExpiresAt         time.Time `json:"expires_at" gorm:"index;not null"`
}
