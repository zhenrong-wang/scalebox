package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"fmt"
	"math/big"
	"time"
)

// GenerateAccountID generates a 12-character account ID
func GenerateAccountID() string {
	return generateRandomString(12, "0123456789")
}

// GenerateUserID generates a 25-character user ID
func GenerateUserID() string {
	return generateRandomString(25, "0123456789abcdefghijklmnopqrstuvwxyz")
}

// GenerateResourceID generates a resource ID with prefix
func GenerateResourceID(prefix string, length int) string {
	randomPart := generateRandomString(length-len(prefix), "0123456789abcdefghijklmnopqrstuvwxyz")
	return prefix + randomPart
}

// GenerateProjectID generates a project ID
func GenerateProjectID() string {
	return GenerateResourceID("proj", 25)
}

// GenerateTemplateID generates a template ID
func GenerateTemplateID() string {
	return GenerateResourceID("tpl", 25)
}

// GenerateSandboxID generates a sandbox ID
func GenerateSandboxID() string {
	return GenerateResourceID("sbox", 25)
}

// GenerateAPIKey generates an API key
func GenerateAPIKey() string {
	return generateRandomString(50, "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
}

// GenerateAPIKeyResourceID generates an API key resource ID
func GenerateAPIKeyResourceID() string {
	return GenerateResourceID("key", 25)
}

// GenerateNotificationID generates a notification ID
func GenerateNotificationID() string {
	return GenerateResourceID("notif", 25)
}

// GenerateUsageID generates a usage ID
func GenerateUsageID() string {
	return GenerateResourceID("usage", 25)
}

// GenerateMetricID generates a metric ID
func GenerateMetricID() string {
	return GenerateResourceID("metric", 25)
}

// GenerateBillingID generates a billing ID
func GenerateBillingID() string {
	return GenerateResourceID("bill", 25)
}

// GenerateSignupID generates a signup ID
func GenerateSignupID() string {
	return GenerateResourceID("signup", 25)
}

// GenerateDedicatedSigninURL generates a dedicated signin URL
func GenerateDedicatedSigninURL(accountID string) string {
	randomPart := generateRandomString(12, "0123456789abcdefghijklmnopqrstuvwxyz")
	return accountID + "-" + randomPart
}

// GenerateInitialPassword generates a secure initial password
func GenerateInitialPassword() string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&"
	return generateRandomString(12, charset)
}

// GenerateRandomCode generates a 6-digit verification code
func GenerateRandomCode(length int) string {
	return generateRandomString(length, "0123456789")
}

// generateRandomString generates a random string of specified length
func generateRandomString(length int, charset string) string {
	result := make([]byte, length)
	charsetLen := big.NewInt(int64(len(charset)))

	for i := 0; i < length; i++ {
		randomIndex, _ := rand.Int(rand.Reader, charsetLen)
		result[i] = charset[randomIndex.Int64()]
	}

	return string(result)
}

// StringPtr returns a pointer to a string
func StringPtr(s string) *string {
	return &s
}

// TimePtr returns a pointer to a time.Time
func TimePtr(t time.Time) *time.Time {
	return &t
}

// FormatExpiryTime formats expiry time as human readable
func FormatExpiryTime(expiresAt time.Time) string {
	now := time.Now()
	diff := expiresAt.Sub(now)

	if diff <= 0 {
		return "Expired"
	}

	minutes := int(diff.Minutes())
	if minutes < 60 {
		return fmt.Sprintf("%d minutes", minutes)
	}

	hours := minutes / 60
	remainingMinutes := minutes % 60
	return fmt.Sprintf("%d hours %d minutes", hours, remainingMinutes)
}

// HashString generates a SHA256 hash of a string
func HashString(s string) string {
	hash := sha256.Sum256([]byte(s))
	return fmt.Sprintf("%x", hash)
}
