package config

import (
	"fmt"
	"os"
	"strings"
)

// Environment represents the deployment environment
type Environment string

const (
	Development Environment = "development"
	Production  Environment = "live"
)

// Config holds environment-specific configuration
type Config struct {
	Environment Environment
	DatabaseURL string
	LogLevel    string
	EnableDebug bool
}

// GetEnvironment returns the current environment
func GetEnvironment() Environment {
	env := strings.ToLower(os.Getenv("ENVIRONMENT"))

	switch env {
	case "live", "production":
		return Production
	case "dev", "development":
		return Development
	default:
		// Default to development for safety
		return Development
	}
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	env := GetEnvironment()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		if env == Development {
			logLevel = "DEBUG"
		} else {
			logLevel = "INFO"
		}
	}

	enableDebug := env == Development

	return &Config{
		Environment: env,
		DatabaseURL: databaseURL,
		LogLevel:    logLevel,
		EnableDebug: enableDebug,
	}, nil
}

// IsDevelopment returns true if running in development environment
func (c *Config) IsDevelopment() bool {
	return c.Environment == Development
}

// IsProduction returns true if running in production environment
func (c *Config) IsProduction() bool {
	return c.Environment == Production
}

// GetDatabaseURL returns the PostgreSQL connection string for the current environment
func (c *Config) GetDatabaseURL() string {
	return c.DatabaseURL
}

// GetLogLevel returns the log level for the current environment
func (c *Config) GetLogLevel() string {
	return c.LogLevel
}

// ShouldEnableDebug returns whether debug features should be enabled
func (c *Config) ShouldEnableDebug() bool {
	return c.EnableDebug
}
