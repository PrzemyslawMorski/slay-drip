#!/bin/bash

# Build and push Lambda functions as Docker images to ECR
# Usage: ./build-and-push.sh [environment]
# Example: ./build-and-push.sh staging

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-"staging"}
AWS_REGION=${AWS_REGION:-"eu-central-1"}
ECR_REPOSITORY_PREFIX=${ECR_REPOSITORY_PREFIX:-"slay-drip"}
AWS_ACCOUNT_ID=${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query Account --output text)}

echo -e "${GREEN}Building Lambda functions as Docker images...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}AWS Region: ${AWS_REGION}${NC}"
echo -e "${BLUE}AWS Account ID: ${AWS_ACCOUNT_ID}${NC}"
echo -e "${BLUE}ECR Repository Prefix: ${ECR_REPOSITORY_PREFIX}${NC}"

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is required${NC}"
    echo -e "${YELLOW}Please install AWS CLI and configure it with appropriate credentials${NC}"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is required${NC}"
    echo -e "${YELLOW}Please install Docker and try again${NC}"
    exit 1
fi

# List of functions to build
FUNCTIONS=(
    "get-items"
    "get-item"
    "create-item"
    "get-outfits"
    "get-outfit"
    "create-outfit"
)

# Login to ECR
echo -e "${YELLOW}Logging in to ECR...${NC}"
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Build and push each function
for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Building $func...${NC}"
    
    # ECR repository name with environment suffix
    REPO_NAME="${ECR_REPOSITORY_PREFIX}-${func}-${ENVIRONMENT}"
    
    # Create ECR repository if it doesn't exist
    echo -e "${BLUE}Checking ECR repository: ${REPO_NAME}${NC}"
    aws ecr describe-repositories --repository-names ${REPO_NAME} --region ${AWS_REGION} 2>/dev/null || {
        echo -e "${BLUE}Creating ECR repository: ${REPO_NAME}${NC}"
        aws ecr create-repository --repository-name ${REPO_NAME} --region ${AWS_REGION}
    }
    
    # Build Docker image
    IMAGE_TAG="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest"
    
    echo -e "${BLUE}Building image: ${IMAGE_TAG}${NC}"
    docker build \
        --build-arg FUNCTION_NAME=${func} \
        -f Dockerfile.template \
        -t ${REPO_NAME}:latest \
        -t ${IMAGE_TAG} \
        .
    
    # Push to ECR
    echo -e "${YELLOW}Pushing $func to ECR...${NC}"
    docker push ${IMAGE_TAG}
    
    echo -e "${GREEN}✅ Built and pushed $func${NC}"
    echo -e "${BLUE}Image URI: ${IMAGE_TAG}${NC}"
done

echo -e "${GREEN}✅ All Lambda functions built and pushed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "${BLUE}1. Run Terraform apply to create/update Lambda functions${NC}"
echo -e "${BLUE}2. Verify the functions are working correctly${NC}"
echo ""
echo -e "${BLUE}Image URIs for Terraform:${NC}"
for func in "${FUNCTIONS[@]}"; do
    REPO_NAME="${ECR_REPOSITORY_PREFIX}-${func}-${ENVIRONMENT}"
    IMAGE_TAG="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest"
    echo -e "${BLUE}${func}: ${IMAGE_TAG}${NC}"
done 