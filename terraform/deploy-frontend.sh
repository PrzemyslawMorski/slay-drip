#!/bin/bash

# Frontend Deployment Script
# This script builds the React app and deploys it to S3

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="../frontend"
BUILD_DIR="build"
S3_BUCKET=""

echo -e "${GREEN}🚀 Starting frontend deployment...${NC}"

# Check if we're in the terraform directory
if [ ! -f "main.tf" ]; then
    echo -e "${RED}❌ Error: Please run this script from the terraform directory${NC}"
    exit 1
fi

# Get S3 bucket name from Terraform output
echo -e "${YELLOW}📦 Getting S3 bucket name from Terraform...${NC}"
S3_BUCKET=$(terraform output -raw frontend_bucket_name 2>/dev/null || echo "")

if [ -z "$S3_BUCKET" ]; then
    echo -e "${RED}❌ Error: Could not get S3 bucket name from Terraform output${NC}"
    echo -e "${YELLOW}💡 Make sure to run 'terraform apply' first${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Found S3 bucket: ${S3_BUCKET}${NC}"

# Check if frontend directory exists
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Error: Frontend directory not found at $FRONTEND_DIR${NC}"
    exit 1
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Build the React app
echo -e "${YELLOW}🔨 Building React app...${NC}"
npm run build

# Check if build was successful
if [ ! -d "$BUILD_DIR" ]; then
    echo -e "${RED}❌ Error: Build failed - build directory not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"

# Navigate back to terraform directory
cd - > /dev/null

# Sync build files to S3
echo -e "${YELLOW}📤 Uploading files to S3...${NC}"
aws s3 sync "$FRONTEND_DIR/$BUILD_DIR/" "s3://$S3_BUCKET/" --delete

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Files uploaded successfully${NC}"
else
    echo -e "${RED}❌ Error: Failed to upload files to S3${NC}"
    exit 1
fi

# Set proper cache headers for PWA assets
echo -e "${YELLOW}🔧 Setting cache headers for PWA assets...${NC}"
if [ -f "$FRONTEND_DIR/$BUILD_DIR/service-worker.js" ]; then
    aws s3 cp "$FRONTEND_DIR/$BUILD_DIR/service-worker.js" "s3://$S3_BUCKET/service-worker.js" --cache-control "no-cache, no-store, must-revalidate" --content-type "application/javascript"
fi

if [ -f "$FRONTEND_DIR/$BUILD_DIR/manifest.json" ]; then
    aws s3 cp "$FRONTEND_DIR/$BUILD_DIR/manifest.json" "s3://$S3_BUCKET/manifest.json" --cache-control "max-age=3600" --content-type "application/json"
fi

echo -e "${GREEN}✅ Cache headers set successfully${NC}"

# Get CloudFront distribution URL
echo -e "${YELLOW}🌐 Getting CloudFront URL...${NC}"
CLOUDFRONT_URL=$(terraform output -raw frontend_cloudfront_url 2>/dev/null || echo "")

if [ -n "$CLOUDFRONT_URL" ]; then
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}🌐 Your app is available at: ${CLOUDFRONT_URL}${NC}"
    echo -e "${YELLOW}⏳ Note: CloudFront cache may take a few minutes to update${NC}"
else
    echo -e "${GREEN}✅ Files uploaded to S3 successfully${NC}"
    echo -e "${YELLOW}🌐 S3 website URL: http://$S3_BUCKET.s3-website-$(terraform output -raw aws_region).amazonaws.com${NC}"
fi

echo -e "${GREEN}✨ Deployment script completed!${NC}" 