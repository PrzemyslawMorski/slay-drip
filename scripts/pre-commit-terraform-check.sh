#!/bin/bash

# Pre-commit Terraform Check
# This script checks for Terraform state files and sensitive Terraform data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🏗️  Checking for Terraform sensitive files...${NC}"

FOUND_SENSITIVE_FILES=false
SENSITIVE_FILES=()

# Check for .tfstate files in staged changes
if git diff --cached --name-only | grep -E "\.tfstate"; then
    echo -e "${RED}❌ Found Terraform state files in staged changes!${NC}"
    git diff --cached --name-only | grep -E "\.tfstate"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("Terraform state files")
fi

# Check for .tfstate.backup files
if git diff --cached --name-only | grep -E "\.tfstate\.backup"; then
    echo -e "${RED}❌ Found Terraform state backup files in staged changes!${NC}"
    git diff --cached --name-only | grep -E "\.tfstate\.backup"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("Terraform state backup files")
fi

# Check for .terraform.lock.hcl.backup files
if git diff --cached --name-only | grep -E "\.terraform\.lock\.hcl\.backup"; then
    echo -e "${RED}❌ Found Terraform lock backup files in staged changes!${NC}"
    git diff --cached --name-only | grep -E "\.terraform\.lock\.hcl\.backup"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("Terraform lock backup files")
fi

# Check for hardcoded credentials in Terraform files
if git diff --cached --name-only | grep -E "\.tf$" | xargs grep -l --exclude-dir={.git,node_modules,.terraform} -E "(access_key|secret_key|password|token).*=.*['\"][^'\"]{8,}" 2>/dev/null; then
    echo -e "${RED}❌ Found hardcoded credentials in Terraform files!${NC}"
    git diff --cached --name-only | grep -E "\.tf$" | xargs grep -l --exclude-dir={.git,node_modules,.terraform} -E "(access_key|secret_key|password|token).*=.*['\"][^'\"]{8,}" 2>/dev/null
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("Hardcoded credentials in Terraform")
fi

# Check for AWS credentials in Terraform files
if git diff --cached --name-only | grep -E "\.tf$" | xargs grep -l --exclude-dir={.git,node_modules,.terraform} -E "AKIA[0-9A-Z]{16}" 2>/dev/null; then
    echo -e "${RED}❌ Found AWS credentials in Terraform files!${NC}"
    git diff --cached --name-only | grep -E "\.tf$" | xargs grep -l --exclude-dir={.git,node_modules,.terraform} -E "AKIA[0-9A-Z]{16}" 2>/dev/null
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("AWS credentials in Terraform")
fi

# Check for database connection strings in Terraform
if git diff --cached --name-only | grep -E "\.tf$" | xargs grep -l --exclude-dir={.git,node_modules,.terraform} -E "postgresql://|mysql://|mongodb://" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Found database connection strings in Terraform files${NC}"
    echo -e "${YELLOW}Please verify these don't contain real credentials${NC}"
fi

# Check for .terraform directory
if git diff --cached --name-only | grep -E "\.terraform/"; then
    echo -e "${RED}❌ Found .terraform directory in staged changes!${NC}"
    git diff --cached --name-only | grep -E "\.terraform/"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=(".terraform directory")
fi

if [ "$FOUND_SENSITIVE_FILES" = true ]; then
    echo -e "${RED}❌ Terraform check FAILED!${NC}"
    echo -e "${RED}The following sensitive Terraform files were found:${NC}"
    for file in "${SENSITIVE_FILES[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
    echo ""
    echo -e "${YELLOW}Please:${NC}"
    echo "1. Remove Terraform state files from staging"
    echo "2. Use variables for credentials instead of hardcoding"
    echo "3. Use AWS provider configuration instead of hardcoded keys"
    echo "4. Add sensitive files to .gitignore"
    echo "5. Use remote state storage (S3) for production"
    exit 1
fi

echo -e "${GREEN}✅ Terraform check passed${NC}"
exit 0 