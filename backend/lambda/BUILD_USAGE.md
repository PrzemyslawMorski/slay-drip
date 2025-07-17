# Lambda Functions Build Script

This script builds and pushes Docker images for all Lambda functions to AWS ECR.

## Usage

### Basic Usage (defaults to staging)
```powershell
.\build-all-functions.ps1
```

### Build for specific environment
```powershell
# Build for development
.\build-all-functions.ps1 -Environment development

# Build for staging
.\build-all-functions.ps1 -Environment staging

# Build for production
.\build-all-functions.ps1 -Environment production

# Build for all environments
.\build-all-functions.ps1 -Environment all
```

## Prerequisites

- Docker installed and running
- AWS CLI installed and configured
- Appropriate AWS permissions for ECR access

## What it does

1. **Checks prerequisites**: Verifies Docker and AWS CLI are available
2. **Logs into ECR**: Authenticates with AWS ECR registry
3. **Builds all functions**: Creates Docker images for each function
4. **Tags and pushes**: Tags images with environment and pushes to ECR

## Functions Built

The script builds the following functions:
- `create-item`
- `create-outfit`
- `get-item`
- `get-items`
- `get-outfit`
- `get-outfits`

## Image Naming Convention

Images are named following this pattern:
```
slay-drip-{function-name}-{environment}
```

Examples:
- `slay-drip-get-items-staging`
- `slay-drip-create-item-production`
- `slay-drip-get-outfit-development`

## ECR Repository

Images are pushed to:
```
{aws-account-id}.dkr.ecr.eu-central-1.amazonaws.com/slay-drip-{function-name}-{environment}
```

The AWS account ID is automatically retrieved from your current AWS context using `aws sts get-caller-identity`.

## Error Handling

- The script will exit with error code 1 if any build fails
- Failed builds are reported in the summary
- Prerequisites are checked before starting builds
- ECR login failures are handled gracefully

## Output

The script provides colored output with:
- ✅ Success messages (green)
- ❌ Error messages (red)
- ℹ️ Info messages (blue)
- ⚠️ Warning messages (yellow)

Progress is shown as `[current/total]` for each build. 