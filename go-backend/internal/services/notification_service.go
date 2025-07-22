package services

import (
	"time"

	"scalebox-backend/internal/database"
	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type NotificationService struct {
	db *database.Database
}

func NewNotificationService(db *database.Database) *NotificationService {
	return &NotificationService{
		db: db,
	}
}

func (n *NotificationService) CreateNotification(userID, title, message, notificationType string, relatedEntityType, relatedEntityID *string) error {
	notification := models.Notification{
		NotificationID:    utils.GenerateNotificationID(),
		UserID:            userID,
		Title:             title,
		Message:           message,
		Type:              notificationType,
		IsRead:            false,
		RelatedEntityType: relatedEntityType,
		RelatedEntityID:   relatedEntityID,
	}
	
	return n.db.DB.Create(&notification).Error
}

func (n *NotificationService) CreateWelcomeNotification(userID, displayName string) error {
	title := "Welcome to ScaleBox! 🎉"
	message := "Hello " + displayName + "! Welcome to ScaleBox. Your account has been successfully created and verified."
	
	return n.CreateNotification(userID, title, message, "info", utils.StringPtr("user"), &userID)
}

func (n *NotificationService) CreateUserCreatedNotification(rootUserID, newUserID, displayName, email string) error {
	title := "New User Created"
	message := "User " + displayName + " (" + email + ") has been successfully created."
	
	return n.CreateNotification(rootUserID, title, message, "success", utils.StringPtr("user"), &newUserID)
}

func (n *NotificationService) CreateEmailChangedNotification(userID, oldEmail, newEmail string) error {
	title := "Account Email Changed"
	message := "Your account email has been successfully changed from " + oldEmail + " to " + newEmail + "."
	
	return n.CreateNotification(userID, title, message, "success", utils.StringPtr("account"), &userID)
}

func (n *NotificationService) CreateSandboxStartedNotification(userID, sandboxID, sandboxName string) error {
	title := "Sandbox Started"
	message := "Your sandbox '" + sandboxName + "' has been started successfully."
	
	return n.CreateNotification(userID, title, message, "info", utils.StringPtr("sandbox"), &sandboxID)
}

func (n *NotificationService) CreateSandboxStoppedNotification(userID, sandboxID, sandboxName string) error {
	title := "Sandbox Stopped"
	message := "Your sandbox '" + sandboxName + "' has been stopped."
	
	return n.CreateNotification(userID, title, message, "info", utils.StringPtr("sandbox"), &sandboxID)
}

func (n *NotificationService) CreateSandboxTimeoutNotification(userID, sandboxID, sandboxName string) error {
	title := "Sandbox Timeout"
	message := "Your sandbox '" + sandboxName + "' has been stopped due to timeout."
	
	return n.CreateNotification(userID, title, message, "warning", utils.StringPtr("sandbox"), &sandboxID)
}

func (n *NotificationService) CreateProjectCreatedNotification(userID, projectID, projectName string) error {
	title := "Project Created"
	message := "Project '" + projectName + "' has been created successfully."
	
	return n.CreateNotification(userID, title, message, "success", utils.StringPtr("project"), &projectID)
}

func (n *NotificationService) CreateProjectDeletedNotification(userID, projectName string) error {
	title := "Project Deleted"
	message := "Project '" + projectName + "' has been deleted."
	
	return n.CreateNotification(userID, title, message, "info", utils.StringPtr("project"), nil)
}

func (n *NotificationService) MarkAsRead(notificationID, userID string) error {
	return n.db.DB.Model(&models.Notification{}).
		Where("notification_id = ? AND user_id = ?", notificationID, userID).
		Update("is_read", true).Error
}

func (n *NotificationService) MarkAllAsRead(userID string) error {
	return n.db.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}

func (n *NotificationService) GetUnreadCount(userID string) (int64, error) {
	var count int64
	err := n.db.DB.Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Count(&count).Error
	return count, err
}

func (n *NotificationService) CleanupOldNotifications(daysOld int) error {
	cutoffDate := time.Now().AddDate(0, 0, -daysOld)
	return n.db.DB.Where("created_at < ?", cutoffDate).Delete(&models.Notification{}).Error
} 