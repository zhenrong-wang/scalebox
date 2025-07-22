package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"scalebox-backend/internal/database"
	"scalebox-backend/internal/models"
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
		response = append(response, gin.H{
			"template_id":        template.TemplateID,
			"name":               template.Name,
			"description":        template.Description,
			"category":           template.Category,
			"language":           template.Language,
			"min_cpu_required":   template.MinCPURequired,
			"min_memory_required": template.MinMemoryRequired,
			"is_official":        template.IsOfficial,
			"is_public":          template.IsPublic,
			"repository_url":     template.RepositoryURL,
			"tags":               template.Tags,
			"created_at":         template.CreatedAt,
			"updated_at":         template.UpdatedAt,
		})
	}
	
	c.JSON(http.StatusOK, gin.H{"templates": response})
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
	
	response := gin.H{
		"template_id":        template.TemplateID,
		"name":               template.Name,
		"description":        template.Description,
		"category":           template.Category,
		"language":           template.Language,
		"min_cpu_required":   template.MinCPURequired,
		"min_memory_required": template.MinMemoryRequired,
		"is_official":        template.IsOfficial,
		"is_public":          template.IsPublic,
		"repository_url":     template.RepositoryURL,
		"tags":               template.Tags,
		"created_at":         template.CreatedAt,
		"updated_at":         template.UpdatedAt,
	}
	
	c.JSON(http.StatusOK, response)
} 