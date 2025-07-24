package api

import (
	"scalebox-backend/internal/config"
	"scalebox-backend/internal/database"
	"scalebox-backend/internal/services"
	"time"

	"github.com/gin-gonic/gin"
)

type Server struct {
	config              *config.Config
	db                  *database.Database
	router              *gin.Engine
	emailService        *services.EmailService
	sandboxService      *services.SandboxService
	notificationService *services.NotificationService
}

func NewServer(cfg *config.Config, db *database.Database) *Server {
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	server := &Server{
		config:              cfg,
		db:                  db,
		router:              gin.Default(),
		emailService:        services.NewEmailService(cfg.SMTP),
		sandboxService:      services.NewSandboxService(db),
		notificationService: services.NewNotificationService(db),
	}

	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	// CORS middleware
	s.router.Use(corsMiddleware())

	// Root and health endpoints
	s.router.GET("/", s.handleRoot)
	s.router.GET("/health", s.handleHealth)

	// API routes
	api := s.router.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/signup", s.handleSignup)
			auth.POST("/signin", s.handleSignin)
			auth.POST("/verify-email", s.handleVerifyEmail)
			auth.POST("/resend-verification", s.handleResendVerification)
			auth.POST("/reset-password", s.handleResetPassword)
			auth.POST("/reset-password/confirm", s.handleResetPasswordConfirm)
		}

		// User routes
		users := api.Group("/users")
		users.Use(s.authMiddleware())
		{
			users.GET("/me", s.handleGetProfile)
			users.PUT("/me", s.handleUpdateProfile)
		}

		// User management routes
		// Public routes (no authentication required)
		api.GET("/user-management/validate-signin-url/:signin_url", s.handleValidateSigninURL)
		api.POST("/user-management/dedicated-signin", s.handleDedicatedSignin)

		// User management routes (require authentication)
		userMgmt := api.Group("/user-management")
		userMgmt.Use(s.authMiddleware())
		{
			userMgmt.POST("/users", s.handleCreateUser)
			userMgmt.GET("/users", s.handleListUsers)
			userMgmt.GET("/users/:user_id", s.handleGetUser)
			userMgmt.PUT("/users/:user_id", s.handleUpdateUser)
			userMgmt.DELETE("/users/:user_id", s.handleDeleteUser)
			userMgmt.POST("/users/:user_id/reset-password", s.handleResetUserPassword)
			userMgmt.POST("/change-password", s.handleChangePassword)
			userMgmt.POST("/reset-own-password", s.handleResetOwnPassword)
			userMgmt.POST("/request-password-reset", s.handleRequestPasswordReset)
			userMgmt.POST("/reset-password-with-token", s.handleResetPasswordWithToken)
			userMgmt.POST("/rotate-password", s.handleRotatePassword)

			// Account email change routes
			userMgmt.POST("/account/request-email-change", s.handleRequestAccountEmailChange)
			userMgmt.POST("/account/confirm-email-change", s.handleConfirmAccountEmailChange)
			userMgmt.GET("/account/email-change-status", s.handleGetEmailChangeStatus)
			userMgmt.POST("/account/cleanup-expired-email-changes", s.handleCleanupExpiredEmailChanges)
		}

		// Project routes
		projects := api.Group("/projects")
		projects.Use(s.authMiddleware())
		{
			projects.POST("/", s.handleCreateProject)
			projects.GET("/", s.handleListProjects)
			projects.GET("/:project_id", s.handleGetProject)
			projects.PUT("/:project_id", s.handleUpdateProject)
			projects.DELETE("/:project_id", s.handleDeleteProject)
			projects.GET("/:project_id/sandboxes", s.handleGetProjectSandboxes)
			projects.POST("/:project_id/sandboxes/:sandbox_id/evict", s.handleEvictSandboxFromProject)
			projects.POST("/:project_id/sandboxes/:sandbox_id/add", s.handleAddSandboxToProject)
		}

		// Template routes (require authentication)
		templates := api.Group("/templates")
		templates.Use(s.authMiddleware())
		{
			templates.GET("/", s.handleListTemplates)
			templates.GET("/:template_id", s.handleGetTemplate)
			templates.POST("/", s.handleCreateTemplate)
			templates.PUT("/:template_id", s.handleUpdateTemplate)
			templates.DELETE("/:template_id", s.handleDeleteTemplate)
		}

		// Sandbox routes
		sandboxes := api.Group("/sandboxes")
		sandboxes.Use(s.authMiddleware())
		{
			sandboxes.POST("/", s.handleCreateSandbox)
			sandboxes.GET("/", s.handleListSandboxes)
			sandboxes.GET("/stats", s.handleGetSandboxStats)
			sandboxes.GET("/:sandbox_id", s.handleGetSandbox)
			sandboxes.PUT("/:sandbox_id", s.handleUpdateSandbox)
			sandboxes.DELETE("/:sandbox_id", s.handleDeleteSandbox)
			sandboxes.POST("/:sandbox_id/start", s.handleStartSandbox)
			sandboxes.POST("/:sandbox_id/stop", s.handleStopSandbox)
			sandboxes.POST("/:sandbox_id/switch-project", s.handleSwitchSandboxProject)
		}

		// Notification routes
		notifications := api.Group("/notifications")
		notifications.Use(s.authMiddleware())
		{
			notifications.GET("/", s.handleListNotifications)
			notifications.GET("/:notification_id", s.handleGetNotification)
			notifications.PATCH("/:notification_id/read", s.handleMarkNotificationRead)
			notifications.PATCH("/:notification_id/unread", s.handleMarkNotificationUnread)
			notifications.PATCH("/read-all", s.handleMarkAllNotificationsRead)
			notifications.DELETE("/:notification_id", s.handleDeleteNotification)
			notifications.DELETE("/", s.handleDeleteAllNotifications)
			notifications.DELETE("/bulk-delete", s.handleDeleteMultipleNotifications)
			notifications.PATCH("/bulk-read", s.handleMarkMultipleNotificationsRead)
			notifications.PATCH("/bulk-unread", s.handleMarkMultipleNotificationsUnread)
		}

		// API Key routes
		apiKeys := api.Group("/api-keys")
		apiKeys.Use(s.authMiddleware())
		{
			apiKeys.POST("/", s.handleCreateAPIKey)
			apiKeys.GET("/", s.handleListAPIKeys)
			apiKeys.PATCH("/:key_id/status", s.handleUpdateAPIKeyStatus)
			apiKeys.DELETE("/:key_id", s.handleDeleteAPIKey)
		}

		// Admin routes (admin only)
		admin := api.Group("/admin")
		admin.Use(s.authMiddleware())
		admin.Use(s.adminMiddleware())
		{
			admin.GET("/accounts", s.handleListAccounts)
			admin.GET("/accounts/:account_id", s.handleGetAccount)
			admin.POST("/accounts/:account_id/disable", s.handleDisableAccount)
			admin.POST("/accounts/:account_id/enable", s.handleEnableAccount)
			admin.DELETE("/accounts/:account_id", s.handleDeleteAccount)
			admin.POST("/accounts/:account_id/reset-password", s.handleResetAccountPassword)
			admin.GET("/stats", s.handleGetSystemStats)
		}

		// Admin sandbox routes (admin only)
		adminSandboxes := api.Group("/sandboxes/admin")
		adminSandboxes.Use(s.authMiddleware())
		adminSandboxes.Use(s.adminMiddleware())
		{
			adminSandboxes.GET("/all", s.handleAdminListAllSandboxes)
			adminSandboxes.GET("/stats", s.handleAdminGetSandboxStats)
			adminSandboxes.POST("/:sandbox_id/action", s.handleAdminSandboxAction)
		}

		// Admin API key routes (admin only)
		adminApiKeys := api.Group("/api-keys/admin")
		adminApiKeys.Use(s.authMiddleware())
		adminApiKeys.Use(s.adminMiddleware())
		{
			adminApiKeys.GET("/all", s.handleAdminListAllAPIKeys)
			adminApiKeys.GET("/stats", s.handleAdminGetAPIKeyStats)
			adminApiKeys.POST("/:key_id/action", s.handleAdminAPIKeyAction)
		}
	}
}

func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
		c.Header("Access-Control-Allow-Credentials", "false")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func (s *Server) handleRoot(c *gin.Context) {
	c.JSON(200, gin.H{
		"message": "ScaleBox API is running",
		"version": "1.0.0",
		"backend": "Golang",
	})
}

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":    "healthy",
		"backend":   "Golang",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}
