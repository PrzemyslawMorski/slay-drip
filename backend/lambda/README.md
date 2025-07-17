# Lambda Functions - Container Images

This directory contains the Lambda functions for the Slay Drip backend, now using container images deployed to Amazon ECR.

## Overview

The Lambda functions are now built as Docker container images and deployed to Amazon ECR (Elastic Container Registry). This approach provides several benefits:

- **Consistency**: Eliminates GLIBC version issues across different environments
- **Reproducibility**: Container images ensure the same runtime environment
- **Scalability**: Easier to manage dependencies and runtime configurations
- **Security**: Better isolation and security controls

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GitHub Code   │───▶│  Docker Build   │───▶│   ECR Registry  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │◀───│  Lambda Runtime │◀───│  Container Image│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Functions

| Function | Purpose | Endpoint |
|----------|---------|----------|
| `get-items` | Retrieve all items | `GET /api/v1/items` |
| `get-item` | Retrieve specific item | `GET /api/v1/items/{id}` |
| `create-item` | Create new item | `POST /api/v1/items` |
| `get-outfits` | Retrieve all outfits | `GET /api/v1/outfits` |
| `get-outfit` | Retrieve specific outfit | `GET /api/v1/outfits/{id}` |
| `create-outfit` | Create new outfit | `POST /api/v1/outfits` |

## Local Development

### Prerequisites

- Docker
- AWS CLI (configured with appropriate credentials)
- Go 1.24+

### Building Locally

1. **Build all functions and push to ECR:**
   ```bash
   # Using bash script
   ./build-docker.sh
   
   # Using PowerShell (Windows)
   ./build-docker.ps1
   ```

2. **Build individual function:**
   ```bash
   # Build specific function
   docker build \
     --build-arg FUNCTION_NAME=get-items \
     -f Dockerfile.template \
     -t slay-drip-get-items:latest \
     .
   ```

3. **Test locally with Docker:**
   ```bash
   # Run function locally
   docker run -p 9000:8080 slay-drip-get-items:latest
   
   # Test with curl
   curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" \
     -d '{"httpMethod": "GET", "path": "/api/v1/items"}'
   ```

### Environment Variables

The following environment variables can be set:

- `AWS_REGION`: AWS region (default: us-east-1)
- `ECR_REPOSITORY_PREFIX`: ECR repository prefix (default: slay-drip)
- `AWS_ACCOUNT_ID`: AWS account ID (auto-detected if not set)

## Deployment

### Automated Deployment (GitHub Actions)

The project includes a GitHub Actions workflow that automatically:

1. Builds Docker images for all functions
2. Pushes images to ECR
3. Deploys infrastructure using Terraform
4. Updates Lambda functions with new images
5. Tests the deployment

**Trigger the workflow:**
- Push to `main` branch (automatic)
- Create a pull request (for testing)

### Manual Deployment

1. **Build and push images:**
   ```bash
   cd backend/lambda
   ./build-docker.sh
   ```

2. **Deploy infrastructure:**
   ```bash
   cd terraform
   terraform init
   terraform plan -var="app_name=slay-drip" -var="environment=dev"
   terraform apply
   ```

3. **Update Lambda functions:**
   ```bash
   # Update all functions
   aws lambda update-function-code \
     --function-name slay-drip-get-items-dev \
     --image-uri <account-id>.dkr.ecr.us-east-1.amazonaws.com/slay-drip-get-items-dev:latest
   ```

## Infrastructure

### ECR Repositories

Each function gets its own ECR repository:
- `slay-drip-get-items-{environment}`
- `slay-drip-get-item-{environment}`
- `slay-drip-create-item-{environment}`
- `slay-drip-get-outfits-{environment}`
- `slay-drip-get-outfit-{environment}`
- `slay-drip-create-outfit-{environment}`

### IAM Permissions

The Lambda execution role includes:
- Basic Lambda execution permissions
- DynamoDB access permissions
- ECR image access permissions

### API Gateway

The API Gateway is configured with:
- Regional endpoint
- CORS enabled
- Lambda proxy integration
- Automatic deployment on changes

## Troubleshooting

### Common Issues

1. **GLIBC Version Errors:**
   - This is resolved by using container images
   - Ensure you're using the provided Dockerfile.template

2. **ECR Login Issues:**
   ```bash
   aws ecr get-login-password --region us-east-1 | \
     docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
   ```

3. **Lambda Function Not Found:**
   - Check that the function name matches the ECR repository
   - Verify the image URI is correct
   - Ensure the Lambda function exists in Terraform

4. **Permission Denied:**
   - Check IAM roles and policies
   - Verify ECR repository permissions
   - Ensure Lambda execution role has proper permissions

### Debugging

1. **Check Lambda logs:**
   ```bash
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/slay-drip"
   ```

2. **Test function locally:**
   ```bash
   docker run -e AWS_LAMBDA_RUNTIME_API=localhost:9000 \
     -p 9000:8080 slay-drip-get-items:latest
   ```

3. **Check ECR images:**
   ```bash
   aws ecr describe-images --repository-name slay-drip-get-items-dev
   ```

## Migration from ZIP Deployment

If you're migrating from ZIP-based deployment:

1. **Backup current functions:**
   ```bash
   aws lambda get-function --function-name slay-drip-get-items-dev
   ```

2. **Update Terraform configuration:**
   - Use `backend-lambdas-container.tf` instead of `backend-lambdas.tf`
   - Remove S3 bucket dependencies
   - Add ECR repository resources

3. **Deploy new infrastructure:**
   ```bash
   terraform apply -var="app_name=slay-drip" -var="environment=dev"
   ```

4. **Update function code:**
   ```bash
   ./build-docker.sh
   ```

## Best Practices

1. **Image Optimization:**
   - Use multi-stage builds
   - Minimize image size
   - Use specific base images

2. **Security:**
   - Scan images for vulnerabilities
   - Use least privilege IAM roles
   - Keep base images updated

3. **Monitoring:**
   - Set up CloudWatch alarms
   - Monitor function duration and errors
   - Track ECR image usage

4. **CI/CD:**
   - Use semantic versioning for images
   - Implement automated testing
   - Rollback capabilities

## File Structure

```
backend/lambda/
├── Dockerfile.template          # Multi-stage Docker build template
├── build-docker.sh             # Bash build script
├── build-docker.ps1            # PowerShell build script
├── build-local.sh              # Local build (no Docker)
├── build-local.ps1             # Local build PowerShell
├── functions/                  # Lambda function source code
│   ├── get-items/
│   ├── get-item/
│   ├── create-item/
│   ├── get-outfits/
│   ├── get-outfit/
│   └── create-outfit/
├── handlers/                   # Shared handler code
├── models/                     # Shared data models
├── go.mod                      # Go module definition
├── go.sum                      # Go module checksums
└── README.md                   # This file
```

## Contributing

1. Make changes to function code in `functions/` directory
2. Update shared code in `handlers/` and `models/` directories
3. Test locally using Docker
4. Push changes to trigger automated deployment
5. Verify deployment in AWS Console

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review CloudWatch logs
3. Test functions locally with Docker
4. Check GitHub Actions workflow logs 