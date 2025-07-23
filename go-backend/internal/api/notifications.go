package api

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"scalebox-backend/internal/models"
)

func (s *Server) handleListNotifications(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var notifications []models.Notification
	query := s.db.DB.Where("user_id = ?", user.UserID)

	// Add read filter if provided
	if readFilter := c.Query("read"); readFilter != "" {
		if readFilter == "true" {
			query = query.Where("is_read = ?", true)
		} else if readFilter == "false" {
			query = query.Where("is_read = ?", false)
		}
	}

	// Add type filter if provided
	if notificationType := c.Query("type"); notificationType != "" {
		query = query.Where("type = ?", notificationType)
	}

	// Order by created_at desc
	query = query.Order("created_at DESC")

	if err := query.Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	var response []gin.H
	for _, notification := range notifications {
		response = append(response, gin.H{
			"notification_id":     notification.NotificationID,
			"title":               notification.Title,
			"message":             notification.Message,
			"type":                notification.Type,
			"is_read":             notification.IsRead,
			"related_entity_type": notification.RelatedEntityType,
			"related_entity_id":   notification.RelatedEntityID,
			"created_at":          notification.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{"notifications": response})
}

func (s *Server) handleMarkNotificationRead(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	notificationID := c.Param("notification_id")

	var notification models.Notification
	if err := s.db.DB.Where("notification_id = ? AND user_id = ?", notificationID, user.UserID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	notification.IsRead = true
	if err := s.db.DB.Save(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as read"})
}

func (s *Server) handleMarkAllNotificationsRead(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	if err := s.db.DB.Model(&models.Notification{}).Where("user_id = ? AND is_read = ?", user.UserID, false).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications marked as read"})
}

func (s *Server) handleGetNotification(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	notificationID := c.Param("notification_id")

	var notification models.Notification
	if err := s.db.DB.Where("notification_id = ? AND user_id = ?", notificationID, user.UserID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                  notification.NotificationID,
		"user_id":             notification.UserID,
		"title":               notification.Title,
		"message":             notification.Message,
		"type":                notification.Type,
		"is_read":             notification.IsRead,
		"related_entity_type": notification.RelatedEntityType,
		"related_entity_id":   notification.RelatedEntityID,
		"created_at":          notification.CreatedAt,
	})
}

func (s *Server) handleMarkNotificationUnread(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	notificationID := c.Param("notification_id")

	var notification models.Notification
	if err := s.db.DB.Where("notification_id = ? AND user_id = ?", notificationID, user.UserID).First(&notification).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	notification.IsRead = false
	if err := s.db.DB.Save(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notification as unread"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification marked as unread"})
}

func (s *Server) handleDeleteNotification(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	notificationID := c.Param("notification_id")

	if err := s.db.DB.Where("notification_id = ? AND user_id = ?", notificationID, user.UserID).Delete(&models.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification deleted"})
}

func (s *Server) handleDeleteAllNotifications(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	if err := s.db.DB.Where("user_id = ?", user.UserID).Delete(&models.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "All notifications deleted"})
}

func (s *Server) handleDeleteMultipleNotifications(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var request struct {
		NotificationIDs []string `json:"notification_ids"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if len(request.NotificationIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No notification IDs provided"})
		return
	}

	if err := s.db.DB.Where("notification_id IN ? AND user_id = ?", request.NotificationIDs, user.UserID).Delete(&models.Notification{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notifications"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notifications deleted"})
}

func (s *Server) handleMarkMultipleNotificationsRead(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var request struct {
		NotificationIDs []string `json:"notification_ids"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if len(request.NotificationIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No notification IDs provided"})
		return
	}

	if err := s.db.DB.Model(&models.Notification{}).Where("notification_id IN ? AND user_id = ?", request.NotificationIDs, user.UserID).Update("is_read", true).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notifications as read"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notifications marked as read"})
}

func (s *Server) handleMarkMultipleNotificationsUnread(c *gin.Context) {
	user := c.MustGet("user").(models.User)

	var request struct {
		NotificationIDs []string `json:"notification_ids"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if len(request.NotificationIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No notification IDs provided"})
		return
	}

	if err := s.db.DB.Model(&models.Notification{}).Where("notification_id IN ? AND user_id = ?", request.NotificationIDs, user.UserID).Update("is_read", false).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to mark notifications as unread"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notifications marked as unread"})
}
