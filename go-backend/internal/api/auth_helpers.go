package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"

	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

func (s *Server) handleResendVerification(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var pendingSignup models.PendingSignup
	if err := s.db.DB.Where("email = ?", req.Email).First(&pendingSignup).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No pending signup found for this email"})
		return
	}

	// Generate new verification code
	verificationCode := utils.GenerateRandomCode(6)
	expiresAt := time.Now().Add(24 * time.Hour)

	pendingSignup.VerificationToken = verificationCode
	pendingSignup.ExpiresAt = expiresAt
	s.db.DB.Save(&pendingSignup)

	// TODO: Send verification email
	c.JSON(http.StatusOK, gin.H{
		"message":           "Verification code resent successfully",
		"verification_code": verificationCode, // Remove in production
	})
}

func (s *Server) handleResetPassword(c *gin.Context) {
	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := s.db.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "If the email exists, a reset link has been sent"})
		return
	}

	// Generate reset token
	resetToken := utils.GenerateRandomCode(32)
	expiresAt := time.Now().Add(1 * time.Hour)

	user.ResetToken = &resetToken
	user.ResetTokenExpiry = &expiresAt
	user.LastPasswordResetRequest = utils.TimePtr(time.Now())

	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}

	// TODO: Send reset email
	c.JSON(http.StatusOK, gin.H{
		"message":     "If the email exists, a reset link has been sent",
		"reset_token": resetToken, // Remove in production
	})
}

func (s *Server) handleResetPasswordConfirm(c *gin.Context) {
	var req ResetPasswordWithTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := s.db.DB.Where("reset_token = ?", req.Token).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Check if token is expired
	if user.ResetTokenExpiry != nil && time.Now().After(*user.ResetTokenExpiry) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reset token has expired"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update user
	user.PasswordHash = string(hashedPassword)
	user.ResetToken = nil
	user.ResetTokenExpiry = nil

	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func (s *Server) handleResetOwnPassword(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req struct {
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}

func (s *Server) handleRequestPasswordReset(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	// Generate reset token
	resetToken := utils.GenerateRandomCode(32)
	expiresAt := time.Now().Add(1 * time.Hour)

	user.ResetToken = &resetToken
	user.ResetTokenExpiry = &expiresAt
	user.LastPasswordResetRequest = utils.TimePtr(time.Now())

	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate reset token"})
		return
	}

	// TODO: Send reset email
	c.JSON(http.StatusOK, gin.H{
		"message":     "Password reset link sent to your email",
		"reset_token": resetToken, // Remove in production
	})
}

func (s *Server) handleResetPasswordWithToken(c *gin.Context) {
	var req ResetPasswordWithTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := s.db.DB.Where("reset_token = ?", req.Token).First(&user).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired reset token"})
		return
	}

	// Check if token is expired
	if user.ResetTokenExpiry != nil && time.Now().After(*user.ResetTokenExpiry) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Reset token has expired"})
		return
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Update user
	user.PasswordHash = string(hashedPassword)
	user.ResetToken = nil
	user.ResetTokenExpiry = nil

	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password reset successfully"})
}

func (s *Server) handleDedicatedSignin(c *gin.Context) {
	var req DedicatedSigninRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := s.db.DB.Where("dedicated_signin_url = ?", req.SigninURL).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid signin URL"})
		return
	}

	// Get account information
	var account models.Account
	if err := s.db.DB.Where("account_id = ?", user.AccountID).First(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch account information"})
		return
	}

	// Check if user is disabled (this still prevents signin)
	if !user.IsActive {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User account is disabled"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid password"})
		return
	}

	// Generate JWT token
	token, err := s.generateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Update last login
	now := time.Now()
	user.LastLogin = &now
	s.db.DB.Save(&user)

	// Check if account is disabled and return special flag
	if !account.IsActive {
		c.JSON(http.StatusOK, gin.H{
			"access_token":      token,
			"token_type":        "bearer",
			"account_suspended": true,
			"account_name":      account.Name,
			"message":           "Account is suspended. You will be redirected to the suspension page.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": token,
		"token_type":   "bearer",
	})
}

func (s *Server) handleValidateSigninURL(c *gin.Context) {
	signinURL := c.Param("signin_url")

	// The frontend passes just the identifier part (e.g., "099969798376-c2e9er")
	// No need to extract from URL since it's already the identifier
	var user models.User
	if err := s.db.DB.Where("dedicated_signin_url = ?", signinURL).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid signin URL"})
		return
	}

	// Get account information
	var account models.Account
	if err := s.db.DB.Where("account_id = ?", user.AccountID).First(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch account information"})
		return
	}

	// Check if account is disabled (affects all users in the account)
	if !account.IsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error":            "Account is disabled",
			"message":          "This account has been disabled by the ScaleBox administrator. Please contact ScaleBox support to restore access.",
			"account_disabled": true,
			"account_name":     account.Name,
		})
		return
	}

	// Check if user is disabled (only affects this specific user)
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error":         "User is disabled",
			"message":       "This user account has been disabled by the account administrator. Please contact your account administrator to restore access.",
			"user_disabled": true,
			"account_name":  account.Name,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"valid": true,
		"user": gin.H{
			"display_name": user.DisplayName,
			"username":     user.Username,
		},
		"account_name":         account.Name,
		"account_email":        account.Email,
		"account_display_name": account.DisplayName,
		"account_description":  account.Description,
	})
}

func (s *Server) handleRotatePassword(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
	}

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

	c.JSON(http.StatusOK, gin.H{"message": "Password rotated successfully"})
}
