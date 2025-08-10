# Environment Configuration Guide

This document describes how the Slay Drip application is configured to support multiple environments (development and live/production).

## Overview

The application supports two main environments:
- **Development (`dev`)**: For development and testing
- **Live (`live`)**: For production use

## Environment Separation

### 1. Infrastructure (Terraform)

All AWS resources are environment-specific with naming convention:
```
${app_name}-${resource}-${environment}
```

**Examples:**
- DynamoDB tables: `slay-drip-table-dev`, `slay-drip-table-live`
- Lambda functions: `slay-drip-get-items-dev`, `slay-drip-get-items-live`
- S3 buckets: `slay-drip-frontend-dev`, `slay-drip-frontend-live`
- API Gateway: `slay-drip-api-dev`, `slay-drip-api-live`

### 2. Frontend Configuration

#### Environment Detection
The frontend automatically detects the environment based on:
- `import.meta.env.DEV` (Vite development mode)
- `import.meta.env.VITE_ENVIRONMENT` (manual override)
- Build mode (`--mode development` or `--mode production`)

#### Configuration Files
- `src/config/environment.ts` - Environment configuration module
- `vite.config.mjs` - Main Vite configuration with environment support
- `vite.config.development.mjs` - Development-specific configuration
- `vite.config.production.mjs` - Production-specific configuration

#### Environment Variables
```bash
# Development
VITE_APP_TITLE=Slay Drip - Development
VITE_API_BASE_URL=http://localhost:3000
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true

# Production
VITE_APP_TITLE=Slay Drip
VITE_API_BASE_URL=https://api.slaydrip.com
VITE_ENVIRONMENT=production
VITE_ENABLE_DEBUG=false
```

### 3. Backend Configuration

#### Lambda Functions
Each Lambda function uses environment-specific configuration:
- `ENVIRONMENT`: Set to `dev` or `live`
- `DYNAMODB_TABLE_NAME`: Environment-specific table name
- `LOG_LEVEL`: `DEBUG` for dev, `INFO` for live
- `AWS_REGION`: AWS region (defaults to `us-east-1`)

#### Configuration Module
- `backend/lambda/config/environment.go` - Centralized environment configuration
- Automatic environment detection and validation
- Environment-specific defaults and behaviors

## Deployment Workflows

### Development Environment
- **Trigger**: Push to `main` branch
- **Workflow**: `deploy-frontend.yml` → `deploy-lambda-containers.yml`
- **Target**: Development AWS resources
- **Auto-deploy**: Yes

### Live Environment
- **Trigger**: Manual deployment or release
- **Workflow**: `deploy-frontend.yml` → `deploy-lambda-containers.yml`
- **Target**: Live AWS resources
- **Auto-deploy**: No (manual approval required)

## Build Commands

### Frontend
```bash
# Development
npm run dev:dev          # Start dev server with dev config
npm run build:dev        # Build for development
npm run preview:dev      # Preview dev build

# Production
npm run dev:live         # Start dev server with live config
npm run build:live       # Build for production
npm run preview:live     # Preview production build
```

### Backend
```bash
# Build all Lambda functions
cd backend/lambda
./build-all-functions.sh

# Build specific function
cd functions/get-items
go build -o bootstrap main.go
zip bootstrap.zip bootstrap
```

## Environment-Specific Features

### Development
- Debug logging enabled
- Source maps in builds
- Local API endpoints
- Development-specific resource names
- Enhanced error messages

### Production
- Optimized builds (minified, chunked)
- Production API endpoints
- Live resource names
- Minimal logging
- Performance optimizations

## Configuration Validation

### Frontend
- Environment variables validated at build time
- Runtime environment detection
- Fallback to development for unknown environments

### Backend
- Required environment variables validated at startup
- Environment-specific defaults applied
- Configuration logged for debugging

## Troubleshooting

### Common Issues

1. **Environment Variable Not Set**
   - Check Terraform configuration
   - Verify GitHub Actions workflow
   - Ensure Lambda function has correct environment variables

2. **Wrong Environment Detected**
   - Check `VITE_ENVIRONMENT` override
   - Verify build mode (`--mode` flag)
   - Check `import.meta.env.DEV` value

3. **API Endpoints Not Working**
   - Verify `VITE_API_BASE_URL` configuration
   - Check API Gateway configuration
   - Ensure CORS is properly configured

### Debug Commands

```bash
# Check current environment
echo $VITE_ENVIRONMENT

# Verify build mode
npm run build:dev -- --mode development

# Check Lambda environment variables
aws lambda get-function-configuration --function-name slay-drip-get-items-dev
```

## Security Considerations

### Environment Isolation
- Separate AWS accounts/regions recommended for production
- Environment-specific IAM roles and policies
- No cross-environment resource access

### Configuration Security
- Sensitive values stored in AWS Systems Manager Parameter Store
- Environment variables not committed to version control
- Production secrets managed separately from development

## Monitoring and Observability

### Environment Metrics
- Separate CloudWatch dashboards per environment
- Environment-specific log groups
- Performance metrics tracked separately

### Health Checks
- Environment-specific health check endpoints
- Different alerting thresholds per environment
- Environment-aware monitoring and alerting

## Best Practices

1. **Always use environment-specific resource naming**
2. **Validate configuration at startup**
3. **Use centralized configuration modules**
4. **Test both environments before deployment**
5. **Monitor environment-specific metrics**
6. **Use environment-specific logging levels**
7. **Implement proper error handling for missing configuration**
8. **Document environment-specific requirements**
