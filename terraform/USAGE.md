# Terraform Scripts Usage Guide

## 🚀 Quick Commands

### Windows (PowerShell)
```powershell
# Plan changes
.\plan.ps1 -Environment development
.\plan.ps1 -Environment staging
.\plan.ps1 -Environment production

# Apply changes
.\apply.ps1 -Environment development
.\apply.ps1 -Environment staging
.\apply.ps1 -Environment production

# Destroy resources
.\destroy.ps1 -Environment development
.\destroy.ps1 -Environment staging
.\destroy.ps1 -Environment production

# Setup GitHub Actions OIDC
.\setup-github-actions.ps1
```

### Linux/macOS (Bash)
```bash
# Make scripts executable (first time only)
chmod +x *.sh

# Plan changes
./plan.sh development
./plan.sh staging
./plan.sh production

# Apply changes
./apply.sh development
./apply.sh staging
./apply.sh production

# Destroy resources
./destroy.sh development
./destroy.sh staging
./destroy.sh production

# Setup GitHub Actions OIDC
./setup-github-actions.sh
```

## 📋 What Each Script Does

### Plan Scripts
- ✅ Validates environment parameter
- ✅ Initializes Terraform if needed
- ✅ Selects/creates workspace
- ✅ Runs `terraform plan -var="environment=X"`
- ✅ Saves plan to `{environment}.tfplan`

### Apply Scripts
- ✅ Checks for plan file existence
- ✅ Confirms before applying
- ✅ Applies the saved plan
- ✅ Shows outputs
- ✅ Cleans up plan file

### Destroy Scripts
- ✅ Double confirmation (type 'DESTROY')
- ✅ Shows destroy plan first
- ✅ Destroys all resources
- ✅ Cleans up plan file

## 🔧 Environment Variables

All scripts automatically set:
- `TF_VAR_environment` = your specified environment
- `AWS_REGION` = eu-central-1

## 🛡️ Safety Features

- ✅ **Environment validation** - Only accepts: development, staging, production
- ✅ **Confirmation prompts** - Prevents accidental applies/destroys
- ✅ **Plan file checking** - Ensures plan exists before apply
- ✅ **Workspace management** - Automatic workspace selection/creation
- ✅ **Error handling** - Clear error messages and exit codes

## 💡 Tips

1. **Always plan first**: `.\plan.ps1 -Environment development`
2. **Review the plan**: Check what will be created/modified/deleted
3. **Apply carefully**: `.\apply.ps1 -Environment development`
4. **Use development first**: Test changes before staging/production

## 🚨 Important Notes

- **Plan files are saved** as `{environment}.tfplan`
- **Plan files are cleaned up** after successful apply
- **Destroy requires typing 'DESTROY'** for extra safety
- **Workspaces are created automatically** if they don't exist 