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

	// Skip auto migration for now since existing database schema is incompatible
	// TODO: Create proper migration scripts for production
	database := &Database{DB: db}

	// Ensure admin accounts are always active
	if err := database.ensureAdminAccountActive(); err != nil {
		log.Printf("Warning: Failed to ensure admin account is active: %v", err)
	}

	log.Println("Database connected successfully (auto-migration skipped)")
	return database, nil
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
		&models.TokenBlacklist{},
	)
}

// GetDB returns the underlying GORM DB instance
func (d *Database) GetDB() *gorm.DB {
	return d.DB
}

// ensureAdminAccountActive ensures that any account with admin users is always active
func (d *Database) ensureAdminAccountActive() error {
	// Find all accounts that have admin users but are marked as inactive
	var inactiveAdminAccounts []models.Account
	err := d.DB.Raw(`
		SELECT DISTINCT a.* 
		FROM accounts a 
		JOIN users u ON a.account_id = u.account_id 
		WHERE u.role = 'admin' AND a.is_active = false
	`).Scan(&inactiveAdminAccounts).Error

	if err != nil {
		return fmt.Errorf("failed to query inactive admin accounts: %w", err)
	}

	// Activate any admin accounts that are inactive
	for _, account := range inactiveAdminAccounts {
		log.Printf("CRITICAL: Found inactive admin account %s, activating it", account.AccountID)

		if err := d.DB.Model(&account).Where("account_id = ?", account.AccountID).Update("is_active", true).Error; err != nil {
			log.Printf("Error activating admin account %s: %v", account.AccountID, err)
			continue
		}

		log.Printf("Successfully activated admin account %s", account.AccountID)
	}

	return nil
}
