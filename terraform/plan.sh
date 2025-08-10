#!/bin/bash

# Slay Drip Terraform Plan Script
# This script creates a Terraform plan for the specified environment

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
    echo "  $0          # Plan for dev environment"
    echo "  $0 dev      # Plan for dev environment"
    echo "  $0 live     # Plan for live environment"
    echo ""
    echo "Note: This script will create a Terraform plan for the specified environment."
    echo "      Use the apply script to apply the changes."
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

print_info "Slay Drip Terraform Plan"
print_info "========================="
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

print_info "Formatting Terraform code..."
if terraform fmt -check; then
    print_success "Terraform code is properly formatted"
else
    print_warning "Terraform code formatting issues detected"
    print_info "Run 'terraform fmt' to fix formatting issues"
fi

echo ""
print_info "Creating Terraform plan..."
terraform plan \
    -var="environment=$ENVIRONMENT" \
    -out=tfplan

if [ $? -eq 0 ]; then
    print_success "Terraform plan created successfully!"
    echo ""
    print_info "Plan file saved as: tfplan"
    print_info "Next steps:"
    print_info "  1. Review the plan above"
    print_info "  2. Run './apply.sh $ENVIRONMENT' to apply changes"
    print_info "  3. Or run 'terraform apply tfplan' manually"
else
    print_error "Terraform plan failed"
    exit 1
fi 