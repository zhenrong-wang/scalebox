package models

import (
	"time"

	"gorm.io/gorm"
)

type Project struct {
	ID          uint           `json:"id" gorm:"primaryKey"`
	ProjectID   string         `json:"project_id" gorm:"uniqueIndex;not null;size:25"`
	Name        string         `json:"name" gorm:"not null;size:255"`
	Description *string        `json:"description" gorm:"type:text"`
	OwnerUserID string         `json:"owner_user_id" gorm:"index;not null;size:25"`
	Status      string         `json:"status" gorm:"default:active;size:20"`
	IsDefault   bool           `json:"is_default" gorm:"default:false"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Owner    User      `json:"owner" gorm:"foreignKey:OwnerUserID"`
	Sandboxes []Sandbox `json:"sandboxes" gorm:"foreignKey:ProjectID"`
}

type Template struct {
	ID                  uint           `json:"id" gorm:"primaryKey"`
	TemplateID          string         `json:"template_id" gorm:"uniqueIndex;not null;size:25"`
	Name                string         `json:"name" gorm:"not null;size:255"`
	Description         *string        `json:"description" gorm:"type:text"`
	Category            string         `json:"category" gorm:"not null;size:100"`
	Language            string         `json:"language" gorm:"not null;size:100"`
	MinCPURequired      float64        `json:"min_cpu_required" gorm:"not null;default:1.0"`
	MinMemoryRequired   float64        `json:"min_memory_required" gorm:"not null;default:1.0"`
	IsOfficial          bool           `json:"is_official" gorm:"default:false"`
	IsPublic            bool           `json:"is_public" gorm:"default:false"`
	OwnerUserID         *string        `json:"owner_user_id" gorm:"index;size:25"`
	RepositoryURL       string         `json:"repository_url" gorm:"not null;size:500"`
	Tags                *string        `json:"tags" gorm:"type:json"`
	CreatedAt           time.Time      `json:"created_at"`
	UpdatedAt           time.Time      `json:"updated_at"`
	DeletedAt           gorm.DeletedAt `json:"-" gorm:"index"`

	// Relationships
	Owner     *User     `json:"owner" gorm:"foreignKey:OwnerUserID"`
	Sandboxes []Sandbox `json:"sandboxes" gorm:"foreignKey:TemplateID"`
}

// Computed properties for API compatibility
func (t *Template) CPUSpec() float64 {
	return t.MinCPURequired
}

func (t *Template) MemorySpec() float64 {
	return t.MinMemoryRequired
}

func (t *Template) OwnerID() *string {
	return t.OwnerUserID
} 