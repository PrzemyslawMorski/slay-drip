# Terraform Infrastructure Management

This directory contains Terraform configurations and convenient scripts for managing your AWS infrastructure across multiple environments.

## 🚀 Quick Start

### Prerequisites
- [Terraform](https://www.terraform.io/downloads) (v1.0+)
- [AWS CLI](https://aws.amazon.com/cli/) configured
- Appropriate AWS permissions

### First Time Setup
```bash
# Initialize Terraform
terraform init

# Deploy GitHub Actions OIDC setup
.\setup-github-actions.ps1  # Windows
./setup-github-actions.sh   # Linux/macOS
```

## 📁 Scripts Overview

### PowerShell Scripts (Windows)
- `plan.ps1` - Plan Terraform changes
- `apply.ps1` - Apply Terraform changes
- `destroy.ps1` - Destroy Terraform resources
- `setup-github-actions.ps1` - Setup OIDC authentication

### Bash Scripts (Linux/macOS)
- `plan.sh` - Plan Terraform changes
- `apply.sh` - Apply Terraform changes
- `destroy.sh` - Destroy Terraform resources
- `setup-github-actions.sh` - Setup OIDC authentication

## 🔧 Usage

### Planning Changes
```powershell
# Windows
.\plan.ps1 -Environment development
.\plan.ps1 -Environment staging
.\plan.ps1 -Environment production

# Linux/macOS
./plan.sh development
./plan.sh staging
./plan.sh production
```

### Applying Changes
```powershell
# Windows
.\apply.ps1 -Environment development
.\apply.ps1 -Environment staging
.\apply.ps1 -Environment production

# Linux/macOS
./apply.sh development
./apply.sh staging
./apply.sh production
```

### Destroying Resources
```powershell
# Windows
.\destroy.ps1 -Environment development
.\destroy.ps1 -Environment staging
.\destroy.ps1 -Environment production

# Linux/macOS
./destroy.sh development
./destroy.sh staging
./destroy.sh production
```

## 🏗️ Infrastructure Components

### Frontend Infrastructure
- **S3 Bucket** - Static website hosting
- **CloudFront Distribution** - CDN and HTTPS
- **Route 53** - DNS management (if configured)

### GitHub Actions OIDC
- **OIDC Provider** - Trust relationship with GitHub
- **IAM Role** - Environment-specific roles with minimal permissions
- **IAM Policy** - Granular permissions for deployment

### Environment Isolation
Each environment has its own:
- S3 bucket: `slay-drip-frontend-{environment}`
- CloudFront distribution
- IAM role: `slay-drip-github-actions-role-{environment}`

## 🔒 Security Features

### OIDC Authentication
- ✅ No long-lived credentials stored in GitHub
- ✅ Repository-scoped access
- ✅ Temporary tokens (1 hour expiry)
- ✅ Environment-specific roles
- ✅ Minimal permissions principle

### Environment Isolation
- ✅ Development can't access staging/production
- ✅ Staging can't access development/production
- ✅ Production can't access development/staging

## 📊 Workspace Management

The scripts automatically manage Terraform workspaces:

```bash
# List workspaces
terraform workspace list

# Current workspace
terraform workspace show

# Switch workspace
terraform workspace select development
```

## 🔍 Troubleshooting

### Common Issues

1. **"Workspace not found"**
   ```bash
   # Create workspace
   terraform workspace new development
   ```

2. **"Access denied" errors**
   - Check AWS credentials: `aws sts get-caller-identity`
   - Verify permissions for the required AWS services

3. **"Plan file not found"**
   - Run the plan script first: `.\plan.ps1 -Environment development`

4. **"Invalid environment"**
   - Valid environments: `development`, `staging`, `production`

### Debugging Commands

```bash
# Check Terraform state
terraform show

# List all resources
terraform state list

# Validate configuration
terraform validate

# Check AWS credentials
aws sts get-caller-identity
```

## 🛠️ Manual Terraform Commands

If you prefer manual commands:

```bash
# Initialize
terraform init

# Plan
terraform plan -var="environment=development"

# Apply
terraform apply -var="environment=development"

# Destroy
terraform destroy -var="environment=development"
```

## 📋 Environment Variables

The scripts automatically set:
- `TF_VAR_environment` - Environment name (development/staging/production)
- `AWS_REGION` - AWS region (eu-central-1)

## 🔄 Workflow

### Typical Development Workflow
1. **Plan changes**: `.\plan.ps1 -Environment development`
2. **Review plan**: Check the output for expected changes
3. **Apply changes**: `.\apply.ps1 -Environment development`
4. **Verify deployment**: Check the outputs for URLs

### Production Deployment
1. **Plan changes**: `.\plan.ps1 -Environment production`
2. **Review carefully**: Production changes require extra attention
3. **Apply changes**: `.\apply.ps1 -Environment production`
4. **Monitor**: Check CloudWatch logs and metrics

## 📚 Documentation

- [GitHub Actions OIDC Setup](docs/GITHUB_ACTIONS_OIDC.md)
- [Environment-Specific Roles](docs/ENVIRONMENT_ROLES.md)
- [Frontend Deployment](docs/FRONTEND_DEPLOYMENT.md)

## 🚨 Important Notes

### Safety Features
- ✅ **Confirmation prompts** for destructive operations
- ✅ **Environment validation** to prevent mistakes
- ✅ **Plan files** saved for review before apply
- ✅ **Automatic cleanup** of plan files after apply

### Best Practices
- 🔍 **Always review plans** before applying
- 🔒 **Use least privilege** for IAM roles
- 📊 **Monitor deployments** in CloudWatch
- 🔄 **Test in development** before staging/production

### Cost Considerations
- 💰 **CloudFront** has usage-based pricing
- 💰 **S3** has storage and request costs
- 💰 **Route 53** has monthly hosting zone fees

## 🤝 Contributing

When modifying Terraform configurations:
1. **Plan first**: Always run `plan` before `apply`
2. **Test in development**: Deploy to development environment first
3. **Document changes**: Update relevant documentation
4. **Review security**: Ensure IAM permissions are minimal and appropriate
