# Lambda Deployment Guide

This guide explains how to deploy the Slay Drip Lambda functions using container images.

## Prerequisites

1. **AWS CLI** configured with appropriate credentials
2. **Docker** installed and running
3. **Terraform** installed
4. **Go** installed (for building the functions)

## Deployment Order

The deployment must follow this specific order:

1. **Build and push Docker images to ECR**
2. **Deploy infrastructure with Terraform**

## Step 1: Build and Push Docker Images

### For Windows (PowerShell):
```powershell
cd backend/lambda
.\build-and-push.ps1 staging
```

### For Linux/macOS (Bash):
```bash
cd backend/lambda
./build-and-push.sh staging
```

This script will:
- Build Docker images for all Lambda functions
- Create ECR repositories if they don't exist
- Push images to ECR with the `latest` tag
- Display the image URIs for reference

## Step 2: Deploy Infrastructure

After the images are pushed to ECR, deploy the infrastructure:

```bash
cd terraform
./apply.sh
```

## Environment Variables

You can customize the deployment by setting these environment variables:

- `AWS_REGION`: AWS region (default: `eu-central-1`)
- `ECR_REPOSITORY_PREFIX`: ECR repository prefix (default: `slay-drip`)
- `AWS_ACCOUNT_ID`: Your AWS account ID (auto-detected if not set)

## Troubleshooting

### Error: "Source image does not exist"

This error occurs when Terraform tries to create Lambda functions that reference container images that haven't been pushed to ECR yet.

**Solution**: Always run the build-and-push script before running Terraform apply.

### Error: "Repository does not exist"

The ECR repository doesn't exist.

**Solution**: The build script will automatically create repositories, but you can also create them manually:

```bash
aws ecr create-repository --repository-name slay-drip-get-items-staging --region eu-central-1
```

### Error: "Access denied"

You don't have permission to push to ECR or create Lambda functions.

**Solution**: Ensure your AWS credentials have the necessary permissions:
- `ecr:CreateRepository`
- `ecr:GetAuthorizationToken`
- `ecr:BatchCheckLayerAvailability`
- `ecr:GetDownloadUrlForLayer`
- `ecr:BatchGetImage`
- `lambda:CreateFunction`
- `lambda:UpdateFunctionCode`

## Manual Steps (if needed)

### 1. Login to ECR
```bash
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com
```

### 2. Build a single function
```bash
docker build \
  --build-arg FUNCTION_NAME=get-items \
  -f Dockerfile.template \
  -t slay-drip-get-items-staging:latest \
  -t YOUR_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com/slay-drip-get-items-staging:latest \
  .
```

### 3. Push to ECR
```bash
docker push YOUR_ACCOUNT_ID.dkr.ecr.eu-central-1.amazonaws.com/slay-drip-get-items-staging:latest
```

## Verification

After deployment, verify that:

1. **ECR repositories exist** with the correct images
2. **Lambda functions are created** and point to the correct ECR images
3. **API Gateway is deployed** and accessible
4. **DynamoDB table is created** with the correct indexes

### Check ECR repositories:
```bash
aws ecr describe-repositories --region eu-central-1
```

### Check Lambda functions:
```bash
aws lambda list-functions --region eu-central-1
```

### Test API endpoints:
```bash
curl https://YOUR_API_GATEWAY_URL/api/v1/items
```

## Cleanup

To remove all resources:

```bash
cd terraform
./destroy.sh
```

**Note**: This will also delete the ECR repositories and all images. Make sure you want to do this before running the destroy command. 