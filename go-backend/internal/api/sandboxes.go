package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type CreateSandboxRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	TemplateID  string  `json:"template_id" binding:"required"`
	ProjectID   string  `json:"project_id" binding:"required"`
	CPUSpec     float64 `json:"cpu_spec"`
	MemorySpec  float64 `json:"memory_spec"`
}

type UpdateSandboxRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
}

func (s *Server) handleCreateSandbox(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req CreateSandboxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify project exists and user owns it
	var project models.Project
	if err := s.db.DB.Where("project_id = ? AND owner_user_id = ?", req.ProjectID, user.UserID).First(&project).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project"})
		return
	}

	// Verify template exists
	var template models.Template
	if err := s.db.DB.Where("template_id = ?", req.TemplateID).First(&template).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template"})
		return
	}

	// Use template specs if not provided
	if req.CPUSpec == 0 {
		req.CPUSpec = template.MinCPURequired
	}
	if req.MemorySpec == 0 {
		req.MemorySpec = template.MinMemoryRequired
	}

	// Validate specs against template requirements
	if req.CPUSpec < template.MinCPURequired {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CPU spec below template minimum"})
		return
	}
	if req.MemorySpec < template.MinMemoryRequired {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Memory spec below template minimum"})
		return
	}

	sandbox := models.Sandbox{
		SandboxID:         utils.GenerateSandboxID(),
		Name:              req.Name,
		Description:       &req.Description,
		TemplateID:        req.TemplateID,
		OwnerUserID:       user.UserID,
		ProjectID:         req.ProjectID,
		CPUSpec:           req.CPUSpec,
		MemorySpec:        req.MemorySpec,
		MaxRunningSeconds: 86400, // 24 hours
		Status:            "created",
	}

	if err := s.db.DB.Create(&sandbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create sandbox"})
		return
	}

	response := gin.H{
		"sandbox_id":    sandbox.SandboxID,
		"name":          sandbox.Name,
		"description":   sandbox.Description,
		"template_id":   sandbox.TemplateID,
		"owner_user_id": sandbox.OwnerUserID,
		"project_id":    sandbox.ProjectID,
		"cpu_spec":      sandbox.CPUSpec,
		"memory_spec":   sandbox.MemorySpec,
		"status":        sandbox.Status,
		"created_at":    sandbox.CreatedAt,
	}

	c.JSON(http.StatusCreated, response)
}

func (s *Server) handleListSandboxes(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var sandboxes []models.Sandbox
	query := s.db.DB.Where("owner_user_id = ?", user.UserID)

	// Add project filter if provided
	if projectID := c.Query("project_id"); projectID != "" {
		query = query.Where("project_id = ?", projectID)
	}

	// Add status filter if provided
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Find(&sandboxes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sandboxes"})
		return
	}

	var response []gin.H
	for _, sandbox := range sandboxes {
		response = append(response, gin.H{
			"sandbox_id":    sandbox.SandboxID,
			"name":          sandbox.Name,
			"description":   sandbox.Description,
			"template_id":   sandbox.TemplateID,
			"owner_user_id": sandbox.OwnerUserID,
			"project_id":    sandbox.ProjectID,
			"cpu_spec":      sandbox.CPUSpec,
			"memory_spec":   sandbox.MemorySpec,
			"status":        sandbox.Status,
			"started_at":    sandbox.StartedAt,
			"stopped_at":    sandbox.StoppedAt,
			"created_at":    sandbox.CreatedAt,
			"updated_at":    sandbox.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"sandboxes": response})
}

func (s *Server) handleGetSandbox(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	sandboxID := c.Param("sandbox_id")

	var sandbox models.Sandbox
	if err := s.db.DB.Where("sandbox_id = ? AND owner_user_id = ?", sandboxID, user.UserID).First(&sandbox).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sandbox not found"})
		return
	}

	// Load related data
	var template models.Template
	s.db.DB.Where("template_id = ?", sandbox.TemplateID).First(&template)

	var project models.Project
	s.db.DB.Where("project_id = ?", sandbox.ProjectID).First(&project)

	response := gin.H{
		"sandbox_id":    sandbox.SandboxID,
		"name":          sandbox.Name,
		"description":   sandbox.Description,
		"template_id":   sandbox.TemplateID,
		"owner_user_id": sandbox.OwnerUserID,
		"project_id":    sandbox.ProjectID,
		"cpu_spec":      sandbox.CPUSpec,
		"memory_spec":   sandbox.MemorySpec,
		"status":        sandbox.Status,
		"started_at":    sandbox.StartedAt,
		"stopped_at":    sandbox.StoppedAt,
		"created_at":    sandbox.CreatedAt,
		"updated_at":    sandbox.UpdatedAt,
		"template": gin.H{
			"name":        template.Name,
			"description": template.Description,
			"category":    template.Category,
			"language":    template.Language,
		},
		"project": gin.H{
			"name":        project.Name,
			"description": project.Description,
		},
	}

	c.JSON(http.StatusOK, response)
}

func (s *Server) handleUpdateSandbox(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	sandboxID := c.Param("sandbox_id")

	var sandbox models.Sandbox
	if err := s.db.DB.Where("sandbox_id = ? AND owner_user_id = ?", sandboxID, user.UserID).First(&sandbox).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sandbox not found"})
		return
	}

	var req UpdateSandboxRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		sandbox.Name = req.Name
	}
	if req.Description != "" {
		sandbox.Description = &req.Description
	}
	if req.Status != "" {
		sandbox.Status = req.Status
	}

	if err := s.db.DB.Save(&sandbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update sandbox"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sandbox updated successfully"})
}

func (s *Server) handleDeleteSandbox(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	sandboxID := c.Param("sandbox_id")

	var sandbox models.Sandbox
	if err := s.db.DB.Where("sandbox_id = ? AND owner_user_id = ?", sandboxID, user.UserID).First(&sandbox).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sandbox not found"})
		return
	}

	// Check if sandbox is running
	if sandbox.Status == "running" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete running sandbox"})
		return
	}

	if err := s.db.DB.Delete(&sandbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete sandbox"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sandbox deleted successfully"})
}

func (s *Server) handleStartSandbox(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	sandboxID := c.Param("sandbox_id")

	var sandbox models.Sandbox
	if err := s.db.DB.Where("sandbox_id = ? AND owner_user_id = ?", sandboxID, user.UserID).First(&sandbox).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sandbox not found"})
		return
	}

	if sandbox.Status == "running" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sandbox is already running"})
		return
	}

	// TODO: Implement actual sandbox start logic
	// For now, just update the status
	now := time.Now()
	sandbox.Status = "running"
	sandbox.StartedAt = &now
	sandbox.TimeoutAt = utils.TimePtr(now.Add(time.Duration(sandbox.MaxRunningSeconds) * time.Second))

	if err := s.db.DB.Save(&sandbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start sandbox"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sandbox started successfully"})
}

func (s *Server) handleStopSandbox(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	sandboxID := c.Param("sandbox_id")

	var sandbox models.Sandbox
	if err := s.db.DB.Where("sandbox_id = ? AND owner_user_id = ?", sandboxID, user.UserID).First(&sandbox).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sandbox not found"})
		return
	}

	if sandbox.Status != "running" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Sandbox is not running"})
		return
	}

	// TODO: Implement actual sandbox stop logic
	// For now, just update the status
	now := time.Now()
	sandbox.Status = "stopped"
	sandbox.StoppedAt = &now

	if err := s.db.DB.Save(&sandbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to stop sandbox"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sandbox stopped successfully"})
}

func (s *Server) handleSwitchSandboxProject(c *gin.Context) {
	sandboxID := c.Param("sandbox_id")
	user := c.MustGet("user").(models.User)

	var req struct {
		ProjectID string `json:"project_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify sandbox exists and user owns it
	var sandbox models.Sandbox
	if err := s.db.DB.Where("sandbox_id = ? AND owner_user_id = ?", sandboxID, user.UserID).First(&sandbox).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sandbox not found"})
		return
	}

	// Verify new project exists and user owns it
	var project models.Project
	if err := s.db.DB.Where("project_id = ? AND owner_user_id = ?", req.ProjectID, user.UserID).First(&project).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project"})
		return
	}

	// Update sandbox project
	sandbox.ProjectID = req.ProjectID
	if err := s.db.DB.Save(&sandbox).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to switch sandbox project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Sandbox project switched successfully"})
}

func (s *Server) handleGetSandboxStats(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	// Count total sandboxes
	var totalSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ?", user.UserID).Count(&totalSandboxes)

	// Count running sandboxes
	var runningSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ? AND status = ?", user.UserID, "running").Count(&runningSandboxes)

	// Count stopped sandboxes
	var stoppedSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ? AND status = ?", user.UserID, "stopped").Count(&stoppedSandboxes)

	// Count timeout sandboxes
	var timeoutSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ? AND status = ?", user.UserID, "timeout").Count(&timeoutSandboxes)

	// Count archived sandboxes
	var archivedSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ? AND status = ?", user.UserID, "archived").Count(&archivedSandboxes)

	// Calculate total cost (placeholder - would need billing integration)
	totalCost := 0.0

	// Calculate average CPU and memory usage (placeholder)
	avgCPUUsage := 0.0
	avgMemoryUsage := 0.0

	// Calculate total uptime hours (placeholder)
	totalUptimeHours := 0.0

	c.JSON(http.StatusOK, gin.H{
		"total_sandboxes":    totalSandboxes,
		"running_sandboxes":  runningSandboxes,
		"stopped_sandboxes":  stoppedSandboxes,
		"timeout_sandboxes":  timeoutSandboxes,
		"archived_sandboxes": archivedSandboxes,
		"total_cost":         totalCost,
		"avg_cpu_usage":      avgCPUUsage,
		"avg_memory_usage":   avgMemoryUsage,
		"total_uptime_hours": totalUptimeHours,
	})
}
