#!/bin/bash

# Default environment
ENVIRONMENT=${1:-"staging"}

# Configuration
AWS_REGION="eu-central-1"

# Function names (matching the directories in functions/)
FUNCTIONS=(
    "create-item"
    "create-outfit" 
    "get-item"
    "get-items"
    "get-outfit"
    "get-outfits"
)

# Environments
declare -A ENVIRONMENTS
ENVIRONMENTS["development"]="development"
ENVIRONMENTS["staging"]="staging"
ENVIRONMENTS["production"]="production"
ENVIRONMENTS["all"]="development staging production"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

function print_color() {
    local message="$1"
    local color="$2"
    echo -e "${color}${message}${NC}"
}

function print_success() {
    print_color "✅ $1" "$GREEN"
}

function print_error() {
    print_color "❌ $1" "$RED"
}

function print_info() {
    print_color "ℹ️  $1" "$BLUE"
}

function print_warning() {
    print_color "⚠️  $1" "$YELLOW"
}

function test_docker() {
    if command -v docker &> /dev/null; then
        return 0
    else
        return 1
    fi
}

function test_awscli() {
    if command -v aws &> /dev/null; then
        return 0
    else
        return 1
    fi
}

function get_aws_account_id() {
    local account_id
    account_id=$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$account_id" ]; then
        echo "$account_id"
    else
        print_error "Failed to get AWS account ID from current context"
        exit 1
    fi
}

function login_ecr() {
    print_info "Logging into ECR..."
    if aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"; then
        print_success "Successfully logged into ECR"
    else
        print_error "Failed to login to ECR"
        exit 1
    fi
}

function build_function() {
    local function_name="$1"
    local environment="$2"
    
    local image_name="slay-drip-$function_name-$environment"
    local full_image_name="$ECR_REGISTRY/$image_name"
    
    print_info "Building $function_name for $environment environment..."
    
    # Build the Docker image
    print_info "Building Docker image: $image_name"
    if docker build --build-arg FUNCTION_NAME="$function_name" -f Dockerfile.template -t "$image_name" .; then
        print_info "Docker build successful for $function_name"
    else
        print_error "Failed to build Docker image for $function_name"
        return 1
    fi
    
    # Tag the image
    print_info "Tagging image: $full_image_name"
    if docker tag "$image_name:latest" "$full_image_name:latest"; then
        print_info "Image tagged successfully"
    else
        print_error "Failed to tag Docker image for $function_name"
        return 1
    fi
    
    # Push the image
    print_info "Pushing image to ECR: $full_image_name"
    if docker push "$full_image_name:latest"; then
        print_success "Successfully built and pushed $function_name for $environment"
        return 0
    else
        print_error "Failed to push Docker image for $function_name"
        return 1
    fi
}

function build_all_functions() {
    local target_environments="$1"
    
    # Convert space-separated string to array
    IFS=' ' read -ra ENV_ARRAY <<< "$target_environments"
    
    local total_functions=$(( ${#FUNCTIONS[@]} * ${#ENV_ARRAY[@]} ))
    local completed_functions=0
    local failed_functions=()
    
    print_info "Starting build process for $total_functions total builds..."
    print_info "Functions: ${FUNCTIONS[*]}"
    print_info "Environments: ${ENV_ARRAY[*]}"
    
    for env in "${ENV_ARRAY[@]}"; do
        print_info "Processing environment: $env"
        
        for function in "${FUNCTIONS[@]}"; do
            ((completed_functions++))
            print_info "[$completed_functions/$total_functions] Building $function for $env"
            
            if build_function "$function" "$env"; then
                print_success "[$completed_functions/$total_functions] ✅ $function ($env)"
            else
                print_error "[$completed_functions/$total_functions] ❌ $function ($env)"
                failed_functions+=("$function ($env)")
            fi
        done
    done
    
    # Summary
    print_info "Build process completed!"
    print_info "Total builds: $total_functions"
    print_info "Successful: $((total_functions - ${#failed_functions[@]}))"
    print_info "Failed: ${#failed_functions[@]}"
    
    if [ ${#failed_functions[@]} -gt 0 ]; then
        print_warning "Failed builds:"
        for failed in "${failed_functions[@]}"; do
            print_warning "  - $failed"
        done
        exit 1
    else
        print_success "All builds completed successfully! 🎉"
    fi
}

# Main execution
print_info "Slay Drip Lambda Functions Builder"
print_info "=================================="
print_info "Environment: $ENVIRONMENT"
print_info "AWS Region: $AWS_REGION"

# Check prerequisites
print_info "Checking prerequisites..."

if ! test_docker; then
    print_error "Docker is not installed or not available in PATH"
    exit 1
fi

if ! test_awscli; then
    print_error "AWS CLI is not installed or not available in PATH"
    exit 1
fi

print_success "Prerequisites check passed"

# Get AWS account ID and set ECR registry
AWS_ACCOUNT_ID=$(get_aws_account_id)
ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
print_info "AWS Account ID: $AWS_ACCOUNT_ID"
print_info "ECR Registry: $ECR_REGISTRY"

# Login to ECR
login_ecr

# Get target environments
TARGET_ENVIRONMENTS="${ENVIRONMENTS[$ENVIRONMENT]}"
if [ -z "$TARGET_ENVIRONMENTS" ]; then
    print_error "Invalid environment: $ENVIRONMENT"
    print_info "Valid environments: ${!ENVIRONMENTS[*]}"
    exit 1
fi

# Build all functions
build_all_functions "$TARGET_ENVIRONMENTS" 