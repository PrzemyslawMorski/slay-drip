# Frontend Build Pipeline

This directory contains the frontend application for Slay Drip, along with automated build and deployment pipelines that integrate with Terraform infrastructure.

## Overview

The frontend build pipeline automatically:
- Reads lambda function URLs from Terraform state
- Configures environment-specific settings
- Builds the application for development or production
- Deploys to appropriate environments (S3 buckets, CloudFront)

## Architecture

### Environment Configuration

The frontend uses a template-based approach for environment configuration:

- **`src/config/environment.template.ts`** - Template file with placeholders
- **`src/config/environment.ts`** - Generated during build (do not edit manually)

The template contains a placeholder `__API_GATEWAY_URL__` that gets replaced with the actual API Gateway URL from Terraform during production builds.

### Build Scripts

#### Bash Script (Linux/macOS)
```bash
# Make executable
chmod +x scripts/build-pipeline.sh

# Development build
./scripts/build-pipeline.sh --environment development

# Production build with API Gateway URL
./scripts/build-pipeline.sh --environment production --api-url "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production"

# Skip tests and linting
./scripts/build-pipeline.sh --environment production --api-url "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production" --skip-tests --skip-lint

# Dry run to see what would happen
./scripts/build-pipeline.sh --environment production --api-url "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production" --dry-run
```

#### PowerShell Script (Windows)
```powershell
# Development build
.\scripts\build-pipeline.ps1 -Environment development

# Production build with API Gateway URL
.\scripts\build-pipeline.ps1 -Environment production -ApiUrl "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production"

# Skip tests and linting
.\scripts\build-pipeline.ps1 -Environment production -ApiUrl "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production" -SkipTests -SkipLint

# Dry run to see what would happen
.\scripts\build-pipeline.ps1 -Environment production -ApiUrl "https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production" -DryRun
```

## GitHub Actions Integration

The frontend build and deployment is automated through GitHub Actions workflows:

### Workflow: `frontend-build-deploy.yml`

This workflow automatically:
1. **Reads Terraform State** - Gets API Gateway URLs, S3 bucket names, and CloudFront distribution IDs
2. **Builds Frontend** - Installs dependencies, runs tests, configures environment, and builds
3. **Deploys** - Deploys to development or production based on branch/trigger
4. **Post-Deploy** - Provides deployment summary and status

### Triggering the Workflow

#### Automatic Triggers
- **Push to `main`** → Production build and deployment
- **Push to `develop`** → Development build and deployment
- **Pull Requests** → Development build (no deployment)

#### Manual Triggers
- **Environment Selection** - Choose development or production
- **Skip Options** - Skip tests or linting if needed

### Required Secrets

The following GitHub secrets must be configured:

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### Terraform Integration

The workflow reads these outputs from your Terraform state:

```hcl
# In terraform/frontend.tf
output "api_gateway_url" {
  description = "API Gateway URL for frontend configuration"
  value       = aws_api_gateway_stage.production.invoke_url
}

output "frontend_s3_bucket" {
  description = "S3 bucket name for frontend hosting"
  value       = aws_s3_bucket.frontend.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID for cache invalidation"
  value       = aws_cloudfront_distribution.frontend.id
}
```

## Local Development

### Prerequisites
- Node.js 16+ and npm
- Access to the repository

### Quick Start
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm ci

# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for development
npm run build:dev

# Build for production (requires API Gateway URL)
npm run build:live
```

### Environment Variables

You can set environment variables to override script parameters:

```bash
export API_GATEWAY_URL="https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production"
export BUILD_ENVIRONMENT="production"
export SKIP_TESTS="true"

# Then run the build script
./scripts/build-pipeline.sh
```

## Build Outputs

### Development Build
- Output directory: `dist/`
- Uses localhost API endpoints
- Includes debug information
- Optimized for development

### Production Build
- Output directory: `dist/`
- Uses production API Gateway URLs
- Minified and optimized
- Ready for deployment

## Deployment

### Development Environment
- Simulated deployment (shows what would happen)
- No actual AWS resources required
- Useful for testing the build process

### Production Environment
- Deploys to S3 bucket from Terraform
- Invalidates CloudFront cache
- Updates live website

## Troubleshooting

### Common Issues

#### API Gateway URL Not Found
```bash
Error: API Gateway URL is required for production builds
```
**Solution**: Ensure your Terraform configuration outputs the `api_gateway_url` and the infrastructure is deployed.

#### S3 Bucket Not Found
```bash
Error: S3 bucket name not found in Terraform outputs
```
**Solution**: Check that `frontend_s3_bucket` output is defined in `terraform/frontend.tf`.

#### Build Failures
```bash
Error: Build output directory 'dist' not found
```
**Solution**: Check that the build completed successfully and the output directory exists.

### Debug Mode

Enable verbose output to see detailed information:

```bash
./scripts/build-pipeline.sh --verbose
# or
.\scripts\build-pipeline.ps1 -Verbose
```

### Dry Run

Test the pipeline without making changes:

```bash
./scripts/build-pipeline.sh --dry-run
# or
.\scripts\build-pipeline.ps1 -DryRun
```

## Contributing

When modifying the frontend build pipeline:

1. **Update both scripts** - Bash and PowerShell versions should have equivalent functionality
2. **Test locally** - Run the scripts locally before committing
3. **Update documentation** - Keep this README current with any changes
4. **Follow conventions** - Use consistent error handling and output formatting

## Security Notes

- Never commit API Gateway URLs or other sensitive configuration
- Use GitHub secrets for sensitive values
- The build pipeline automatically cleans up temporary files
- Environment configuration is restored after builds
