package api

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"

	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

func (s *Server) handleListTemplates(c *gin.Context) {
	var templates []models.Template

	// Get public and official templates
	query := s.db.DB.Where("is_public = ? OR is_official = ?", true, true)

	// Add category filter if provided
	if category := c.Query("category"); category != "" {
		query = query.Where("category = ?", category)
	}

	// Add language filter if provided
	if language := c.Query("language"); language != "" {
		query = query.Where("language = ?", language)
	}

	if err := query.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch templates"})
		return
	}

	var response []gin.H
	for _, template := range templates {
		// Parse tags back to array for response
		var tags []string
		if template.Tags != nil {
			json.Unmarshal([]byte(*template.Tags), &tags)
		}

		response = append(response, gin.H{
			"template_id":    template.TemplateID,
			"name":           template.Name,
			"description":    template.Description,
			"category":       template.Category,
			"language":       template.Language,
			"cpu_spec":       template.MinCPURequired,
			"memory_spec":    template.MinMemoryRequired,
			"is_official":    template.IsOfficial,
			"is_public":      template.IsPublic,
			"repository_url": template.RepositoryURL,
			"tags":           tags,
			"created_at":     template.CreatedAt,
			"updated_at":     template.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"templates": response,
		"total":     len(response),
	})
}

func (s *Server) handleGetTemplate(c *gin.Context) {
	templateID := c.Param("template_id")

	var template models.Template
	if err := s.db.DB.Where("template_id = ?", templateID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	// Check if template is accessible (public, official, or owned by user)
	if !template.IsPublic && !template.IsOfficial {
		user := c.MustGet("user").(models.User)
		if template.OwnerUserID == nil || *template.OwnerUserID != user.UserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			return
		}
	}

	// Parse tags back to array for response
	var tags []string
	if template.Tags != nil {
		json.Unmarshal([]byte(*template.Tags), &tags)
	}

	response := gin.H{
		"template_id":    template.TemplateID,
		"name":           template.Name,
		"description":    template.Description,
		"category":       template.Category,
		"language":       template.Language,
		"cpu_spec":       template.MinCPURequired,
		"memory_spec":    template.MinMemoryRequired,
		"is_official":    template.IsOfficial,
		"is_public":      template.IsPublic,
		"repository_url": template.RepositoryURL,
		"tags":           tags,
		"created_at":     template.CreatedAt,
		"updated_at":     template.UpdatedAt,
	}

	c.JSON(http.StatusOK, response)
}

type CreateTemplateRequest struct {
	Name              string   `json:"name" binding:"required"`
	Description       string   `json:"description"`
	Category          string   `json:"category" binding:"required"`
	Language          string   `json:"language" binding:"required"`
	MinCPURequired    float64  `json:"min_cpu_required" binding:"required"`
	MinMemoryRequired float64  `json:"min_memory_required" binding:"required"`
	IsOfficial        bool     `json:"is_official"`
	IsPublic          bool     `json:"is_public"`
	RepositoryURL     string   `json:"repository_url"`
	Tags              []string `json:"tags"`
}

type UpdateTemplateRequest struct {
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	Category          string   `json:"category"`
	Language          string   `json:"language"`
	MinCPURequired    float64  `json:"min_cpu_required"`
	MinMemoryRequired float64  `json:"min_memory_required"`
	IsPublic          bool     `json:"is_public"`
	RepositoryURL     string   `json:"repository_url"`
	Tags              []string `json:"tags"`
}

func (s *Server) handleCreateTemplate(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert tags to JSON string
	var tagsJSON *string
	if req.Tags != nil {
		tagsBytes, err := json.Marshal(req.Tags)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tags format"})
			return
		}
		tagsStr := string(tagsBytes)
		tagsJSON = &tagsStr
	}

	template := models.Template{
		TemplateID:        utils.GenerateTemplateID(),
		Name:              req.Name,
		Description:       &req.Description,
		Category:          req.Category,
		Language:          req.Language,
		MinCPURequired:    req.MinCPURequired,
		MinMemoryRequired: req.MinMemoryRequired,
		IsOfficial:        req.IsOfficial,
		IsPublic:          req.IsPublic,
		RepositoryURL:     req.RepositoryURL,
		Tags:              tagsJSON,
		OwnerUserID:       &user.UserID,
	}

	if err := s.db.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create template"})
		return
	}

	// Parse tags back to array for response
	var tags []string
	if template.Tags != nil {
		json.Unmarshal([]byte(*template.Tags), &tags)
	}

	response := gin.H{
		"template_id":         template.TemplateID,
		"name":                template.Name,
		"description":         template.Description,
		"category":            template.Category,
		"language":            template.Language,
		"min_cpu_required":    template.MinCPURequired,
		"min_memory_required": template.MinMemoryRequired,
		"is_official":         template.IsOfficial,
		"is_public":           template.IsPublic,
		"repository_url":      template.RepositoryURL,
		"tags":                tags,
		"owner_id":            template.OwnerUserID,
		"created_at":          template.CreatedAt,
		"updated_at":          template.UpdatedAt,
	}

	c.JSON(http.StatusCreated, response)
}

func (s *Server) handleUpdateTemplate(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	templateID := c.Param("template_id")

	var template models.Template
	if err := s.db.DB.Where("template_id = ?", templateID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	// Check if user can edit this template
	if template.IsOfficial || (template.IsPublic && (template.OwnerUserID == nil || *template.OwnerUserID != user.UserID)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot edit this template"})
		return
	}

	var req UpdateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update fields
	if req.Name != "" {
		template.Name = req.Name
	}
	if req.Description != "" {
		template.Description = &req.Description
	}
	if req.Category != "" {
		template.Category = req.Category
	}
	if req.Language != "" {
		template.Language = req.Language
	}
	if req.MinCPURequired > 0 {
		template.MinCPURequired = req.MinCPURequired
	}
	if req.MinMemoryRequired > 0 {
		template.MinMemoryRequired = req.MinMemoryRequired
	}
	template.IsPublic = req.IsPublic
	if req.RepositoryURL != "" {
		template.RepositoryURL = req.RepositoryURL
	}
	if req.Tags != nil {
		// Convert tags to JSON string
		tagsBytes, err := json.Marshal(req.Tags)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tags format"})
			return
		}
		tagsStr := string(tagsBytes)
		template.Tags = &tagsStr
	}

	if err := s.db.DB.Save(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Template updated successfully"})
}

func (s *Server) handleDeleteTemplate(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	templateID := c.Param("template_id")

	var template models.Template
	if err := s.db.DB.Where("template_id = ?", templateID).First(&template).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	// Check if user can delete this template
	if template.IsOfficial || (template.IsPublic && (template.OwnerUserID == nil || *template.OwnerUserID != user.UserID)) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Cannot delete this template"})
		return
	}

	if err := s.db.DB.Delete(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete template"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Template deleted successfully"})
}
