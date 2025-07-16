#!/bin/bash

# Terraform Apply Script
# Automatically sets the environment variable for applying

set -e

# Check if environment parameter is provided
if [ $# -eq 0 ]; then
    echo "❌ Error: Environment parameter is required"
    echo "Usage: ./apply.sh <environment>"
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

echo "🚀 Applying Terraform for environment: $ENVIRONMENT"

# Check if we're in the right directory
if [ ! -f "main.tf" ]; then
    echo "❌ Error: Please run this script from the terraform directory"
    exit 1
fi

# Check if plan file exists
PLAN_FILE="$ENVIRONMENT.tfplan"
if [ ! -f "$PLAN_FILE" ]; then
    echo "❌ Error: Plan file '$PLAN_FILE' not found!"
    echo "💡 Run the plan script first:"
    echo "   ./plan.sh $ENVIRONMENT"
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
    echo "⚠️  Workspace '$ENVIRONMENT' not found. Creating..."
    terraform workspace new $ENVIRONMENT
fi

# Ask for confirmation
echo "⚠️  WARNING: This will apply changes to the $ENVIRONMENT environment!"
read -p "🤔 Are you sure you want to apply? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled"
    exit 1
fi

# Apply the plan
echo "🚀 Applying Terraform changes..."
terraform apply -var="environment=$ENVIRONMENT" "$PLAN_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Apply completed successfully!"
    
    # Show outputs
    echo ""
    echo "📊 Environment Outputs:"
    terraform output
    
    # Clean up plan file
    rm -f "$PLAN_FILE"
    echo "🗑️  Plan file cleaned up"
else
    echo "❌ Apply failed!"
    exit 1
fi 