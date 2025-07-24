package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"

	"scalebox-backend/internal/config"
	"scalebox-backend/internal/database"
	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type AuthHandler struct {
	db     *database.Database
	config *config.Config
}

func NewAuthHandler(db *database.Database, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		db:     db,
		config: cfg,
	}
}

type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Name     string `json:"name"`
}

type SigninRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type VerifyEmailRequest struct {
	Token string `json:"token" binding:"required"`
}

func (s *Server) handleSignup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if email already exists
	var existingUser models.User
	if err := s.db.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already registered"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// Generate verification code
	verificationCode := utils.GenerateRandomCode(6)
	expiresAt := time.Now().Add(24 * time.Hour)

	// Check if pending signup exists
	var pendingSignup models.PendingSignup
	if err := s.db.DB.Where("email = ?", req.Email).First(&pendingSignup).Error; err == nil {
		// Update existing pending signup
		pendingSignup.DisplayName = &req.Name
		pendingSignup.VerificationToken = verificationCode
		pendingSignup.ExpiresAt = expiresAt
		pendingSignup.Username = req.Email[:len(req.Email)-len("@example.com")]
		pendingSignup.PasswordHash = string(hashedPassword)
		s.db.DB.Save(&pendingSignup)
	} else {
		// Create new pending signup
		pendingSignup = models.PendingSignup{
			SignupID:          utils.GenerateResourceID("sup", 17),
			Email:             req.Email,
			Username:          req.Email[:len(req.Email)-len("@example.com")],
			DisplayName:       &req.Name,
			VerificationToken: verificationCode,
			PasswordHash:      string(hashedPassword),
			ExpiresAt:         expiresAt,
		}
		s.db.DB.Create(&pendingSignup)
	}

	// TODO: Send verification email
	// For now, just return the code
	c.JSON(http.StatusOK, gin.H{
		"message":           "Signup successful. Please check your email for the verification code.",
		"verification_code": verificationCode, // Remove this in production
	})
}

func (s *Server) handleSignin(c *gin.Context) {
	var req SigninRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := s.db.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	if !user.IsVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Email not verified"})
		return
	}

	// Get account information to check if it's suspended
	var account models.Account
	if err := s.db.DB.Where("account_id = ?", user.AccountID).First(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch account information"})
		return
	}

	// Update last login time
	user.LastLogin = &time.Time{}
	*user.LastLogin = time.Now()
	if err := s.db.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update last login"})
		return
	}

	// Generate JWT token
	token, err := s.generateJWT(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	// Check if account is suspended and return special flag (but admin users are never suspended)
	if !account.IsActive && user.Role != "admin" {
		c.JSON(http.StatusOK, gin.H{
			"access_token":      token,
			"token_type":        "bearer",
			"account_suspended": true,
			"account_name":      account.Name,
			"user": gin.H{
				"id":    user.UserID,
				"email": user.Email,
				"name":  user.DisplayName,
			},
			"message": "Account is suspended. You will be redirected to the suspension page.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": token,
		"token_type":   "bearer",
	})
}

func (s *Server) handleVerifyEmail(c *gin.Context) {
	var req VerifyEmailRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var pendingSignup models.PendingSignup
	if err := s.db.DB.Where("verification_token = ?", req.Token).First(&pendingSignup).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid or expired verification code"})
		return
	}

	// Check if user already exists
	var existingUser models.User
	if err := s.db.DB.Where("email = ?", pendingSignup.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusOK, gin.H{"message": "Email already verified"})
		return
	}

	// Create account and user
	account := models.Account{
		AccountID:  utils.GenerateAccountID(),
		Name:       "My Account",
		Email:      &pendingSignup.Email,
		IsActive:   true,
		IsVerified: true,
	}

	if err := s.db.DB.Create(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	user := models.User{
		UserID:             utils.GenerateUserID(),
		AccountID:          account.AccountID,
		Email:              pendingSignup.Email,
		Username:           pendingSignup.Username,
		PasswordHash:       pendingSignup.PasswordHash,
		DisplayName:        pendingSignup.DisplayName,
		IsActive:           true,
		IsVerified:         true,
		IsRootUser:         true,
		DedicatedSigninURL: utils.StringPtr(utils.GenerateDedicatedSigninURL(account.AccountID)),
	}

	if err := s.db.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	// Create welcome notification
	notification := models.Notification{
		NotificationID:    utils.GenerateNotificationID(),
		UserID:            user.UserID,
		Title:             "Welcome to ScaleBox! 🎉",
		Message:           "Hello " + *user.DisplayName + "! Welcome to ScaleBox. Your account has been successfully created and verified.",
		Type:              "info",
		RelatedEntityType: utils.StringPtr("user"),
		RelatedEntityID:   &user.UserID,
	}
	s.db.DB.Create(&notification)

	// Delete pending signup
	s.db.DB.Delete(&pendingSignup)

	c.JSON(http.StatusOK, gin.H{"message": "Email verified successfully. You can now sign in."})
}

func (s *Server) generateJWT(user models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":          user.ID,
		"email":        user.Email,
		"user_id":      user.UserID,
		"account_id":   user.AccountID,
		"is_root_user": user.IsRootUser,
		"exp":          time.Now().Add(time.Duration(s.config.JWT.ExpireHours) * time.Hour).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.config.JWT.Secret))
}

func (s *Server) authMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := authHeader[7:] // Remove "Bearer " prefix
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return []byte(s.config.JWT.Secret), nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		// Check if token is blacklisted
		tokenHash := utils.HashString(tokenString)
		var blacklistedToken models.TokenBlacklist
		if err := s.db.DB.Where("token_hash = ?", tokenHash).First(&blacklistedToken).Error; err == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token has been invalidated"})
			c.Abort()
			return
		}

		userID := uint(claims["sub"].(float64))
		var user models.User
		if err := s.db.DB.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// Check if account is disabled (but allow admin users to bypass this check)
		var account models.Account
		if err := s.db.DB.Where("account_id = ?", user.AccountID).First(&account).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch account information"})
			c.Abort()
			return
		}

		// Admin users should never be suspended - they can always access the system
		if !account.IsActive && user.Role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{
				"error":             "Account is suspended",
				"message":           "Your account has been suspended. Please contact support for assistance.",
				"account_suspended": true,
			})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Next()
	}
}
