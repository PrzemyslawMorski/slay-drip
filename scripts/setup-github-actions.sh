#!/bin/bash

# GitHub Actions Setup Script for Slay Drip Frontend Deployment
# This script helps you set up the necessary AWS credentials and GitHub configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 GitHub Actions Setup for Slay Drip Frontend${NC}"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first:${NC}"
    echo "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if user is authenticated with AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not configured. Please run:${NC}"
    echo "aws configure"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI is configured${NC}"

# Get current AWS account info
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
USER_ARN=$(aws sts get-caller-identity --query Arn --output text)

echo -e "${BLUE}📋 Current AWS Configuration:${NC}"
echo "Account ID: $ACCOUNT_ID"
echo "User ARN: $USER_ARN"
echo ""

# Create IAM user for GitHub Actions
echo -e "${YELLOW}🔧 Creating IAM user for GitHub Actions...${NC}"

USER_NAME="slay-drip-github-actions"
POLICY_NAME="SlayDripFrontendDeployment"

# Create IAM user
aws iam create-user --user-name $USER_NAME 2>/dev/null || echo "User already exists"

# Create policy document
cat > /tmp/frontend-deployment-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::slay-drip-frontend-*",
        "arn:aws:s3:::slay-drip-frontend-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "arn:aws:cloudfront::*:distribution/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::terraform-state-*/*"
    }
  ]
}
EOF

# Create policy
aws iam create-policy \
  --policy-name $POLICY_NAME \
  --policy-document file:///tmp/frontend-deployment-policy.json \
  2>/dev/null || echo "Policy already exists"

# Attach policy to user
aws iam attach-user-policy \
  --user-name $USER_NAME \
  --policy-arn arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME

# Create access keys
echo -e "${YELLOW}🔑 Creating access keys...${NC}"
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name $USER_NAME)

ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

echo -e "${GREEN}✅ IAM user and access keys created successfully${NC}"
echo ""

# Display GitHub setup instructions
echo -e "${BLUE}📝 GitHub Repository Setup Instructions:${NC}"
echo ""
echo "1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/slay-drip"
echo ""
echo "2. Navigate to Settings → Secrets and variables → Actions"
echo ""
echo "3. Add these repository secrets:"
echo ""
echo -e "${YELLOW}AWS_ACCESS_KEY_ID:${NC}"
echo "$ACCESS_KEY_ID"
echo ""
echo -e "${YELLOW}AWS_SECRET_ACCESS_KEY:${NC}"
echo "$SECRET_ACCESS_KEY"
echo ""
echo "4. Create GitHub Environments:"
echo "   - Go to Settings → Environments"
echo "   - Create: development, staging, production"
echo ""
echo "5. For production environment, add protection rules:"
echo "   - Require reviewers"
echo "   - Add wait timer (optional)"
echo ""

# Test the credentials
echo -e "${YELLOW}🧪 Testing AWS credentials...${NC}"
export AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY

if aws sts get-caller-identity &> /dev/null; then
    echo -e "${GREEN}✅ AWS credentials work correctly${NC}"
else
    echo -e "${RED}❌ AWS credentials test failed${NC}"
fi

# Clean up temporary files
rm -f /tmp/frontend-deployment-policy.json

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Add the secrets to your GitHub repository"
echo "2. Create the GitHub environments"
echo "3. Push to the develop branch to trigger your first deployment"
echo ""
echo -e "${YELLOW}⚠️  Important: Keep these credentials secure!${NC}"
echo "The access keys are shown above. Store them safely." 