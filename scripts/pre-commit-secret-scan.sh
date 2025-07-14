#!/bin/bash

# Pre-commit Secret Scan Script
# This script runs before each commit to check for sensitive data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔒 Running pre-commit secret scan...${NC}"

# Patterns to scan for
PATTERNS=(
    "AKIA[0-9A-Z]{16}"                    # AWS Access Key ID
    "sk_[a-zA-Z0-9]{24}"                  # Stripe Secret Key
    "pk_[a-zA-Z0-9]{24}"                  # Stripe Publishable Key
    "ghp_[a-zA-Z0-9]{36}"                 # GitHub Personal Access Token
    "gho_[a-zA-Z0-9]{36}"                 # GitHub OAuth Token
    "ghu_[a-zA-Z0-9]{36}"                 # GitHub User Token
    "ghs_[a-zA-Z0-9]{36}"                 # GitHub Server Token
    "ghr_[a-zA-Z0-9]{36}"                 # GitHub Refresh Token
    "[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}" # Credit Card
    "password.*=.*['\"][^'\"]{8,}"        # Password assignments
    "secret.*=.*['\"][^'\"]{8,}"          # Secret assignments
    "key.*=.*['\"][^'\"]{8,}"             # Key assignments
    "token.*=.*['\"][^'\"]{8,}"           # Token assignments
)

FOUND_SECRETS=false
SECRETS_FOUND=()

# Scan staged files for secrets
for pattern in "${PATTERNS[@]}"; do
    echo "Scanning for pattern: $pattern"
    
    # Check staged files
    if git diff --cached --name-only | xargs grep -l --exclude-dir={.git,node_modules,.terraform,dist,build} -E "$pattern" 2>/dev/null; then
        echo -e "${RED}❌ Found potential secret with pattern: $pattern${NC}"
        FOUND_SECRETS=true
        SECRETS_FOUND+=("$pattern")
    fi
done

# Check for hardcoded URLs with credentials
if git diff --cached --name-only | xargs grep -l --exclude-dir={.git,node_modules,.terraform,dist,build} -E "https?://[^/]*:[^/]*@" 2>/dev/null; then
    echo -e "${RED}❌ Found URLs with embedded credentials!${NC}"
    FOUND_SECRETS=true
    SECRETS_FOUND+=("URLs with credentials")
fi

# Check for .env files in staged changes
if git diff --cached --name-only | grep -E "\.env" | grep -v ".env.example"; then
    echo -e "${RED}❌ Found .env files in staged changes!${NC}"
    FOUND_SECRETS=true
    SECRETS_FOUND+=(".env files")
fi

# Check for Terraform state files
if git diff --cached --name-only | grep -E "\.tfstate"; then
    echo -e "${RED}❌ Found Terraform state files in staged changes!${NC}"
    FOUND_SECRETS=true
    SECRETS_FOUND+=("Terraform state files")
fi

# Check for certificate/key files
if git diff --cached --name-only | grep -E "\.(pem|key|crt|p12)$"; then
    echo -e "${RED}❌ Found certificate/key files in staged changes!${NC}"
    FOUND_SECRETS=true
    SECRETS_FOUND+=("Certificate/key files")
fi

if [ "$FOUND_SECRETS" = true ]; then
    echo -e "${RED}❌ Pre-commit secret scan FAILED!${NC}"
    echo -e "${RED}The following types of secrets were found:${NC}"
    for secret in "${SECRETS_FOUND[@]}"; do
        echo -e "${RED}  - $secret${NC}"
    done
    echo ""
    echo -e "${YELLOW}Please remove these secrets before committing:${NC}"
    echo "1. Remove any hardcoded credentials"
    echo "2. Use environment variables instead"
    echo "3. Add files to .gitignore if they contain secrets"
    echo "4. Use GitHub Secrets for CI/CD"
    exit 1
fi

echo -e "${GREEN}✅ Pre-commit secret scan passed${NC}"
exit 0 