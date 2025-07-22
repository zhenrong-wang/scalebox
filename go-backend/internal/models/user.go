package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID                    uint           `json:"id" gorm:"primaryKey"`
	UserID                string         `json:"user_id" gorm:"uniqueIndex;not null;size:25"`
	AccountID             string         `json:"account_id" gorm:"index;not null;size:12"`
	Email                 string         `json:"email" gorm:"index;not null;size:255"`
	Username              string         `json:"username" gorm:"index;not null;size:100"`
	PasswordHash          string         `json:"-" gorm:"not null;size:255"`
	DisplayName           *string        `json:"display_name" gorm:"size:255"`
	Role                  string         `json:"role" gorm:"default:user;size:50"`
	IsActive              bool           `json:"is_active" gorm:"default:true"`
	IsRootUser            bool           `json:"is_root_user" gorm:"default:false"`
	IsVerified            bool           `json:"is_verified" gorm:"default:false"`
	DedicatedSigninURL    *string        `json:"dedicated_signin_url" gorm:"uniqueIndex;size:255"`
	IsFirstTimeLogin      bool           `json:"is_first_time_login" gorm:"default:true"`
	Description           *string        `json:"description" gorm:"type:text"`
	VerificationToken     *string        `json:"-" gorm:"size:255"`
	ResetToken            *string        `json:"-" gorm:"size:255"`
	ResetTokenExpiry      *time.Time     `json:"-"`
	LastLogin             *time.Time     `json:"last_login"`
	LastPasswordResetReq  *time.Time     `json:"-"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`
	DeletedAt             gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Account      Account       `json:"account" gorm:"foreignKey:AccountID"`
	Projects     []Project     `json:"projects" gorm:"foreignKey:OwnerUserID"`
	Templates    []Template    `json:"templates" gorm:"foreignKey:OwnerUserID"`
	APIKeys      []APIKey      `json:"api_keys" gorm:"foreignKey:UserID"`
	Notifications []Notification `json:"notifications" gorm:"foreignKey:UserID"`
	Sandboxes    []Sandbox     `json:"sandboxes" gorm:"foreignKey:OwnerUserID"`
}

type Account struct {
	ID                uint           `json:"id" gorm:"primaryKey"`
	AccountID         string         `json:"account_id" gorm:"uniqueIndex;not null;size:12"`
	Name              string         `json:"name" gorm:"not null;size:255"`
	Email             *string        `json:"email" gorm:"size:255"`
	DisplayName       *string        `json:"display_name" gorm:"size:255"`
	Description       *string        `json:"description" gorm:"type:text"`
	IsActive          bool           `json:"is_active" gorm:"default:true"`
	IsVerified        bool           `json:"is_verified" gorm:"default:false"`
	SubscriptionPlan  string         `json:"subscription_plan" gorm:"default:free;size:50"`
	SubscriptionStatus string        `json:"subscription_status" gorm:"default:active;size:50"`
	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`
	DeletedAt         gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Users []User `json:"users" gorm:"foreignKey:AccountID"`
}

type AccountEmailChange struct {
	ID                    uint           `json:"id" gorm:"primaryKey"`
	ChangeID              string         `json:"change_id" gorm:"uniqueIndex;not null;size:25"`
	AccountID             string         `json:"account_id" gorm:"index;not null;size:12"`
	CurrentEmail          string         `json:"current_email" gorm:"not null;size:255"`
	NewEmail              string         `json:"new_email" gorm:"not null;size:255"`
	CurrentEmailToken     string         `json:"-" gorm:"index;not null;size:255"`
	NewEmailToken         string         `json:"-" gorm:"index;not null;size:255"`
	CurrentEmailConfirmed bool           `json:"current_email_confirmed" gorm:"default:false"`
	NewEmailConfirmed     bool           `json:"new_email_confirmed" gorm:"default:false"`
	ExpiresAt             time.Time      `json:"expires_at" gorm:"index;not null"`
	CreatedAt             time.Time      `json:"created_at"`
	CompletedAt           *time.Time     `json:"completed_at"`
	DeletedAt             gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Account Account `json:"account" gorm:"foreignKey:AccountID"`
} 