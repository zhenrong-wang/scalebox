package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

// Admin middleware to ensure only admin users can access
func (s *Server) adminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := c.MustGet("user").(models.User)
		if user.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// Account list response
type AccountListResponse struct {
	AccountID          string    `json:"account_id"`
	Name               string    `json:"name"`
	Email              string    `json:"email"`
	DisplayName        string    `json:"display_name"`
	IsActive           bool      `json:"is_active"`
	IsVerified         bool      `json:"is_verified"`
	SubscriptionPlan   string    `json:"subscription_plan"`
	SubscriptionStatus string    `json:"subscription_status"`
	CreatedAt          time.Time `json:"created_at"`
	UserCount          int64     `json:"user_count"`
	SandboxCount       int64     `json:"sandbox_count"`
	ProjectCount       int64     `json:"project_count"`
	ApiKeyCount        int64     `json:"api_key_count"`
	TotalSpent         float64   `json:"total_spent"`
}

// Account detail response
type AccountDetailResponse struct {
	AccountID          string           `json:"account_id"`
	Name               string           `json:"name"`
	Email              string           `json:"email"`
	DisplayName        string           `json:"display_name"`
	Description        string           `json:"description"`
	IsActive           bool             `json:"is_active"`
	IsVerified         bool             `json:"is_verified"`
	SubscriptionPlan   string           `json:"subscription_plan"`
	SubscriptionStatus string           `json:"subscription_status"`
	CreatedAt          time.Time        `json:"created_at"`
	Users              []UserSummary    `json:"users"`
	Sandboxes          []SandboxSummary `json:"sandboxes"`
	Projects           []ProjectSummary `json:"projects"`
	ApiKeys            []ApiKeySummary  `json:"api_keys"`
	TotalSpent         float64          `json:"total_spent"`
}

type UserSummary struct {
	UserID      string     `json:"user_id"`
	Username    string     `json:"username"`
	DisplayName string     `json:"display_name"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	IsActive    bool       `json:"is_active"`
	IsRootUser  bool       `json:"is_root_user"`
	CreatedAt   time.Time  `json:"created_at"`
	LastLogin   *time.Time `json:"last_login"`
}

type SandboxSummary struct {
	SandboxID   string    `json:"sandbox_id"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	OwnerUserID string    `json:"owner_user_id"`
}

type ProjectSummary struct {
	ProjectID   string    `json:"project_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	OwnerUserID string    `json:"owner_user_id"`
}

type ApiKeySummary struct {
	KeyID       string    `json:"key_id"`
	Name        string    `json:"name"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	OwnerUserID string    `json:"owner_user_id"`
}

// System statistics response
type SystemStatsResponse struct {
	TotalAccounts    int64   `json:"total_accounts"`
	ActiveAccounts   int64   `json:"active_accounts"`
	TotalUsers       int64   `json:"total_users"`
	ActiveUsers      int64   `json:"active_users"`
	TotalSandboxes   int64   `json:"total_sandboxes"`
	RunningSandboxes int64   `json:"running_sandboxes"`
	TotalProjects    int64   `json:"total_projects"`
	TotalApiKeys     int64   `json:"total_api_keys"`
	ActiveApiKeys    int64   `json:"active_api_keys"`
	TotalRevenue     float64 `json:"total_revenue"`
	MonthlyRevenue   float64 `json:"monthly_revenue"`
}

// List all accounts
func (s *Server) handleListAccounts(c *gin.Context) {
	var accounts []models.Account
	if err := s.db.DB.Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accounts"})
		return
	}

	var response []AccountListResponse
	for _, account := range accounts {
		// Get user count
		var userCount int64
		s.db.DB.Model(&models.User{}).Where("account_id = ?", account.AccountID).Count(&userCount)

		// Get sandbox count
		var sandboxCount int64
		s.db.DB.Model(&models.Sandbox{}).Joins("JOIN users ON sandboxes.owner_user_id = users.user_id").
			Where("users.account_id = ?", account.AccountID).Count(&sandboxCount)

		// Get project count
		var projectCount int64
		s.db.DB.Model(&models.Project{}).Joins("JOIN users ON projects.owner_user_id = users.user_id").
			Where("users.account_id = ?", account.AccountID).Count(&projectCount)

		// Get API key count
		var apiKeyCount int64
		s.db.DB.Model(&models.APIKey{}).Joins("JOIN users ON api_keys.owner_user_id = users.user_id").
			Where("users.account_id = ?", account.AccountID).Count(&apiKeyCount)

		// Get total spent (simplified - you might want to calculate from billing records)
		totalSpent := 0.0 // TODO: Calculate from billing records

		// Handle nullable string fields
		email := ""
		if account.Email != nil {
			email = *account.Email
		}
		displayName := ""
		if account.DisplayName != nil {
			displayName = *account.DisplayName
		}

		response = append(response, AccountListResponse{
			AccountID:          account.AccountID,
			Name:               account.Name,
			Email:              email,
			DisplayName:        displayName,
			IsActive:           account.IsActive,
			IsVerified:         account.IsVerified,
			SubscriptionPlan:   account.SubscriptionPlan,
			SubscriptionStatus: account.SubscriptionStatus,
			CreatedAt:          account.CreatedAt,
			UserCount:          userCount,
			SandboxCount:       sandboxCount,
			ProjectCount:       projectCount,
			ApiKeyCount:        apiKeyCount,
			TotalSpent:         totalSpent,
		})
	}

	c.JSON(http.StatusOK, gin.H{"accounts": response})
}

// Get account details
func (s *Server) handleGetAccount(c *gin.Context) {
	accountID := c.Param("account_id")

	var account models.Account
	if err := s.db.DB.Where("account_id = ?", accountID).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	// Get users in this account
	var users []models.User
	if err := s.db.DB.Where("account_id = ?", accountID).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}

	var userSummaries []UserSummary
	for _, user := range users {
		displayName := ""
		if user.DisplayName != nil {
			displayName = *user.DisplayName
		}
		userSummaries = append(userSummaries, UserSummary{
			UserID:      user.UserID,
			Username:    user.Username,
			DisplayName: displayName,
			Email:       user.Email,
			Role:        user.Role,
			IsActive:    user.IsActive,
			IsRootUser:  user.IsRootUser,
			CreatedAt:   user.CreatedAt,
			LastLogin:   user.LastLogin,
		})
	}

	// Get sandboxes owned by users in this account
	var sandboxes []models.Sandbox
	if err := s.db.DB.Joins("JOIN users ON sandboxes.owner_user_id = users.user_id").
		Where("users.account_id = ?", accountID).Find(&sandboxes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sandboxes"})
		return
	}

	var sandboxSummaries []SandboxSummary
	for _, sandbox := range sandboxes {
		sandboxSummaries = append(sandboxSummaries, SandboxSummary{
			SandboxID:   sandbox.SandboxID,
			Name:        sandbox.Name,
			Status:      sandbox.Status,
			CreatedAt:   sandbox.CreatedAt,
			OwnerUserID: sandbox.OwnerUserID,
		})
	}

	// Get projects owned by users in this account
	var projects []models.Project
	if err := s.db.DB.Joins("JOIN users ON projects.owner_user_id = users.user_id").
		Where("users.account_id = ?", accountID).Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}

	var projectSummaries []ProjectSummary
	for _, project := range projects {
		description := ""
		if project.Description != nil {
			description = *project.Description
		}
		projectSummaries = append(projectSummaries, ProjectSummary{
			ProjectID:   project.ProjectID,
			Name:        project.Name,
			Description: description,
			CreatedAt:   project.CreatedAt,
			OwnerUserID: project.OwnerUserID,
		})
	}

	// Get API keys owned by users in this account
	var apiKeys []models.APIKey
	if err := s.db.DB.Joins("JOIN users ON api_keys.owner_user_id = users.user_id").
		Where("users.account_id = ?", accountID).Find(&apiKeys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch API keys"})
		return
	}

	var apiKeySummaries []ApiKeySummary
	for _, apiKey := range apiKeys {
		apiKeySummaries = append(apiKeySummaries, ApiKeySummary{
			KeyID:       apiKey.KeyID,
			Name:        apiKey.Name,
			IsActive:    apiKey.IsActive,
			CreatedAt:   apiKey.CreatedAt,
			OwnerUserID: apiKey.UserID,
		})
	}

	// Calculate total spent (simplified)
	totalSpent := 0.0 // TODO: Calculate from billing records

	// Handle nullable account fields
	accountEmail := ""
	if account.Email != nil {
		accountEmail = *account.Email
	}
	accountDisplayName := ""
	if account.DisplayName != nil {
		accountDisplayName = *account.DisplayName
	}
	accountDescription := ""
	if account.Description != nil {
		accountDescription = *account.Description
	}

	response := AccountDetailResponse{
		AccountID:          account.AccountID,
		Name:               account.Name,
		Email:              accountEmail,
		DisplayName:        accountDisplayName,
		Description:        accountDescription,
		IsActive:           account.IsActive,
		IsVerified:         account.IsVerified,
		SubscriptionPlan:   account.SubscriptionPlan,
		SubscriptionStatus: account.SubscriptionStatus,
		CreatedAt:          account.CreatedAt,
		Users:              userSummaries,
		Sandboxes:          sandboxSummaries,
		Projects:           projectSummaries,
		ApiKeys:            apiKeySummaries,
		TotalSpent:         totalSpent,
	}

	c.JSON(http.StatusOK, response)
}

// Disable account
func (s *Server) handleDisableAccount(c *gin.Context) {
	accountID := c.Param("account_id")

	var account models.Account
	if err := s.db.DB.Where("account_id = ?", accountID).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	// CRITICAL: Admin account should NEVER be disabled
	// Check if this account has any admin users
	var adminUser models.User
	if err := s.db.DB.Where("account_id = ? AND role = ?", accountID, "admin").First(&adminUser).Error; err == nil {
		c.JSON(http.StatusForbidden, gin.H{
			"error":   "Cannot disable admin account",
			"message": "Admin accounts cannot be disabled. This is a system protection to ensure administrative access is always available.",
		})
		return
	}

	account.IsActive = false
	if err := s.db.DB.Save(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable account"})
		return
	}

	// Blacklist all active tokens for users in this account
	// Note: In a production system, you might want to store active tokens in Redis
	// and invalidate them there instead of using a blacklist approach
	var users []models.User
	if err := s.db.DB.Where("account_id = ?", accountID).Find(&users).Error; err != nil {
		// Log error but don't fail the operation
		fmt.Printf("Warning: Failed to fetch users for account %s: %v\n", accountID, err)
	}

	// For now, we'll add a placeholder entry to indicate account suspension
	// In a real implementation, you'd iterate through all active tokens
	// and add them to the blacklist
	expiresAt := time.Now().Add(24 * time.Hour) // Tokens typically expire in 24 hours
	blacklistEntry := models.TokenBlacklist{
		TokenHash: utils.HashString("account_suspended_" + accountID),
		UserID:    "account_level",
		AccountID: accountID,
		ExpiresAt: expiresAt,
	}
	s.db.DB.Create(&blacklistEntry)

	// Send notification to root users of this account
	s.notifyAccountRootUsers(accountID, "Account Disabled",
		"Your account has been disabled by the system administrator. Please contact support for assistance.")

	c.JSON(http.StatusOK, gin.H{"message": "Account disabled successfully"})
}

// Enable account
func (s *Server) handleEnableAccount(c *gin.Context) {
	accountID := c.Param("account_id")

	var account models.Account
	if err := s.db.DB.Where("account_id = ?", accountID).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	account.IsActive = true
	if err := s.db.DB.Save(&account).Error; err != nil {
		// Log the actual error for debugging
		fmt.Printf("Error enabling account %s: %v\n", accountID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable account"})
		return
	}

	// Send notification to root users of this account
	s.notifyAccountRootUsers(accountID, "Account Enabled",
		"Your account has been enabled by the system administrator.")

	c.JSON(http.StatusOK, gin.H{"message": "Account enabled successfully"})
}

// Delete account
func (s *Server) handleDeleteAccount(c *gin.Context) {
	accountID := c.Param("account_id")

	// Start transaction
	tx := s.db.DB.Begin()

	// Delete API keys owned by users in this account
	if err := tx.Exec("DELETE api_keys FROM api_keys JOIN users ON api_keys.owner_user_id = users.user_id WHERE users.account_id = ?", accountID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete API keys"})
		return
	}

	// Delete sandboxes owned by users in this account
	if err := tx.Exec("DELETE sandboxes FROM sandboxes JOIN users ON sandboxes.owner_user_id = users.user_id WHERE users.account_id = ?", accountID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sandboxes"})
		return
	}

	// Delete projects owned by users in this account
	if err := tx.Exec("DELETE projects FROM projects JOIN users ON projects.owner_user_id = users.user_id WHERE users.account_id = ?", accountID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete projects"})
		return
	}

	// Delete users in this account
	if err := tx.Where("account_id = ?", accountID).Delete(&models.User{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete users"})
		return
	}

	// Delete the account
	if err := tx.Where("account_id = ?", accountID).Delete(&models.Account{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete account"})
		return
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Account deleted successfully"})
}

// Reset root user password
func (s *Server) handleResetAccountPassword(c *gin.Context) {
	accountID := c.Param("account_id")

	// Find root user in this account
	var rootUser models.User
	if err := s.db.DB.Where("account_id = ? AND is_root_user = ?", accountID, true).First(&rootUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Root user not found"})
		return
	}

	// Generate new password
	newPassword := utils.GenerateInitialPassword()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	rootUser.PasswordHash = string(hashedPassword)
	if err := s.db.DB.Save(&rootUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	// Send notification to root user
	s.notifyUser(rootUser.UserID, "Password Reset",
		"Your password has been reset by the system administrator. Please check your email for the new password.")

	// Send email with new password
	if s.emailService != nil {
		s.emailService.SendPasswordResetEmail(rootUser.Email, newPassword)
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Password reset successfully",
		"new_password": newPassword, // Remove this in production
	})
}

// Get system statistics
func (s *Server) handleGetSystemStats(c *gin.Context) {
	var stats SystemStatsResponse

	// Count accounts
	s.db.DB.Model(&models.Account{}).Count(&stats.TotalAccounts)
	s.db.DB.Model(&models.Account{}).Where("is_active = ?", true).Count(&stats.ActiveAccounts)

	// Count users
	s.db.DB.Model(&models.User{}).Count(&stats.TotalUsers)
	s.db.DB.Model(&models.User{}).Where("is_active = ?", true).Count(&stats.ActiveUsers)

	// Count sandboxes
	s.db.DB.Model(&models.Sandbox{}).Count(&stats.TotalSandboxes)
	s.db.DB.Model(&models.Sandbox{}).Where("status = ?", "running").Count(&stats.RunningSandboxes)

	// Count projects
	s.db.DB.Model(&models.Project{}).Count(&stats.TotalProjects)

	// Count API keys
	s.db.DB.Model(&models.APIKey{}).Count(&stats.TotalApiKeys)
	s.db.DB.Model(&models.APIKey{}).Where("is_active = ?", true).Count(&stats.ActiveApiKeys)

	// Calculate revenue (simplified)
	stats.TotalRevenue = 0.0   // TODO: Calculate from billing records
	stats.MonthlyRevenue = 0.0 // TODO: Calculate from billing records

	c.JSON(http.StatusOK, stats)
}

// Helper function to notify root users of an account
func (s *Server) notifyAccountRootUsers(accountID string, title string, message string) {
	var rootUsers []models.User
	if err := s.db.DB.Where("account_id = ? AND is_root_user = ?", accountID, true).Find(&rootUsers).Error; err != nil {
		return
	}

	for _, user := range rootUsers {
		s.notifyUser(user.UserID, title, message)
	}
}

// Helper function to notify a specific user
func (s *Server) notifyUser(userID string, title string, message string) {
	if s.notificationService != nil {
		s.notificationService.CreateNotification(userID, title, message, "admin", nil, nil)
	}
}
