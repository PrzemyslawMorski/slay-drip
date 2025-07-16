# GitHub Actions OIDC Authentication Setup

This document explains how to set up secure authentication between GitHub Actions and AWS using OpenID Connect (OIDC).

## What is OIDC?

OpenID Connect (OIDC) allows GitHub Actions to authenticate with AWS without storing long-lived credentials. Instead of using access keys, GitHub Actions can assume an IAM role using temporary credentials.

## Benefits

- ✅ **No long-lived credentials** - No need to store AWS access keys in GitHub secrets
- ✅ **Automatic credential rotation** - Credentials are automatically rotated
- ✅ **Principle of least privilege** - Role can have minimal required permissions
- ✅ **Audit trail** - All actions are logged with the GitHub repository context
- ✅ **Security** - Reduces risk of credential exposure

## Setup Instructions

### 1. Deploy the OIDC Resources

Run the setup script from the terraform directory:

```bash
# For Linux/macOS
cd terraform
./setup-github-actions.sh

# For Windows PowerShell
cd terraform
.\setup-github-actions.ps1
```

### 2. Add GitHub Secret

After running the script, you'll get a role ARN. Add it to your GitHub repository:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `AWS_ROLE_ARN`
5. Value: The ARN from the script output

**Note:** If you need different roles per environment, you can override this secret at the environment level in GitHub.

### 3. Update GitHub Workflow

The workflow is already configured to use OIDC. The `aws-actions/configure-aws-credentials@v4` action will automatically use the role ARN from the secret.

## How It Works

### 1. GitHub Actions OIDC Provider

```hcl
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
}
```

This creates a trust relationship with GitHub's OIDC provider.

### 2. IAM Role

```hcl
resource "aws_iam_role" "github_actions" {
  assume_role_policy = jsonencode({
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github_actions.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
        }
      }
    }]
  })
}
```

This role can only be assumed by GitHub Actions from your specific repository.

### 3. IAM Policy

The policy grants minimal required permissions:

- **S3**: Upload/download frontend files
- **CloudFront**: Create cache invalidations
- **Terraform**: Access to state files (if using S3 backend)

## Security Features

### Repository Scoping

The role can only be assumed by GitHub Actions from your specific repository:

```hcl
"token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
```

### Minimal Permissions

The policy grants only the permissions needed for deployment:

```hcl
# S3 permissions for frontend deployment
{
  Effect = "Allow"
  Action = [
    "s3:GetObject",
    "s3:PutObject", 
    "s3:DeleteObject",
    "s3:ListBucket"
  ]
  Resource = [
    aws_s3_bucket.frontend_bucket.arn,
    "${aws_s3_bucket.frontend_bucket.arn}/*"
  ]
}
```

### Temporary Credentials

GitHub Actions automatically gets temporary credentials that expire after the workflow run.

## Troubleshooting

### Common Issues

1. **"Credentials could not be loaded"**
   - Ensure `AWS_ROLE_ARN` secret is set correctly
   - Check that the role ARN is valid

2. **"Access Denied" errors**
   - Verify the IAM policy grants required permissions
   - Check that the role trust policy allows your repository

3. **"Invalid identity token"**
   - Ensure the OIDC provider thumbprints are correct
   - Check that the repository name in the trust policy matches

### Debugging

Add this step to your workflow for debugging:

```yaml
- name: Debug AWS Identity
  run: |
    aws sts get-caller-identity
    aws iam get-role --role-name $(aws sts get-caller-identity --query 'Arn' --output text | cut -d'/' -f2)
```

## Migration from Access Keys

If you're currently using access keys:

1. **Deploy the OIDC resources** using the setup script
2. **Add the `AWS_ROLE_ARN` secret** to GitHub
3. **Remove the old access key secrets** (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
4. **Test the workflow** to ensure it works with OIDC
5. **Delete the old IAM user** (if no longer needed)

## Best Practices

### 1. Use Environment-Specific Roles

For production environments, consider creating separate roles with different permission levels.

### 2. Regular Auditing

Periodically review the IAM policy to ensure it only grants necessary permissions.

### 3. Monitor Usage

Set up CloudTrail to monitor role assumption and API calls.

### 4. Rotate Regularly

While OIDC doesn't require manual rotation, regularly review and update the trust policy and permissions.

## References

- [GitHub Actions OIDC Documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS OIDC Provider Documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs) 