# GitHub Actions OIDC Provider and IAM Role
# This allows GitHub Actions to authenticate with AWS without storing long-lived credentials

# GitHub Actions OIDC Provider (create if not exists, otherwise reference existing)
resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"
  
  client_id_list = ["sts.amazonaws.com"]
  
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]
  
  tags = {
    Name        = "github-actions-oidc-provider"
    Environment = "global"
    Purpose     = "GitHub Actions OIDC authentication"
  }
  
  # Use lifecycle to ignore changes to tags and other attributes
  lifecycle {
    ignore_changes = [
      tags,
      tags_all
    ]
  }
}

# IAM Role for GitHub Actions (environment-specific)
resource "aws_iam_role" "github_actions" {
  name = "${var.app_name}-github-actions-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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
      }
    ]
  })

  tags = {
    Name        = "${var.app_name}-github-actions-role-${var.environment}"
    Environment = var.environment
    Purpose     = "GitHub Actions authentication"
  }
}

# IAM Policy for GitHub Actions (environment-specific permissions)
resource "aws_iam_role_policy" "github_actions" {
  name = "${var.app_name}-github-actions-policy-${var.environment}"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat([
      # S3 permissions for frontend deployment (environment-specific)
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy"
        ]
        Resource = [
          aws_s3_bucket.frontend_bucket.arn,
          "${aws_s3_bucket.frontend_bucket.arn}/*"
        ]
      },
      # S3 permissions for Terraform backend (state management)
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::slay-drip-tfstate",
          "arn:aws:s3:::slay-drip-tfstate/*"
        ]
      },
      # DynamoDB permissions for Terraform state locking
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem"
        ]
        Resource = "arn:aws:dynamodb:eu-central-1:*:table/slay-drip-tfstate-lock"
      },
      # CloudFront permissions for cache invalidation (environment-specific)
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations"
        ]
        Resource = aws_cloudfront_distribution.frontend_distribution.arn
      },
      # IAM permissions for reading existing resources
      {
        Effect = "Allow"
        Action = [
          "sts:GetCallerIdentity",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:GetOpenIDConnectProvider",
          "iam:ListOpenIDConnectProviders"
        ]
        Resource = "*"
      }
    ],
    # Additional permissions based on environment
    var.environment == "production" ? [
      # Production-specific permissions (if needed)
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "*"
      }
    ] : [],
    # Development/Staging permissions
    var.environment != "production" ? [
      # Additional debugging permissions for non-production
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketVersioning",
          "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig"
        ]
        Resource = "*"
      }
    ] : []
    )
  })
}

# Output the role ARN for GitHub Secrets
output "github_actions_role_arn" {
  description = "ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_actions.arn
}

# Output the OIDC provider ARN
output "github_actions_oidc_provider_arn" {
  description = "ARN of the GitHub Actions OIDC provider"
  value       = aws_iam_openid_connect_provider.github_actions.arn
} 