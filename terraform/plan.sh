#!/bin/bash

# Terraform Plan Script
# Automatically sets the environment variable for planning

set -e

# Check if environment parameter is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: Environment parameter is required"
    echo "Usage: ./plan.sh <environment>"
    echo "Environments: development, staging, production"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo "Valid environments: development, staging, production"
    exit 1
fi

echo "🔍 Planning Terraform for environment: $ENVIRONMENT"

# Check if we're in the right directory
if [ ! -f "main.tf" ]; then
    echo "❌ Error: Please run this script from the terraform directory"
    exit 1
fi

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo "📦 Initializing Terraform..."
    terraform init
fi

# Select or create workspace
echo "🔄 Selecting workspace: $ENVIRONMENT"
if ! terraform workspace select $ENVIRONMENT 2>/dev/null; then
    echo "⚠️  Workspace '$ENVIRONMENT' not found. Creating..."
    terraform workspace new $ENVIRONMENT
fi

# Plan with environment variable
echo "📋 Planning Terraform changes..."
terraform plan -var="environment=$ENVIRONMENT" -out="$ENVIRONMENT.tfplan"

if [ $? -eq 0 ]; then
    echo "✅ Plan completed successfully!"
    echo "📄 Plan saved to: $ENVIRONMENT.tfplan"
    echo ""
    echo "💡 To apply this plan, run:"
    echo "   ./apply.sh $ENVIRONMENT"
else
    echo "❌ Plan failed!"
    exit 1
fi 