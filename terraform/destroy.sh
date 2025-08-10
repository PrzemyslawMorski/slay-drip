#!/bin/bash

# Slay Drip Terraform Destroy Script
# This script destroys Terraform infrastructure for the specified environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local message="$1"
    local color="$2"
    echo -e "${color}${message}${NC}"
}

print_success() {
    print_color "✅ $1" "$GREEN"
}

print_error() {
    print_color "❌ $1" "$RED"
}

print_info() {
    print_color "ℹ️  $1" "$BLUE"
}

print_warning() {
    print_color "⚠️  $1" "$YELLOW"
}

# Function to display usage
usage() {
    echo "Usage: $0 [environment]"
    echo "  environment: dev or live (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0          # Destroy dev environment"
    echo "  $0 dev      # Destroy dev environment"
    echo "  $0 live     # Destroy live environment"
    echo ""
    echo "⚠️  WARNING: This will destroy ALL infrastructure for the specified environment!"
    echo "      This action cannot be undone and will result in data loss."
}

# Get environment from command line argument
ENVIRONMENT=${1:-"dev"}

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|live)$ ]]; then
    print_error "Invalid environment: $ENVIRONMENT"
    echo ""
    echo "Valid environments: dev, live"
    echo ""
    usage
    exit 1
fi

print_info "Slay Drip Terraform Destroy"
print_info "============================"
print_info "Environment: $ENVIRONMENT"
echo ""

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    print_error "Terraform is not installed or not available in PATH"
    echo "Please install Terraform and try again."
    exit 1
fi

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed or not available in PATH"
    echo "Please install AWS CLI and try again."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured or invalid"
    echo "Please run 'aws configure' or set appropriate environment variables."
    exit 1
fi

print_success "Prerequisites check passed"
echo ""

# Get AWS account ID and region
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_DEFAULT_REGION:-$(aws configure get region)}

print_info "AWS Account: $AWS_ACCOUNT_ID"
print_info "AWS Region: $AWS_REGION"
echo ""

# Change to terraform directory
cd "$(dirname "$0")"

print_info "Initializing Terraform..."
terraform init \
    -backend-config="bucket=slay-drip-terraform-state-$ENVIRONMENT" \
    -backend-config="key=terraform.tfstate" \
    -backend-config="region=$AWS_REGION"

print_info "Validating Terraform configuration..."
if terraform validate; then
    print_success "Terraform configuration is valid"
else
    print_error "Terraform validation failed"
    exit 1
fi

echo ""
print_warning "🚨 DESTRUCTION WARNING 🚨"
print_warning "You are about to DESTROY ALL infrastructure for the $ENVIRONMENT environment!"
print_warning "This will permanently delete:"
print_warning "  - S3 buckets and all data"
print_warning "  - Lambda functions"
print_warning "  - API Gateway"
print_warning "  - DynamoDB tables"
print_warning "  - IAM roles and policies"
print_warning "  - CloudWatch logs"
print_warning "  - All other AWS resources"
echo ""
print_warning "⚠️  This action CANNOT be undone!"
print_warning "⚠️  All data will be permanently lost!"
echo ""

if [ "$ENVIRONMENT" = "live" ]; then
    print_warning "🚨 LIVE ENVIRONMENT: This will destroy PRODUCTION resources!"
    echo ""
    read -p "Are you absolutely sure you want to destroy the LIVE environment? Type 'DESTROY-LIVE' to confirm: " -r
    if [[ ! $REPLY =~ ^DESTROY-LIVE$ ]]; then
        print_info "Live environment destruction cancelled by user"
        exit 0
    fi
else
    read -p "Are you absolutely sure you want to destroy the $ENVIRONMENT environment? Type 'yes' to confirm: " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        print_info "Environment destruction cancelled by user"
        exit 0
    fi
fi

echo ""
print_warning "Final confirmation required..."
read -p "Type the environment name '$ENVIRONMENT' to confirm destruction: " -r
if [[ ! $REPLY =~ ^$ENVIRONMENT$ ]]; then
    print_info "Environment destruction cancelled - environment name did not match"
    exit 0
fi

echo ""
print_info "Destroying Terraform infrastructure..."
print_warning "This may take several minutes..."

if terraform destroy -auto-approve -var="environment=$ENVIRONMENT"; then
    print_success "Terraform destroy completed successfully!"
    echo ""
    print_info "All infrastructure for $ENVIRONMENT environment has been destroyed"
    print_info "AWS resources have been removed"
    print_info "Data has been permanently deleted"
else
    print_error "Terraform destroy failed"
    exit 1
fi

echo ""
print_warning "🎯 Destruction completed!"
print_info "Environment: $ENVIRONMENT"
print_info "Status: All infrastructure destroyed"
print_info "Next steps:"
print_info "  1. Verify resources are removed in AWS Console"
print_info "  2. Clean up any remaining manual resources if needed"
print_info "  3. Re-deploy infrastructure when ready" 