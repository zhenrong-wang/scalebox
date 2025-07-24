package api

import (
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type CreateAPIKeyRequest struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

func (s *Server) handleCreateAPIKey(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var req CreateAPIKeyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Generate API key
	apiKey := utils.GenerateAPIKey()
	keyHash := sha256.Sum256([]byte(apiKey))
	keyHashHex := hex.EncodeToString(keyHash[:])

	apiKeyRecord := models.APIKey{
		APIKey:      apiKey,
		KeyID:       utils.GenerateAPIKeyResourceID(),
		UserID:      user.UserID,
		Name:        req.Name,
		Description: &req.Description,
		KeyHash:     keyHashHex,
		IsActive:    true,
	}

	if err := s.db.DB.Create(&apiKeyRecord).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create API key"})
		return
	}

	response := gin.H{
		"key_id":      apiKeyRecord.KeyID,
		"name":        apiKeyRecord.Name,
		"description": apiKeyRecord.Description,
		"api_key":     apiKeyRecord.APIKey, // Only returned once
		"is_active":   apiKeyRecord.IsActive,
		"created_at":  apiKeyRecord.CreatedAt,
	}

	c.JSON(http.StatusCreated, response)
}

func (s *Server) handleListAPIKeys(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var apiKeys []models.APIKey
	if err := s.db.DB.Where("user_id = ?", user.UserID).Find(&apiKeys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch API keys"})
		return
	}

	var response []gin.H
	for _, apiKey := range apiKeys {
		response = append(response, gin.H{
			"key_id":       apiKey.KeyID,
			"name":         apiKey.Name,
			"description":  apiKey.Description,
			"is_active":    apiKey.IsActive,
			"last_used_at": apiKey.LastUsedAt,
			"created_at":   apiKey.CreatedAt,
			"updated_at":   apiKey.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"api_keys": response})
}

func (s *Server) handleDeleteAPIKey(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	keyID := c.Param("key_id")

	var apiKey models.APIKey
	if err := s.db.DB.Where("key_id = ? AND user_id = ?", keyID, user.UserID).First(&apiKey).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	if err := s.db.DB.Delete(&apiKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete API key"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "API key deleted successfully"})
}

type UpdateAPIKeyStatusRequest struct {
	IsActive *bool `json:"is_active" binding:"required"`
}

func (s *Server) handleUpdateAPIKeyStatus(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	keyID := c.Param("key_id")

	var req UpdateAPIKeyStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	var apiKey models.APIKey
	if err := s.db.DB.Where("key_id = ? AND user_id = ?", keyID, user.UserID).First(&apiKey).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	// Update the active status
	apiKey.IsActive = *req.IsActive

	if err := s.db.DB.Save(&apiKey).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update API key status"})
		return
	}

	status := "disabled"
	if apiKey.IsActive {
		status = "enabled"
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "API key " + status + " successfully",
		"is_active": apiKey.IsActive,
	})
}

// Admin API key handlers

func (s *Server) handleAdminListAllAPIKeys(c *gin.Context) {
	// Get query parameters for filtering
	status := c.Query("status")
	userID := c.Query("user_id")
	search := c.Query("search")
	sortBy := c.Query("sort_by")
	sortOrder := c.Query("sort_order")
	limit := c.Query("limit")
	offset := c.Query("offset")

	// Build query with user information
	query := s.db.DB.Model(&models.APIKey{}).Preload("User")

	// Apply filters
	if status != "" {
		if status == "active" {
			query = query.Where("is_active = ?", true)
		} else if status == "inactive" {
			query = query.Where("is_active = ?", false)
		}
	}
	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if search != "" {
		query = query.Where("name LIKE ?", "%"+search+"%")
	}

	// Apply sorting
	if sortBy != "" {
		order := "ASC"
		if sortOrder == "desc" {
			order = "DESC"
		}
		query = query.Order(sortBy + " " + order)
	} else {
		query = query.Order("created_at DESC")
	}

	// Apply pagination
	if limit != "" {
		if limitInt, err := strconv.Atoi(limit); err == nil {
			query = query.Limit(limitInt)
		}
	}
	if offset != "" {
		if offsetInt, err := strconv.Atoi(offset); err == nil {
			query = query.Offset(offsetInt)
		}
	}

	var apiKeys []models.APIKey
	if err := query.Find(&apiKeys).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch API keys"})
		return
	}

	// Transform to response format
	var response []gin.H
	for _, apiKey := range apiKeys {
		response = append(response, gin.H{
			"key_id":       apiKey.KeyID,
			"name":         apiKey.Name,
			"description":  apiKey.Description,
			"is_active":    apiKey.IsActive,
			"last_used_at": apiKey.LastUsedAt,
			"created_at":   apiKey.CreatedAt,
			"updated_at":   apiKey.UpdatedAt,
			"user_email":   apiKey.User.Email,
			"user_name":    apiKey.User.Username,
		})
	}

	c.JSON(http.StatusOK, gin.H{"api_keys": response})
}

func (s *Server) handleAdminGetAPIKeyStats(c *gin.Context) {
	// Count total API keys
	var totalKeys int64
	s.db.DB.Model(&models.APIKey{}).Count(&totalKeys)

	// Count active API keys
	var activeKeys int64
	s.db.DB.Model(&models.APIKey{}).Where("is_active = ?", true).Count(&activeKeys)

	// Count inactive API keys
	var inactiveKeys int64
	s.db.DB.Model(&models.APIKey{}).Where("is_active = ?", false).Count(&inactiveKeys)

	// Count API keys used in last 30 days (placeholder - would need usage tracking)
	usageLast30Days := 0

	c.JSON(http.StatusOK, gin.H{
		"total_keys":         totalKeys,
		"active_keys":        activeKeys,
		"expired_keys":       inactiveKeys,
		"usage_last_30_days": usageLast30Days,
	})
}

func (s *Server) handleAdminAPIKeyAction(c *gin.Context) {
	keyID := c.Param("key_id")

	var req struct {
		Action string `json:"action" binding:"required"`
		Reason string `json:"reason"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verify API key exists
	var apiKey models.APIKey
	if err := s.db.DB.Where("key_id = ?", keyID).First(&apiKey).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "API key not found"})
		return
	}

	// Perform action based on request
	switch req.Action {
	case "enable":
		apiKey.IsActive = true
		if err := s.db.DB.Save(&apiKey).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to enable API key"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "API key enabled successfully"})

	case "disable":
		apiKey.IsActive = false
		if err := s.db.DB.Save(&apiKey).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disable API key"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "API key disabled successfully"})

	case "delete":
		if err := s.db.DB.Delete(&apiKey).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete API key"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "API key deleted successfully"})

	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action. Supported actions: enable, disable, delete"})
	}
}
