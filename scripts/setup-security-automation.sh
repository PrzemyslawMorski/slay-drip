#!/bin/bash

# Security Automation Setup Script
# This script sets up all security scanning tools and pre-commit hooks

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔒 Setting up Security Automation for Slay Drip${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -f "terraform/main.tf" ]; then
    echo -e "${RED}❌ Error: Please run this script from the project root directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Project structure verified${NC}"

# Install pre-commit
echo -e "${YELLOW}📦 Installing pre-commit...${NC}"
if ! command -v pre-commit &> /dev/null; then
    pip install pre-commit
    echo -e "${GREEN}✅ pre-commit installed${NC}"
else
    echo -e "${GREEN}✅ pre-commit already installed${NC}"
fi

# Install security tools
echo -e "${YELLOW}🔧 Installing security tools...${NC}"

# Install TruffleHog
if ! command -v trufflehog &> /dev/null; then
    pip install trufflehog
    echo -e "${GREEN}✅ TruffleHog installed${NC}"
else
    echo -e "${GREEN}✅ TruffleHog already installed${NC}"
fi

# Install detect-secrets
if ! command -v detect-secrets &> /dev/null; then
    pip install detect-secrets
    echo -e "${GREEN}✅ detect-secrets installed${NC}"
else
    echo -e "${GREEN}✅ detect-secrets already installed${NC}"
fi

# Install Snyk CLI
if ! command -v snyk &> /dev/null; then
    npm install -g snyk
    echo -e "${GREEN}✅ Snyk CLI installed${NC}"
else
    echo -e "${GREEN}✅ Snyk CLI already installed${NC}"
fi

# Initialize detect-secrets baseline
echo -e "${YELLOW}🔍 Initializing detect-secrets baseline...${NC}"
if [ ! -f ".secrets.baseline" ]; then
    detect-secrets scan --baseline .secrets.baseline
    echo -e "${GREEN}✅ detect-secrets baseline created${NC}"
else
    echo -e "${GREEN}✅ detect-secrets baseline already exists${NC}"
fi

# Install pre-commit hooks
echo -e "${YELLOW}🔗 Installing pre-commit hooks...${NC}"
pre-commit install
echo -e "${GREEN}✅ pre-commit hooks installed${NC}"

# Make scripts executable
echo -e "${YELLOW}🔧 Making security scripts executable...${NC}"
chmod +x scripts/pre-commit-secret-scan.sh
chmod +x scripts/pre-commit-env-check.sh
chmod +x scripts/pre-commit-terraform-check.sh
echo -e "${GREEN}✅ Security scripts made executable${NC}"

# Test the setup
echo -e "${YELLOW}🧪 Testing security setup...${NC}"

# Test pre-commit
if pre-commit run --all-files; then
    echo -e "${GREEN}✅ Pre-commit hooks working correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Pre-commit hooks found issues (this is normal for initial setup)${NC}"
fi

# Test TruffleHog
if trufflehog --version &> /dev/null; then
    echo -e "${GREEN}✅ TruffleHog working correctly${NC}"
else
    echo -e "${RED}❌ TruffleHog not working properly${NC}"
fi

# Test detect-secrets
if detect-secrets --version &> /dev/null; then
    echo -e "${GREEN}✅ detect-secrets working correctly${NC}"
else
    echo -e "${RED}❌ detect-secrets not working properly${NC}"
fi

# Create security documentation
echo -e "${YELLOW}📝 Creating security documentation...${NC}"

cat > docs/SECURITY_AUTOMATION.md << 'EOF'
# Security Automation Guide

This guide explains the security automation setup for the Slay Drip project.

## 🔒 Security Tools Installed

### 1. Pre-commit Hooks
- **Secret scanning**: Detects API keys, passwords, tokens
- **Environment file checks**: Prevents .env files from being committed
- **Terraform checks**: Prevents state files and credentials from being committed
- **Code formatting**: Ensures consistent code style

### 2. GitHub Actions Security Scan
- **TruffleHog**: Advanced secret detection
- **detect-secrets**: Yelp's secret detection tool
- **Custom regex scanning**: Project-specific patterns
- **Dependency scanning**: npm audit and Snyk integration

### 3. Automated Checks
- **Pre-commit**: Runs before each commit
- **Pull request**: Runs on every PR
- **Push**: Runs on every push to main/develop

## 🚀 How to Use

### Pre-commit Hooks (Automatic)
```bash
# Hooks run automatically on every commit
git add .
git commit -m "feat: add new feature"
# Security checks run automatically
```

### Manual Security Scan
```bash
# Run pre-commit on all files
pre-commit run --all-files

# Run specific hook
pre-commit run detect-secrets

# Run GitHub Actions manually
# Go to Actions tab → Security Scan → Run workflow
```

### Security Tools Commands
```bash
# TruffleHog scan
trufflehog --only-verified .

# detect-secrets scan
detect-secrets scan --baseline .secrets.baseline

# npm audit
npm audit --audit-level=high

# Snyk scan
snyk test
```

## 🛡️ What Gets Checked

### 1. Secret Detection
- AWS Access Keys (`AKIA...`)
- GitHub Tokens (`ghp_...`, `gho_...`, etc.)
- Stripe Keys (`sk_...`, `pk_...`)
- Credit Card Numbers
- Password assignments
- Token assignments

### 2. File Checks
- `.env` files (except `.env.example`)
- `config.json` and `secrets.json`
- Certificate files (`.pem`, `.key`, `.crt`, `.p12`)
- Terraform state files (`.tfstate*`)
- Large files (>1MB)

### 3. Code Quality
- Hardcoded URLs with credentials
- Console.log statements
- HTTP URLs (should be HTTPS)
- File permissions

## 🚨 Common Issues & Solutions

### 1. False Positives
```bash
# If a legitimate file is flagged, add to .secrets.baseline
detect-secrets audit .secrets.baseline
```

### 2. Pre-commit Fails
```bash
# Skip pre-commit for emergency commits (not recommended)
git commit --no-verify -m "emergency fix"

# Fix the issues and try again
pre-commit run --all-files
```

### 3. GitHub Actions Fails
- Check the Actions tab for detailed logs
- Fix any detected secrets
- Update dependencies if vulnerabilities found

## 📊 Monitoring

### 1. GitHub Actions Dashboard
- Go to Actions tab
- View Security Scan workflow
- Check for failed runs

### 2. Pre-commit Reports
```bash
# View pre-commit status
pre-commit run --all-files --verbose
```

### 3. Security Metrics
- Number of secrets detected
- Dependency vulnerabilities
- Code quality issues

## 🔧 Configuration

### 1. Custom Patterns
Edit `scripts/pre-commit-secret-scan.sh` to add custom patterns:
```bash
PATTERNS=(
    "YOUR_CUSTOM_PATTERN"
)
```

### 2. Exclude Files
Edit `.pre-commit-config.yaml` to exclude files:
```yaml
exclude: |
  (?x)^(
      \.git/|
      node_modules/|
      \.terraform/|
      dist/|
      build/
  )$
```

### 3. Severity Levels
Edit GitHub Actions workflow to change severity:
```yaml
args: --severity-threshold=high  # or medium, low
```

## 🎯 Best Practices

### 1. Before Committing
- Run `pre-commit run --all-files`
- Check for any security warnings
- Fix issues before committing

### 2. Regular Maintenance
- Update security tools monthly
- Review `.secrets.baseline` quarterly
- Monitor GitHub Actions for failures

### 3. Team Training
- Train team on security practices
- Document false positive handling
- Establish security review process

## 📚 Resources

- [Pre-commit Documentation](https://pre-commit.com/)
- [TruffleHog Documentation](https://github.com/trufflesecurity/truffleHog)
- [detect-secrets Documentation](https://github.com/Yelp/detect-secrets)
- [Snyk Documentation](https://docs.snyk.io/)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
EOF

echo -e "${GREEN}✅ Security documentation created${NC}"

# Final summary
echo ""
echo -e "${GREEN}🎉 Security automation setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 What's been set up:${NC}"
echo "✅ Pre-commit hooks installed"
echo "✅ TruffleHog secret scanner"
echo "✅ detect-secrets baseline"
echo "✅ Snyk CLI for dependency scanning"
echo "✅ GitHub Actions security workflow"
echo "✅ Custom security scripts"
echo "✅ Security documentation"
echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo "1. Test with: git add . && git commit -m 'test'"
echo "2. Set up Snyk token: snyk auth"
echo "3. Review security documentation: docs/SECURITY_AUTOMATION.md"
echo "4. Configure GitHub Secrets for Snyk (optional)"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Pre-commit hooks will run on every commit"
echo "- GitHub Actions will scan on every push/PR"
echo "- Keep security tools updated regularly"
echo "- Review security reports monthly" 