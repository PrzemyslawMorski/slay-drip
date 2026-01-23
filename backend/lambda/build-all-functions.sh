#!/bin/bash

# Build Lambda functions for the specified environment
ENVIRONMENT=${1:-"dev"}
FUNCTION_NAME=$2

# Function to display usage
usage() {
    echo "Usage: $0 [environment] [function-name]"
    echo "  environment: dev or live (default: dev)"
    echo "  function-name: optional, one of: get-items, get-item, create-item, get-outfits, get-outfit, create-outfit"
    echo ""
    echo "Examples:"
    echo "  $0                 # Build all functions for dev environment"
    echo "  $0 dev             # Build all functions for dev environment"
    echo "  $0 live            # Build all functions for live environment"
    echo "  $0 dev get-items   # Build only the get-items function for dev"
    echo "  $0 live create-outfit  # Build only the create-outfit function for live"
    echo ""
    echo "Note: This script builds Lambda functions and pushes them to ECR."
    echo "      If no function-name is provided, all functions are built."
    echo "      Make sure you have AWS credentials configured."
    echo ""
    echo "You can also run: $0 -h | --help | help"
}

# Support help flag/command
if [[ "$ENVIRONMENT" == "-h" || "$ENVIRONMENT" == "--help" || "$ENVIRONMENT" == "help" ]]; then
    usage
    exit 0
fi

# Validate environment
declare -A ENVIRONMENTS
ENVIRONMENTS["dev"]="dev"
ENVIRONMENTS["live"]="live"
ENVIRONMENTS["all"]="dev live"

if [[ ! "$ENVIRONMENT" =~ ^(dev|live)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo ""
    echo "Valid environments: dev, live"
    echo ""
    usage
    exit 1
fi

# Check if Docker is available and running
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    echo "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running"
    echo ""
    echo "Please start Docker Desktop and wait for it to be ready."
    echo "On Windows, you can start it from the Start menu or system tray."
    echo ""
    echo "To verify Docker is running, try: docker info"
    exit 1
fi

echo "🏗️  Building Lambda functions for environment: $ENVIRONMENT"
echo ""

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_DEFAULT_REGION:-$(aws configure get region)}

if [ -z "$AWS_ACCOUNT_ID" ] || [ -z "$AWS_REGION" ]; then
    echo "❌ Error: AWS credentials not configured or region not set"
    echo "   Please run 'aws configure' or set AWS_DEFAULT_REGION"
    exit 1
fi

echo "📍 AWS Account: $AWS_ACCOUNT_ID"
echo "📍 AWS Region: $AWS_REGION"
echo ""

# List of functions to build
FUNCTIONS=(
    "get-items"
    "get-item"
    "create-item"
    "get-outfits"
    "get-outfit"
    "create-outfit"
)

# Determine which functions to build
if [[ -n "$FUNCTION_NAME" ]]; then
    # Validate requested function name
    if [[ ! " ${FUNCTIONS[*]} " =~ " ${FUNCTION_NAME} " ]]; then
        echo "❌ Error: Invalid function name '$FUNCTION_NAME'"
        echo ""
        echo "Valid functions: ${FUNCTIONS[*]}"
        echo ""
        usage
        exit 1
    fi
    FUNCTIONS_TO_BUILD=("$FUNCTION_NAME")
else
    FUNCTIONS_TO_BUILD=("${FUNCTIONS[@]}")
fi

# Build and push each function
for func in "${FUNCTIONS_TO_BUILD[@]}"; do
    echo "🔨 Building $func..."
    
    # Repository name
    REPO_NAME="slay-drip-${func}-${ENVIRONMENT}"
    
    # Check if repository exists, create if not
    if ! aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
        echo "   Creating ECR repository: $REPO_NAME"
        aws ecr create-repository \
            --repository-name "$REPO_NAME" \
            --region "$AWS_REGION" \
            --tags Key=Environment,Value="$ENVIRONMENT" Key=Function,Value="$func"
    fi
    
    # Build and tag image
    echo "   Building Docker image..."
    docker build \
        -f Dockerfile.template \
        --build-arg FUNCTION_NAME="$func" \
        --build-arg ENVIRONMENT="$ENVIRONMENT" \
        -t "$REPO_NAME:latest" \
        .
    
    # Tag for ECR
    ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest"
    docker tag "$REPO_NAME:latest" "$ECR_URI"
    
    # Login to ECR
    echo "   Logging in to ECR..."
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Push to ECR
    echo "   Pushing to ECR..."
    docker push "$ECR_URI"
    
    echo "✅ $func built and pushed successfully"
    echo ""
done

echo "🎉 Lambda functions built and pushed successfully!"
echo ""
echo "📋 Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Functions: ${FUNCTIONS_TO_BUILD[*]}"
echo "   ECR Region: $AWS_REGION"
echo ""
echo "🔗 Next steps:"
echo "   1. Deploy infrastructure with Terraform: ./terraform/apply.sh $ENVIRONMENT"
echo "   2. Or update existing Lambda functions with new images"
echo "" 