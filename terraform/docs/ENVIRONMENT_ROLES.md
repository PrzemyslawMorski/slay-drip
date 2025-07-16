# Environment-Specific IAM Roles for GitHub Actions

This document explains the environment-specific IAM role setup for secure GitHub Actions authentication.

## Architecture Overview

Instead of a single shared role, we now create **separate IAM roles for each environment**:

- `slay-drip-github-actions-role-development`
- `slay-drip-github-actions-role-staging` 
- `slay-drip-github-actions-role-production`

## Benefits of Environment-Specific Roles

### 🔒 Security Isolation
- **Development** can only access development resources
- **Staging** can only access staging resources  
- **Production** can only access production resources
- **No cross-environment access** - prevents accidental production deployments

### 🎯 Granular Permissions
- **Development**: Basic deployment + debugging permissions
- **Staging**: Standard deployment permissions
- **Production**: Deployment + monitoring + logging permissions

### 📊 Audit Trail
- Clear separation of which environment performed which actions
- Environment-specific CloudTrail logs
- Better compliance and security monitoring

## Role Permissions by Environment

### Development Role
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket",
    "cloudfront:CreateInvalidation", "cloudfront:GetInvalidation",
    "s3:GetBucketVersioning", "cloudfront:GetDistribution", "cloudfront:GetDistributionConfig"
  ]
}
```

### Staging Role
```json
{
  "Effect": "Allow", 
  "Action": [
    "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket",
    "cloudfront:CreateInvalidation", "cloudfront:GetInvalidation",
    "s3:GetBucketVersioning", "cloudfront:GetDistribution", "cloudfront:GetDistributionConfig"
  ]
}
```

### Production Role
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket", 
    "cloudfront:CreateInvalidation", "cloudfront:GetInvalidation",
    "cloudwatch:PutMetricData", "logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"
  ]
}
```

## GitHub Secrets Setup

You'll need to add **three separate secrets** to your GitHub repository:

| Secret Name | Description | Used By |
|-------------|-------------|---------|
| `AWS_ROLE_ARN_DEVELOPMENT` | Development environment role ARN | `deploy-development` job |
| `AWS_ROLE_ARN_STAGING` | Staging environment role ARN | `deploy-staging` job |
| `AWS_ROLE_ARN_PRODUCTION` | Production environment role ARN | `deploy-production` job |

## Workflow Configuration

The GitHub Actions workflow automatically uses the correct role for each environment:

```yaml
# Development deployment
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN_DEVELOPMENT }}
    aws-region: ${{ env.AWS_REGION }}

# Staging deployment  
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN_STAGING }}
    aws-region: ${{ env.AWS_REGION }}

# Production deployment
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: ${{ secrets.AWS_ROLE_ARN_PRODUCTION }}
    aws-region: ${{ env.AWS_REGION }}
```

## Deployment Process

### 1. Deploy Infrastructure
```powershell
cd terraform
.\setup-github-actions.ps1
```

### 2. Add GitHub Secrets
The script will output the role ARNs for each environment. Add them to GitHub:

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add each secret with the exact names shown in the script output

### 3. Test Deployments
- **Development**: Push to `develop` branch
- **Staging**: Push to `main` branch  
- **Production**: Use manual workflow dispatch

## Security Benefits

### 🛡️ Principle of Least Privilege
- Each role has only the permissions it needs
- No unnecessary access to other environments
- Reduced attack surface

### 🔍 Better Monitoring
- Environment-specific CloudTrail logs
- Clear audit trail of which environment performed actions
- Easier compliance reporting

### 🚨 Incident Response
- If one environment is compromised, others remain secure
- Easier to isolate and contain issues
- Environment-specific rollback capabilities

## Migration from Single Role

If you're migrating from a single shared role:

1. **Deploy the new environment-specific roles** using the setup script
2. **Add the new GitHub secrets** (`AWS_ROLE_ARN_DEVELOPMENT`, etc.)
3. **Test each environment** to ensure it works correctly
4. **Remove the old single role** once everything is working
5. **Delete the old GitHub secret** (`AWS_ROLE_ARN`)

## Troubleshooting

### Common Issues

1. **"Role not found" errors**
   - Ensure you're using the correct role ARN for each environment
   - Check that the Terraform workspaces are set up correctly

2. **"Access denied" errors**
   - Verify the role has the correct permissions for that environment
   - Check that the S3 bucket and CloudFront distribution exist

3. **"Invalid role ARN" errors**
   - Ensure the role ARN format is correct
   - Check that the role exists in the correct AWS account

### Debugging Commands

```bash
# Check which role is being used
aws sts get-caller-identity

# Check role permissions
aws iam get-role --role-name slay-drip-github-actions-role-development

# List attached policies
aws iam list-attached-role-policies --role-name slay-drip-github-actions-role-development
```

## Best Practices

### 1. Regular Auditing
- Review role permissions quarterly
- Remove unused permissions
- Monitor CloudTrail logs for unusual activity

### 2. Permission Management
- Start with minimal permissions
- Add permissions only when needed
- Document why each permission is required

### 3. Environment Parity
- Keep permissions as similar as possible across environments
- Only add production-specific permissions when necessary
- Test changes in development/staging first

This setup provides enterprise-grade security with proper environment isolation while maintaining operational simplicity. 