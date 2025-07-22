package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"scalebox-backend/internal/database"
	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type CreateUserRequest struct {
	Email       string `json:"email" binding:"required,email"`
	Username    string `json:"username" binding:"required"`
	DisplayName string `json:"display_name"`
	Role        string `json:"role" binding:"required"`
	IsActive    bool   `json:"is_active"`
	Description string `json:"description"`
}

type UpdateUserRequest struct {
	DisplayName string `json:"display_name"`
	Role        string `json:"role"`
	IsActive    bool   `json:"is_active"`
	Description string `json:"description"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password" binding:"required"`
	NewPassword     string `json:"new_password" binding:"required,min=8"`
}

type ResetPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type ResetPasswordWithTokenRequest struct {
	Token       string `json:"token" binding:"required"`
	NewPassword string `json:"new_password" binding:"required,min=8"`
}

type DedicatedSigninRequest struct {
	SigninURL string `json:"signin_url" binding:"required"`
	Password  string `json:"password" binding:"required"`
}

type AccountEmailChangeRequest struct {
	CurrentEmail string `json:"current_email" binding:"required,email"`
	NewEmail     string `json:"new_email" binding:"required,email"`
}

type AccountEmailChangeConfirmation struct {
	Token string `json:"token" binding:"required"`
}

func (s *Server) handleGetProfile(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	
	// Load account information
	var account models.Account
	s.db.DB.Where("account_id = ?", user.AccountID).First(&account)
	
	response := gin.H{
		"user_id":         user.UserID,
		"account_id":      user.AccountID,
		"email":           user.Email,
		"username":        user.Username,
		"display_name":    user.DisplayName,
		"role":            user.Role,
		"is_active":       user.IsActive,
		"is_root_user":    user.IsRootUser,
		"is_verified":     user.IsVerified,
		"description":     user.Description,
		"last_login":      user.LastLogin,
		"created_at":      user.CreatedAt,
		"account": gin.H{
			"account_id":         account.AccountID,
			"name":               account.Name,
			"email":              account.Email,
			"display_name":       account.DisplayName,
			"description":        account.Description,
			"is_active":          account.IsActive,
			"is_verified":        account.IsVerified,
			"subscription_plan":  account.SubscriptionPlan,
			"subscription_status": account.SubscriptionStatus,
			"created_at":         account.CreatedAt,
		},
	}
	
	c.JSON(http.StatusOK, response)
}

func (s *Server) handleUpdateProfile(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Update user fields
	if req.DisplayName != "" {
		user.DisplayName = &req.DisplayName
	}
	if req.Description != "" {
		user.Description = &req.Description
	}
	
	// Only root users can update role and active status
	if user.IsRootUser {
		if req.Role != "" {
			user.Role = req.Role
		}
		user.IsActive = req.IsActive
	}
	
	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Profile updated successfully"})
}

func (s *Server) handleCreateUser(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can create users"})
		return
	}
	
	var req CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Check if email already exists
	var existingUser models.User
	if err := s.db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
		return
	}
	
	// Generate initial password
	initialPassword := utils.GenerateInitialPassword()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(initialPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	
	// Create new user
	newUser := models.User{
		UserID:        utils.GenerateUserID(),
		AccountID:     user.AccountID,
		Email:         req.Email,
		Username:      req.Username,
		PasswordHash:  string(hashedPassword),
		DisplayName:   &req.DisplayName,
		Role:          req.Role,
		IsActive:      req.IsActive,
		IsVerified:    true,
		IsRootUser:    false,
		Description:   &req.Description,
	}
	
	if err := s.db.DB.Create(&newUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}
	
	// Create welcome notification for new user
	notification := models.Notification{
		NotificationID:    utils.GenerateNotificationID(),
		UserID:            newUser.UserID,
		Title:             "Welcome to ScaleBox! 🎉",
		Message:           "Hello " + req.DisplayName + "! Welcome to ScaleBox. Your account has been created by " + *user.DisplayName + ".",
		Type:              "info",
		RelatedEntityType: utils.StringPtr("user"),
		RelatedEntityID:   &newUser.UserID,
	}
	s.db.DB.Create(&notification)
	
	// Create notification for root user
	rootNotification := models.Notification{
		NotificationID:    utils.GenerateNotificationID(),
		UserID:            user.UserID,
		Title:             "New User Created",
		Message:           "User " + req.DisplayName + " (" + req.Email + ") has been successfully created.",
		Type:              "success",
		RelatedEntityType: utils.StringPtr("user"),
		RelatedEntityID:   &newUser.UserID,
	}
	s.db.DB.Create(&rootNotification)
	
	response := gin.H{
		"message": "User created successfully",
		"user": gin.H{
			"user_id":      newUser.UserID,
			"email":        newUser.Email,
			"username":     newUser.Username,
			"display_name": newUser.DisplayName,
			"role":         newUser.Role,
			"is_active":    newUser.IsActive,
		},
		"initial_password": initialPassword, // Remove this in production
	}
	
	c.JSON(http.StatusCreated, response)
}

func (s *Server) handleListUsers(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can list users"})
		return
	}
	
	var users []models.User
	if err := s.db.DB.Where("account_id = ?", user.AccountID).Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	
	var response []gin.H
	for _, u := range users {
		response = append(response, gin.H{
			"user_id":      u.UserID,
			"email":        u.Email,
			"username":     u.Username,
			"display_name": u.DisplayName,
			"role":         u.Role,
			"is_active":    u.IsActive,
			"is_root_user": u.IsRootUser,
			"is_verified":  u.IsVerified,
			"created_at":   u.CreatedAt,
			"last_login":   u.LastLogin,
		})
	}
	
	c.JSON(http.StatusOK, gin.H{"users": response})
}

func (s *Server) handleGetUser(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can view user details"})
		return
	}
	
	userID := c.Param("user_id")
	var targetUser models.User
	if err := s.db.DB.Where("user_id = ? AND account_id = ?", userID, user.AccountID).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	response := gin.H{
		"user_id":      targetUser.UserID,
		"email":        targetUser.Email,
		"username":     targetUser.Username,
		"display_name": targetUser.DisplayName,
		"role":         targetUser.Role,
		"is_active":    targetUser.IsActive,
		"is_root_user": targetUser.IsRootUser,
		"is_verified":  targetUser.IsVerified,
		"description":  targetUser.Description,
		"created_at":   targetUser.CreatedAt,
		"last_login":   targetUser.LastLogin,
	}
	
	c.JSON(http.StatusOK, response)
}

func (s *Server) handleUpdateUser(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can update users"})
		return
	}
	
	userID := c.Param("user_id")
	var targetUser models.User
	if err := s.db.DB.Where("user_id = ? AND account_id = ?", userID, user.AccountID).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Prevent disabling root users
	if targetUser.IsRootUser && !req.IsActive {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Root users cannot be disabled"})
		return
	}
	
	// Update fields
	if req.DisplayName != "" {
		targetUser.DisplayName = &req.DisplayName
	}
	if req.Role != "" {
		targetUser.Role = req.Role
	}
	targetUser.IsActive = req.IsActive
	if req.Description != "" {
		targetUser.Description = &req.Description
	}
	
	if err := s.db.DB.Save(&targetUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "User updated successfully"})
}

func (s *Server) handleDeleteUser(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can delete users"})
		return
	}
	
	userID := c.Param("user_id")
	var targetUser models.User
	if err := s.db.DB.Where("user_id = ? AND account_id = ?", userID, user.AccountID).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	// Prevent deleting root users
	if targetUser.IsRootUser {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Root users cannot be deleted"})
		return
	}
	
	if err := s.db.DB.Delete(&targetUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete user"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (s *Server) handleChangePassword(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	
	var req ChangePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Verify current password
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current password is incorrect"})
		return
	}
	
	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	
	user.PasswordHash = string(hashedPassword)
	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

func (s *Server) handleRequestAccountEmailChange(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can change account email"})
		return
	}
	
	var req AccountEmailChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Get account
	var account models.Account
	if err := s.db.DB.Where("account_id = ?", user.AccountID).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}
	
	// Verify current email
	if account.Email == nil || *account.Email != req.CurrentEmail {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Current email is incorrect"})
		return
	}
	
	// Check if new email is different
	if req.CurrentEmail == req.NewEmail {
		c.JSON(http.StatusBadRequest, gin.H{"error": "New email must be different from current email"})
		return
	}
	
	// Check if new email is globally unique
	var existingUser models.User
	if err := s.db.DB.Where("email = ?", req.NewEmail).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
		return
	}
	
	// Generate tokens
	currentToken := uuid.New().String()
	newToken := uuid.New().String()
	expiresAt := time.Now().Add(30 * time.Minute)
	
	// Create email change record
	emailChange := models.AccountEmailChange{
		ChangeID:              utils.GenerateResourceID("email", 25),
		AccountID:             user.AccountID,
		CurrentEmail:          req.CurrentEmail,
		NewEmail:              req.NewEmail,
		CurrentEmailToken:     currentToken,
		NewEmailToken:         newToken,
		CurrentEmailConfirmed: false,
		NewEmailConfirmed:     false,
		ExpiresAt:             expiresAt,
	}
	
	if err := s.db.DB.Create(&emailChange).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create email change request"})
		return
	}
	
	// TODO: Send confirmation emails
	// For now, return the tokens (remove in production)
	c.JSON(http.StatusOK, gin.H{
		"message": "Email change request created. Confirmation links sent to both email addresses.",
		"current_token": currentToken, // Remove in production
		"new_token":    newToken,      // Remove in production
	})
}

func (s *Server) handleConfirmAccountEmailChange(c *gin.Context) {
	var req AccountEmailChangeConfirmation
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	var emailChange models.AccountEmailChange
	if err := s.db.DB.Where("current_email_token = ? OR new_email_token = ?", req.Token, req.Token).First(&emailChange).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid or expired token"})
		return
	}
	
	// Check if already completed
	if emailChange.CompletedAt != nil {
		c.JSON(http.StatusOK, gin.H{
			"status":        "completed",
			"message":       "Email change has already been completed successfully.",
			"current_email": emailChange.CurrentEmail,
			"new_email":     emailChange.NewEmail,
		})
		return
	}
	
	// Check if expired
	if time.Now().After(emailChange.ExpiresAt) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Token has expired"})
		return
	}
	
	// Determine which email is being confirmed
	isCurrentEmail := emailChange.CurrentEmailToken == req.Token
	isNewEmail := emailChange.NewEmailToken == req.Token
	
	if isCurrentEmail {
		emailChange.CurrentEmailConfirmed = true
	} else if isNewEmail {
		emailChange.NewEmailConfirmed = true
	} else {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid token"})
		return
	}
	
	// Check if both emails are confirmed
	if emailChange.CurrentEmailConfirmed && emailChange.NewEmailConfirmed {
		// Complete the email change
		tx := s.db.DB.Begin()
		
		// Update account email
		if err := tx.Model(&models.Account{}).Where("account_id = ?", emailChange.AccountID).Update("email", emailChange.NewEmail).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update account email"})
			return
		}
		
		// Update all users in the account
		if err := tx.Model(&models.User{}).Where("account_id = ?", emailChange.AccountID).Update("email", emailChange.NewEmail).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update user emails"})
			return
		}
		
		// Mark as completed
		now := time.Now()
		emailChange.CompletedAt = &now
		if err := tx.Save(&emailChange).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to complete email change"})
			return
		}
		
		tx.Commit()
		
		c.JSON(http.StatusOK, gin.H{
			"status":        "completed",
			"message":       "Account email changed successfully! Both confirmation links have been verified.",
			"current_email": emailChange.CurrentEmail,
			"new_email":     emailChange.NewEmail,
		})
	} else {
		// Save partial confirmation
		if err := s.db.DB.Save(&emailChange).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to confirm email"})
			return
		}
		
		// Determine which email is still pending
		var confirmedEmail, pendingEmail string
		if emailChange.CurrentEmailConfirmed {
			confirmedEmail = emailChange.CurrentEmail
			pendingEmail = emailChange.NewEmail
		} else {
			confirmedEmail = emailChange.NewEmail
			pendingEmail = emailChange.CurrentEmail
		}
		
		c.JSON(http.StatusOK, gin.H{
			"status":         "pending",
			"message":        "Email confirmed successfully. Please check " + pendingEmail + " for the second confirmation link to complete the change.",
			"confirmed_email": confirmedEmail,
			"pending_email":   pendingEmail,
			"expires_at":      emailChange.ExpiresAt.Format(time.RFC3339),
		})
	}
}

func (s *Server) handleGetEmailChangeStatus(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can check email change status"})
		return
	}
	
	var emailChange models.AccountEmailChange
	if err := s.db.DB.Where("account_id = ? AND completed_at IS NULL", user.AccountID).First(&emailChange).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"has_pending_request": false})
		return
	}
	
	// Determine status
	var status string
	var message string
	
	if emailChange.CurrentEmailConfirmed && emailChange.NewEmailConfirmed {
		status = "both_confirmed"
		message = "Both emails confirmed. Email change will be completed shortly."
	} else if emailChange.CurrentEmailConfirmed || emailChange.NewEmailConfirmed {
		status = "partial_confirmed"
		var confirmedEmail, pendingEmail string
		if emailChange.CurrentEmailConfirmed {
			confirmedEmail = emailChange.CurrentEmail
			pendingEmail = emailChange.NewEmail
		} else {
			confirmedEmail = emailChange.NewEmail
			pendingEmail = emailChange.CurrentEmail
		}
		message = "One email confirmed. Waiting for confirmation from " + pendingEmail + "."
	} else {
		status = "none_confirmed"
		message = "No emails confirmed yet. Please check both email addresses for confirmation links."
	}
	
	c.JSON(http.StatusOK, gin.H{
		"has_pending_request": true,
		"status":              status,
		"message":             message,
		"expires_at":          emailChange.ExpiresAt.Format(time.RFC3339),
	})
}

func (s *Server) handleCleanupExpiredEmailChanges(c *gin.Context) {
	// Delete expired email change requests
	if err := s.db.DB.Where("expires_at < ? AND completed_at IS NULL", time.Now()).Delete(&models.AccountEmailChange{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to cleanup expired email changes"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Expired email changes cleaned up successfully"})
} 

func (s *Server) handleResetUserPassword(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	if !user.IsRootUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only root users can reset user passwords"})
		return
	}
	
	userID := c.Param("user_id")
	var targetUser models.User
	if err := s.db.DB.Where("user_id = ? AND account_id = ?", userID, user.AccountID).First(&targetUser).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}
	
	// Generate new password
	newPassword := utils.GenerateInitialPassword()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}
	
	targetUser.PasswordHash = string(hashedPassword)
	if err := s.db.DB.Save(&targetUser).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"message": "Password reset successfully",
		"new_password": newPassword, // Remove this in production
	})
} 