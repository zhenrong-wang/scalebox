package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"scalebox-backend/internal/database"
	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type CreateProjectRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	IsDefault   bool   `json:"is_default"`
}

type UpdateProjectRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Status      string `json:"status"`
	IsDefault   bool   `json:"is_default"`
}

func (s *Server) handleCreateProject(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	
	var req CreateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// If this is the first project, make it default
	var projectCount int64
	s.db.DB.Model(&models.Project{}).Where("owner_user_id = ?", user.UserID).Count(&projectCount)
	if projectCount == 0 {
		req.IsDefault = true
	}
	
	// If this project is default, unset other default projects
	if req.IsDefault {
		s.db.DB.Model(&models.Project{}).Where("owner_user_id = ? AND is_default = ?", user.UserID, true).Update("is_default", false)
	}
	
	project := models.Project{
		ProjectID:   utils.GenerateProjectID(),
		Name:        req.Name,
		Description: &req.Description,
		OwnerUserID: user.UserID,
		Status:      "active",
		IsDefault:   req.IsDefault,
	}
	
	if err := s.db.DB.Create(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}
	
	response := gin.H{
		"project_id":   project.ProjectID,
		"name":         project.Name,
		"description":  project.Description,
		"owner_user_id": project.OwnerUserID,
		"status":       project.Status,
		"is_default":   project.IsDefault,
		"created_at":   project.CreatedAt,
	}
	
	c.JSON(http.StatusCreated, response)
}

func (s *Server) handleListProjects(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	
	var projects []models.Project
	if err := s.db.DB.Where("owner_user_id = ?", user.UserID).Find(&projects).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	
	var response []gin.H
	for _, project := range projects {
		response = append(response, gin.H{
			"project_id":    project.ProjectID,
			"name":          project.Name,
			"description":   project.Description,
			"owner_user_id": project.OwnerUserID,
			"status":        project.Status,
			"is_default":    project.IsDefault,
			"created_at":    project.CreatedAt,
			"updated_at":    project.UpdatedAt,
		})
	}
	
	c.JSON(http.StatusOK, gin.H{"projects": response})
}

func (s *Server) handleGetProject(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	projectID := c.Param("project_id")
	
	var project models.Project
	if err := s.db.DB.Where("project_id = ? AND owner_user_id = ?", projectID, user.UserID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	
	response := gin.H{
		"project_id":    project.ProjectID,
		"name":          project.Name,
		"description":   project.Description,
		"owner_user_id": project.OwnerUserID,
		"status":        project.Status,
		"is_default":    project.IsDefault,
		"created_at":    project.CreatedAt,
		"updated_at":    project.UpdatedAt,
	}
	
	c.JSON(http.StatusOK, response)
}

func (s *Server) handleUpdateProject(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	projectID := c.Param("project_id")
	
	var project models.Project
	if err := s.db.DB.Where("project_id = ? AND owner_user_id = ?", projectID, user.UserID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	
	var req UpdateProjectRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	
	// Update fields
	if req.Name != "" {
		project.Name = req.Name
	}
	if req.Description != "" {
		project.Description = &req.Description
	}
	if req.Status != "" {
		project.Status = req.Status
	}
	
	// Handle default project logic
	if req.IsDefault && !project.IsDefault {
		// Unset other default projects
		s.db.DB.Model(&models.Project{}).Where("owner_user_id = ? AND is_default = ?", user.UserID, true).Update("is_default", false)
		project.IsDefault = true
	} else if !req.IsDefault && project.IsDefault {
		// Don't allow unsetting the only default project
		var projectCount int64
		s.db.DB.Model(&models.Project{}).Where("owner_user_id = ?", user.UserID).Count(&projectCount)
		if projectCount == 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot unset the only project as default"})
			return
		}
		project.IsDefault = false
	}
	
	if err := s.db.DB.Save(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Project updated successfully"})
}

func (s *Server) handleDeleteProject(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	projectID := c.Param("project_id")
	
	var project models.Project
	if err := s.db.DB.Where("project_id = ? AND owner_user_id = ?", projectID, user.UserID).First(&project).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}
	
	// Check if project has sandboxes
	var sandboxCount int64
	s.db.DB.Model(&models.Sandbox{}).Where("project_id = ?", projectID).Count(&sandboxCount)
	if sandboxCount > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete project with active sandboxes"})
		return
	}
	
	// If this is the default project, we need to set another project as default
	if project.IsDefault {
		var otherProject models.Project
		if err := s.db.DB.Where("owner_user_id = ? AND project_id != ?", user.UserID, projectID).First(&otherProject).Error; err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the only project"})
			return
		}
		otherProject.IsDefault = true
		s.db.DB.Save(&otherProject)
	}
	
	if err := s.db.DB.Delete(&project).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
} 