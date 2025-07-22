package api

import (
	"scalebox-backend/internal/config"
	"scalebox-backend/internal/database"
	"scalebox-backend/internal/services"

	"github.com/gin-gonic/gin"
)

type Server struct {
	config *config.Config
	db     *database.Database
	router *gin.Engine
	emailService *services.EmailService
	sandboxService *services.SandboxService
	notificationService *services.NotificationService
}

func NewServer(cfg *config.Config, db *database.Database) *Server {
	if cfg.Server.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	server := &Server{
		config: cfg,
		db:     db,
		router: gin.Default(),
		emailService: services.NewEmailService(cfg.SMTP),
		sandboxService: services.NewSandboxService(db),
		notificationService: services.NewNotificationService(db),
	}

	server.setupRoutes()
	return server
}

func (s *Server) setupRoutes() {
	// CORS middleware
	s.router.Use(corsMiddleware())

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
			userMgmt.POST("/dedicated-signin", s.handleDedicatedSignin)
			userMgmt.GET("/validate-signin-url/:signin_url", s.handleValidateSigninURL)
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
		}

		// Template routes
		templates := api.Group("/templates")
		{
			templates.GET("/", s.handleListTemplates)
			templates.GET("/:template_id", s.handleGetTemplate)
		}

		// Sandbox routes
		sandboxes := api.Group("/sandboxes")
		sandboxes.Use(s.authMiddleware())
		{
			sandboxes.POST("/", s.handleCreateSandbox)
			sandboxes.GET("/", s.handleListSandboxes)
			sandboxes.GET("/:sandbox_id", s.handleGetSandbox)
			sandboxes.PUT("/:sandbox_id", s.handleUpdateSandbox)
			sandboxes.DELETE("/:sandbox_id", s.handleDeleteSandbox)
			sandboxes.POST("/:sandbox_id/start", s.handleStartSandbox)
			sandboxes.POST("/:sandbox_id/stop", s.handleStopSandbox)
		}

		// Notification routes
		notifications := api.Group("/notifications")
		notifications.Use(s.authMiddleware())
		{
			notifications.GET("/", s.handleListNotifications)
			notifications.PUT("/:notification_id/read", s.handleMarkNotificationRead)
			notifications.PUT("/read-all", s.handleMarkAllNotificationsRead)
		}

		// API Key routes
		apiKeys := api.Group("/api-keys")
		apiKeys.Use(s.authMiddleware())
		{
			apiKeys.POST("/", s.handleCreateAPIKey)
			apiKeys.GET("/", s.handleListAPIKeys)
			apiKeys.DELETE("/:key_id", s.handleDeleteAPIKey)
		}
	}
}

func (s *Server) Run(addr string) error {
	return s.router.Run(addr)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
} 