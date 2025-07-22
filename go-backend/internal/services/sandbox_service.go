package services

import (
	"fmt"
	"time"

	"scalebox-backend/internal/database"
	"scalebox-backend/internal/models"
	"scalebox-backend/internal/utils"
)

type SandboxService struct {
	db *database.Database
}

func NewSandboxService(db *database.Database) *SandboxService {
	return &SandboxService{
		db: db,
	}
}

func (s *SandboxService) CreateUsageRecord(sandboxID, userID string, startTime time.Time) error {
	usageRecord := models.SandboxUsage{
		UsageID:       utils.GenerateUsageID(),
		SandboxID:     sandboxID,
		UserID:        userID,
		StartTime:     startTime,
		RunningSeconds: 0,
		CPUHours:      0.0,
		MemoryHours:   0.0,
		StorageHours:  0.0,
		HourlyRate:    0.10, // Default rate, should be configurable
		Cost:          0.0,
	}
	
	return s.db.DB.Create(&usageRecord).Error
}

func (s *SandboxService) UpdateUsageRecord(usageID string, endTime time.Time, cpuHours, memoryHours, storageHours float64) error {
	var usageRecord models.SandboxUsage
	if err := s.db.DB.Where("usage_id = ?", usageID).First(&usageRecord).Error; err != nil {
		return err
	}
	
	usageRecord.EndTime = &endTime
	duration := endTime.Sub(usageRecord.StartTime)
	usageRecord.RunningSeconds = int(duration.Seconds())
	usageRecord.CPUHours = cpuHours
	usageRecord.MemoryHours = memoryHours
	usageRecord.StorageHours = storageHours
	
	// Calculate cost
	totalHours := cpuHours + memoryHours + storageHours
	usageRecord.Cost = totalHours * usageRecord.HourlyRate
	
	return s.db.DB.Save(&usageRecord).Error
}

func (s *SandboxService) CreateBillingRecord(userID, projectID, sandboxID, serviceType string, usageSeconds int, hourlyRate, amount float64) error {
	billingRecord := models.BillingRecord{
		BillingID:    utils.GenerateBillingID(),
		UserID:       userID,
		ProjectID:    &projectID,
		SandboxID:    &sandboxID,
		BillingDate:  time.Now(),
		ServiceType:  serviceType,
		UsageSeconds: usageSeconds,
		HourlyRate:   hourlyRate,
		Amount:       amount,
		Description:  utils.StringPtr(fmt.Sprintf("Sandbox usage: %s", serviceType)),
	}
	
	return s.db.DB.Create(&billingRecord).Error
}

func (s *SandboxService) CreateMetrics(sandboxID string, cpuUtil, memoryUtil, storageUtil float64) error {
	metric := models.SandboxMetrics{
		MetricID:          utils.GenerateMetricID(),
		SandboxID:         sandboxID,
		Timestamp:         time.Now(),
		CPUUtilization:    cpuUtil,
		MemoryUtilization: memoryUtil,
		StorageUtilization: storageUtil,
	}
	
	return s.db.DB.Create(&metric).Error
}

func (s *SandboxService) CleanupExpiredSandboxes() error {
	// Find sandboxes that have exceeded their max running time
	var sandboxes []models.Sandbox
	if err := s.db.DB.Where("status = ? AND timeout_at < ?", "running", time.Now()).Find(&sandboxes).Error; err != nil {
		return err
	}
	
	for _, sandbox := range sandboxes {
		// Stop the sandbox
		now := time.Now()
		sandbox.Status = "timeout"
		sandbox.StoppedAt = &now
		s.db.DB.Save(&sandbox)
		
		// Update usage record
		var usageRecord models.SandboxUsage
		if err := s.db.DB.Where("sandbox_id = ? AND end_time IS NULL", sandbox.SandboxID).First(&usageRecord).Error; err == nil {
			s.UpdateUsageRecord(usageRecord.UsageID, now, 0, 0, 0)
		}
	}
	
	return nil
}

func (s *SandboxService) GetSandboxStats(userID string) (map[string]interface{}, error) {
	var stats = make(map[string]interface{})
	
	// Total sandboxes
	var totalSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ?", userID).Count(&totalSandboxes)
	stats["total_sandboxes"] = totalSandboxes
	
	// Running sandboxes
	var runningSandboxes int64
	s.db.DB.Model(&models.Sandbox{}).Where("owner_user_id = ? AND status = ?", userID, "running").Count(&runningSandboxes)
	stats["running_sandboxes"] = runningSandboxes
	
	// Total usage time
	var totalUsage int64
	s.db.DB.Model(&models.SandboxUsage{}).Where("user_id = ?", userID).Select("COALESCE(SUM(running_seconds), 0)").Scan(&totalUsage)
	stats["total_usage_seconds"] = totalUsage
	
	// Total cost
	var totalCost float64
	s.db.DB.Model(&models.SandboxUsage{}).Where("user_id = ?", userID).Select("COALESCE(SUM(cost), 0)").Scan(&totalCost)
	stats["total_cost"] = totalCost
	
	return stats, nil
} 