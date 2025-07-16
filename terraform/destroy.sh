#!/bin/bash

# Terraform Destroy Script
# Automatically sets the environment variable for destroying resources

set -e

# Check if environment parameter is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: Environment parameter is required"
    echo "Usage: ./destroy.sh <environment>"
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

echo "💥 Destroying Terraform resources for environment: $ENVIRONMENT"

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

# Select workspace
echo "🔄 Selecting workspace: $ENVIRONMENT"
if ! terraform workspace select $ENVIRONMENT 2>/dev/null; then
    echo "❌ Error: Workspace '$ENVIRONMENT' not found!"
    exit 1
fi

# Show what will be destroyed
echo "📋 Planning destroy operation..."
terraform plan -destroy -var="environment=$ENVIRONMENT" -out="$ENVIRONMENT.destroy.tfplan"

if [ $? -ne 0 ]; then
    echo "❌ Destroy plan failed!"
    exit 1
fi

# Ask for confirmation
echo "⚠️  WARNING: This will DESTROY ALL RESOURCES in the $ENVIRONMENT environment!"
echo "⚠️  This action cannot be undone!"
read -p "🤔 Are you absolutely sure you want to destroy? Type 'DESTROY' to confirm: " -r
if [[ ! $REPLY =~ ^DESTROY$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Apply the destroy plan
echo "💥 Destroying Terraform resources..."
terraform apply -var="environment=$ENVIRONMENT" "$ENVIRONMENT.destroy.tfplan"

if [ $? -eq 0 ]; then
    echo "✅ Destroy completed successfully!"
    
    # Clean up plan file
    rm -f "$ENVIRONMENT.destroy.tfplan"
    echo "🗑️  Destroy plan file cleaned up"
else
    echo "❌ Destroy failed!"
    exit 1
fi 