package database

import (
	"fmt"
	"log"

	"scalebox-backend/internal/config"
	"scalebox-backend/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Database struct {
	DB *gorm.DB
}

func Init(cfg config.DatabaseConfig) (*Database, error) {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.User,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Auto migrate models
	if err := autoMigrate(db); err != nil {
		return nil, fmt.Errorf("failed to auto migrate: %w", err)
	}

	log.Println("Database connected and migrated successfully")
	return &Database{DB: db}, nil
}

func autoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Account{},
		&models.User{},
		&models.Project{},
		&models.Template{},
		&models.Sandbox{},
		&models.SandboxUsage{},
		&models.SandboxMetrics{},
		&models.Notification{},
		&models.APIKey{},
		&models.BillingRecord{},
		&models.PendingSignup{},
		&models.AccountEmailChange{},
	)
}

// GetDB returns the underlying GORM DB instance
func (d *Database) GetDB() *gorm.DB {
	return d.DB
} 