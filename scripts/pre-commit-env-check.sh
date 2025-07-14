#!/bin/bash

# Pre-commit Environment File Check
# This script checks for environment files and other sensitive files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Checking for environment files...${NC}"

FOUND_SENSITIVE_FILES=false
SENSITIVE_FILES=()

# Check for .env files in staged changes
if git diff --cached --name-only | grep -E "\.env" | grep -v ".env.example"; then
    echo -e "${RED}❌ Found .env files in staged changes!${NC}"
    git diff --cached --name-only | grep -E "\.env" | grep -v ".env.example"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=(".env files")
fi

# Check for config files with potential secrets
if git diff --cached --name-only | grep -E "(config\.json|secrets\.json|\.pem|\.key|\.crt|\.p12)$"; then
    echo -e "${RED}❌ Found potential secret files in staged changes!${NC}"
    git diff --cached --name-only | grep -E "(config\.json|secrets\.json|\.pem|\.key|\.crt|\.p12)$"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("Secret files")
fi

# Check for files with "secret" or "password" in the name
if git diff --cached --name-only | grep -i -E "(secret|password|credential)"; then
    echo -e "${RED}❌ Found files with sensitive names in staged changes!${NC}"
    git diff --cached --name-only | grep -i -E "(secret|password|credential)"
    FOUND_SENSITIVE_FILES=true
    SENSITIVE_FILES+=("Files with sensitive names")
fi

# Check for large files that might contain secrets
LARGE_FILES=$(git diff --cached --name-only | xargs ls -la 2>/dev/null | awk '$5 > 1000000 {print $9}' || true)
if [ -n "$LARGE_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found large files (>1MB) in staged changes:${NC}"
    echo "$LARGE_FILES"
    echo -e "${YELLOW}Please verify these don't contain sensitive data${NC}"
fi

if [ "$FOUND_SENSITIVE_FILES" = true ]; then
    echo -e "${RED}❌ Environment file check FAILED!${NC}"
    echo -e "${RED}The following sensitive files were found:${NC}"
    for file in "${SENSITIVE_FILES[@]}"; do
        echo -e "${RED}  - $file${NC}"
    done
    echo ""
    echo -e "${YELLOW}Please:${NC}"
    echo "1. Remove sensitive files from staging"
    echo "2. Add them to .gitignore"
    echo "3. Use environment variables instead"
    echo "4. Use GitHub Secrets for sensitive data"
    exit 1
fi

echo -e "${GREEN}✅ Environment file check passed${NC}"
exit 0 