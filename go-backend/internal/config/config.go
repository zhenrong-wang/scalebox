package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Database DatabaseConfig
	JWT      JWTConfig
	SMTP     SMTPConfig
	Server   ServerConfig
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type JWTConfig struct {
	Secret     string
	ExpireHours int
}

type SMTPConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	From     string
}

type ServerConfig struct {
	Port         string
	Environment  string
	AppBaseURL   string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	godotenv.Load()

	port, _ := strconv.Atoi(getEnv("DB_PORT", "3306"))
	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))
	jwtExpireHours, _ := strconv.Atoi(getEnv("JWT_EXPIRE_HOURS", "24"))

	config := &Config{
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     port,
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "scalebox"),
			SSLMode:  getEnv("DB_SSL_MODE", "disable"),
		},
		JWT: JWTConfig{
			Secret:      getEnv("JWT_SECRET", "your-secret-key"),
			ExpireHours: jwtExpireHours,
		},
		SMTP: SMTPConfig{
			Host:     getEnv("SMTP_HOST", "localhost"),
			Port:     smtpPort,
			User:     getEnv("SMTP_USER", ""),
			Password: getEnv("SMTP_PASS", ""),
			From:     getEnv("SMTP_FROM", "noreply@scalebox.com"),
		},
		Server: ServerConfig{
			Port:        getEnv("PORT", "8000"),
			Environment: getEnv("ENVIRONMENT", "development"),
			AppBaseURL:  getEnv("APP_BASE_URL", "http://localhost:3000"),
		},
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
} 