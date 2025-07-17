# Security Scanning Setup

This document explains the comprehensive security scanning setup that runs before every deployment to ensure code quality and security compliance.

## Overview

Every GitHub Action deployment workflow now includes mandatory security scanning as a prerequisite. This ensures that no deployment can proceed without passing security checks, protecting your infrastructure and applications from potential security vulnerabilities.

## Security Scan Workflow

The main security scanning workflow is located at `.github/workflows/security-scan.yml` and includes the following comprehensive checks:

### 1. Secrets Detection
- **TruffleHog**: Scans for verified secrets and credentials
- **detect-secrets**: Python-based secret detection
- **Environment Files**: Checks for `.env` files that shouldn't be committed
- **Terraform State**: Ensures no `.tfstate` files are committed
- **Hardcoded URLs**: Detects URLs with embedded credentials
- **Go/JS Secrets**: Scans for hardcoded secrets in Go and JavaScript/TypeScript files

### 2. Dependency Vulnerability Scanning
- **npm audit**: Scans Node.js dependencies for known vulnerabilities
- **govulncheck**: Scans Go dependencies for security vulnerabilities
- **Vulnerable Package Detection**: Checks for known vulnerable packages

### 3. Code Quality & Security
- **ESLint Security Rules**: Runs security-focused linting rules
- **Console.log Detection**: Identifies potential debugging code in production
- **Hardcoded Values**: Detects hardcoded IPs, URLs, and other sensitive data
- **Go Security Checks**: Runs `go test -race` and `go vet` for race conditions and security issues

## Integration with Deployment Workflows

### Lambda Deployment (`deploy-lambda.yml`)
```yaml
jobs:
  security-scan:
    name: Security Scan
    uses: ./.github/workflows/security-scan.yml
    with:
      scan_paths: 'backend/lambda,terraform'
      fail_on_secrets: true
      fail_on_vulnerabilities: true

  test:
    needs: security-scan  # Must pass security scan first
    # ... rest of test job

  build-and-deploy:
    needs: [security-scan, test]  
    # All jobs depend on security scan
    # ... rest of deployment job
```

### Frontend Deployment (`deploy-frontend.yml`)
```yaml
jobs:
  security-scan:
    name: Security Scan
    uses: ./.github/workflows/security-scan.yml
    with:
      scan_paths: 'frontend,terraform'
      fail_on_secrets: true
      fail_on_vulnerabilities: true

  test:
    needs: security-scan  # Must pass security scan first
    # ... rest of test job

  build:
    needs: [security-scan, test]  # Depends on security scan
    # ... rest of build job

  deploy-development:
    needs: [security-scan, build]  # All deployments depend on security scan
    # ... rest of deployment job
```

### Terraform Deployment (`deploy-terraform.yml`)
```yaml
jobs:
  security-scan:
    name: Security Scan
    uses: ./.github/workflows/security-scan.yml
    with:
      scan_paths: 'terraform'
      fail_on_secrets: true
      fail_on_vulnerabilities: true

  terraform-validation:
    needs: security-scan  # Must pass security scan first
    # ... rest of validation job

  plan:
    needs: [security-scan, terraform-validation]  # Depends on security scan
    # ... rest of plan job

  apply:
    needs: [security-scan, terraform-validation, plan]  # All jobs depend on security scan
    # ... rest of apply job
```

## Security Scan Configuration

### Input Parameters
The security scan workflow accepts the following parameters:

- `scan_paths`: Comma-separated paths to scan (default: '.')
- `fail_on_secrets`: Whether to fail the workflow if secrets are found (default: true)
- `fail_on_vulnerabilities`: Whether to fail the workflow if vulnerabilities are found (default: true)

### Output Parameters
- `secrets_found`: Boolean indicating whether secrets were detected
- `vulnerabilities_found`: Boolean indicating whether vulnerabilities were detected

## Security Tools Used

### Free Security Tools
1. **TruffleHog**: Detects verified secrets in code
2. **detect-secrets**: Python-based secret detection
3. **npm audit**: Node.js dependency vulnerability scanning
4. **govulncheck**: Go dependency vulnerability scanning
5. **ESLint**: Code quality and security linting
6. **go vet**: Go code analysis for security issues
7. **go test -race**: Race condition detection

### Custom Checks
1. **Environment File Detection**: Scans for `.env` files
2. **Terraform State Detection**: Prevents committing state files
3. **Hardcoded Secret Detection**: Regex-based scanning for secrets in code
4. **URL Credential Detection**: Finds URLs with embedded credentials
5. **Console.log Detection**: Identifies debugging code

## Security Scan Results

### Success Criteria
A security scan is considered successful when:
- No secrets are detected in the codebase
- No high-severity vulnerabilities are found in dependencies
- No environment files are committed
- No Terraform state files are committed
- No hardcoded credentials are found

### Failure Handling
When security scans fail:
1. **Deployment Blocked**: No deployment jobs will run
2. **Detailed Reporting**: Comprehensive error messages identify the issues
3. **Actionable Feedback**: Clear instructions on how to fix the issues
4. **Summary Report**: GitHub step summary with all scan results

## Security Best Practices

### Code Security
- Never commit `.env` files or environment variables
- Use environment variables for sensitive configuration
- Avoid hardcoding secrets, API keys, or passwords
- Use parameterized queries to prevent injection attacks
- Implement proper input validation

### Dependency Security
- Regularly update dependencies to patch vulnerabilities
- Use `npm audit` and `govulncheck` to scan for vulnerabilities
- Pin dependency versions for reproducible builds
- Monitor for known vulnerable packages

### Infrastructure Security
- Never commit Terraform state files
- Use IAM roles and least privilege access
- Implement proper secrets management
- Use HTTPS for all external communications
- Enable CloudTrail logging for audit trails

## Monitoring and Alerts

### Security Scan Notifications
- All security scan results are reported in GitHub step summaries
- Failed scans block deployments and provide detailed error messages
- Security issues are clearly identified with actionable remediation steps

### Deployment Status
- Security scan status is included in all deployment summaries
- Failed security scans are prominently displayed in notifications
- Success/failure status is tracked for all environments

## Troubleshooting

### Common Security Scan Failures

1. **Secrets Detected**
   - Remove any hardcoded secrets from code
   - Use environment variables instead
   - Check for accidentally committed credentials

2. **Vulnerable Dependencies**
   - Update packages to latest secure versions
   - Replace vulnerable packages with secure alternatives
   - Review dependency tree for unnecessary packages

3. **Environment Files**
   - Remove any `.env` files from the repository
   - Add `.env*` to `.gitignore`
   - Use GitHub Secrets for sensitive configuration

4. **Terraform State Files**
   - Remove any `.tfstate*` files from the repository
   - Add `*.tfstate*` to `.gitignore`
   - Use remote state storage (S3 + DynamoDB)

### Debugging Security Scans
- Check the security scan logs for detailed error messages
- Review the scan summary in GitHub Actions
- Use the security scan workflow locally for testing
- Consult the security tools documentation for specific issues

## Future Enhancements

### Planned Security Improvements
1. **SAST Integration**: Add static application security testing
2. **Container Scanning**: Scan Docker images for vulnerabilities
3. **Infrastructure Scanning**: Scan Terraform configurations for security issues
4. **Compliance Checks**: Add compliance scanning for industry standards
5. **Custom Rules**: Implement organization-specific security rules

### Security Tool Updates
- Regular updates to security tool versions
- Integration with additional free security tools
- Custom security rule development
- Automated security policy enforcement

## Conclusion

This security scanning setup ensures that all deployments are secure and compliant with best practices. By integrating security scanning as a prerequisite for all deployment workflows, we maintain a high security standard while using only free, open-source tools.

The comprehensive scanning covers secrets detection, vulnerability assessment, and code quality checks, providing a robust security foundation for your infrastructure and applications. 