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
	Environment        Environment
	DynamoDBTableName string
	LogLevel          string
	EnableDebug       bool
	Region            string
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
	
	tableName := os.Getenv("DYNAMODB_TABLE_NAME")
	if tableName == "" {
		return nil, fmt.Errorf("DYNAMODB_TABLE_NAME environment variable is required")
	}
	
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "us-east-1" // Default region
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
		Environment:        env,
		DynamoDBTableName: tableName,
		LogLevel:          logLevel,
		EnableDebug:       enableDebug,
		Region:            region,
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

// GetTableName returns the DynamoDB table name for the current environment
func (c *Config) GetTableName() string {
	return c.DynamoDBTableName
}

// GetLogLevel returns the log level for the current environment
func (c *Config) GetLogLevel() string {
	return c.LogLevel
}

// ShouldEnableDebug returns whether debug features should be enabled
func (c *Config) ShouldEnableDebug() bool {
	return c.EnableDebug
}
