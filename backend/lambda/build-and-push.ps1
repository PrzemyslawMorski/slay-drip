# Build and push Lambda functions as Docker images to ECR
# Usage: .\build-and-push.ps1 [environment]
# Example: .\build-and-push.ps1 staging

param(
    [string]$Environment = "staging"
)

# Configuration
$AWS_REGION = $env:AWS_REGION
if (-not $AWS_REGION) { $AWS_REGION = "eu-central-1" }

$ECR_REPOSITORY_PREFIX = $env:ECR_REPOSITORY_PREFIX
if (-not $ECR_REPOSITORY_PREFIX) { $ECR_REPOSITORY_PREFIX = "slay-drip" }

$AWS_ACCOUNT_ID = $env:AWS_ACCOUNT_ID
if (-not $AWS_ACCOUNT_ID) {
    try {
        $AWS_ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text 2>$null).Trim()
    }
    catch {
        Write-Host "Error: Could not get AWS Account ID. Please set AWS_ACCOUNT_ID environment variable or configure AWS CLI." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Building Lambda functions as Docker images..." -ForegroundColor Green
Write-Host "Environment: $Environment" -ForegroundColor Blue
Write-Host "AWS Region: $AWS_REGION" -ForegroundColor Blue
Write-Host "AWS Account ID: $AWS_ACCOUNT_ID" -ForegroundColor Blue
Write-Host "ECR Repository Prefix: $ECR_REPOSITORY_PREFIX" -ForegroundColor Blue

# Check if AWS CLI is available
try {
    aws --version | Out-Null
}
catch {
    Write-Host "Error: AWS CLI is required" -ForegroundColor Red
    Write-Host "Please install AWS CLI and configure it with appropriate credentials" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is available
try {
    docker --version | Out-Null
}
catch {
    Write-Host "Error: Docker is required" -ForegroundColor Red
    Write-Host "Please install Docker and try again" -ForegroundColor Yellow
    exit 1
}

# List of functions to build
$FUNCTIONS = @(
    "get-items",
    "get-item",
    "create-item",
    "get-outfits",
    "get-outfit",
    "create-outfit"
)

# Login to ECR
Write-Host "Logging in to ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push each function
foreach ($func in $FUNCTIONS) {
    Write-Host "Building $func..." -ForegroundColor Yellow
    
    # ECR repository name with environment suffix
    $REPO_NAME = "${ECR_REPOSITORY_PREFIX}-${func}-${Environment}"
    
    # Create ECR repository if it doesn't exist
    Write-Host "Checking ECR repository: $REPO_NAME" -ForegroundColor Blue
    $repoExists = aws ecr describe-repositories --repository-names $REPO_NAME --region $AWS_REGION 2>$null
    if (-not $repoExists) {
        Write-Host "Creating ECR repository: $REPO_NAME" -ForegroundColor Blue
        aws ecr create-repository --repository-name $REPO_NAME --region $AWS_REGION
    }
    
    # Build Docker image
    $IMAGE_TAG = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest"
    
    Write-Host "Building image: $IMAGE_TAG" -ForegroundColor Blue
    
    # Build the Docker image and capture the exit code
    $buildResult = docker build `
        --build-arg FUNCTION_NAME=$func `
        -f Dockerfile.template `
        -t ${REPO_NAME}:latest `
        -t $IMAGE_TAG `
        . 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build $func" -ForegroundColor Red
        Write-Host $buildResult -ForegroundColor Red
        exit 1
    }
    
    # Push to ECR
    Write-Host "Pushing $func to ECR..." -ForegroundColor Yellow
    $pushResult = docker push $IMAGE_TAG 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push $func" -ForegroundColor Red
        Write-Host $pushResult -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Built and pushed $func" -ForegroundColor Green
    Write-Host "Image URI: $IMAGE_TAG" -ForegroundColor Blue
}

Write-Host "✅ All Lambda functions built and pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run Terraform apply to create/update Lambda functions" -ForegroundColor Blue
Write-Host "2. Verify the functions are working correctly" -ForegroundColor Blue
Write-Host ""
Write-Host "Image URIs for Terraform:" -ForegroundColor Blue
foreach ($func in $FUNCTIONS) {
    $REPO_NAME = "${ECR_REPOSITORY_PREFIX}-${func}-${Environment}"
    $IMAGE_TAG = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest"
    Write-Host "$func`: $IMAGE_TAG" -ForegroundColor Blue
} 