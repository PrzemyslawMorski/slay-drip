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
      # S3 permissions for bucket management and deployment
      {
        Effect = "Allow"
        Action = [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy",
          "s3:GetBucketAcl",
          "s3:PutBucketAcl",
          "s3:GetBucketCors",
          "s3:PutBucketCors",
          "s3:DeleteBucketCors",
          "s3:GetBucketWebsite",
          "s3:PutBucketWebsite",
          "s3:DeleteBucketWebsite",
          "s3:GetBucketAccelerateConfiguration",
          "s3:PutBucketAccelerateConfiguration",
          "s3:GetAccelerateConfiguration",
          "s3:GetBucketRequestPayment",
          "s3:PutBucketRequestPayment",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning",
          "s3:GetBucketLifecycle",
          "s3:PutBucketLifecycle",
          "s3:GetBucketEncryption",
          "s3:PutBucketEncryption",
          "s3:DeleteBucketEncryption",
          "s3:GetEncryptionConfiguration",
          "s3:PutEncryptionConfiguration",
          "s3:GetBucketReplication",
          "s3:PutBucketReplication",
          "s3:DeleteBucketReplication",
          "s3:GetReplicationConfiguration",
          "s3:PutReplicationConfiguration",
          "s3:GetBucketLogging",
          "s3:PutBucketLogging",
          "s3:GetBucketNotification",
          "s3:PutBucketNotification",
          "s3:GetBucketTagging",
          "s3:PutBucketTagging",
          "s3:GetBucketLifecycleConfiguration",
          "s3:GetLifecycleConfiguration",
          "s3:PutLifecycleConfiguration",
          "s3:GetBucketObjectLockConfiguration",
          "s3:GetObjectRetention",
          "s3:PutObjectRetention",
          "s3:GetObjectLegalHold",
          "s3:PutObjectLegalHold",
          "s3:GetBucketPolicyStatus",
          "s3:GetBucketPublicAccessBlock",
          "s3:PutBucketPublicAccessBlock",
          "s3:DeleteBucketPublicAccessBlock",
          "s3:GetBucketLocation",
          "s3:GetBucketOwnershipControls"
        ]
        Resource = [
          "arn:aws:s3:::${var.app_name}-frontend-${var.environment}",
          "arn:aws:s3:::${var.app_name}-frontend-${var.environment}/*",
          "arn:aws:s3:::${var.app_name}-lambda-deployment-${var.environment}",
          "arn:aws:s3:::${var.app_name}-lambda-deployment-${var.environment}/*"
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
      # Lambda deployment permissions
      {
        Effect = "Allow"
        Action = [
          "lambda:CreateFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:DeleteFunction",
          "lambda:GetFunction",
          "lambda:ListFunctions",
          "lambda:ListVersionsByFunction",
          "lambda:ListAliases",
          "lambda:AddPermission",
          "lambda:RemovePermission",
          "lambda:GetPolicy",
          "lambda:PutFunctionConcurrency",
          "lambda:DeleteFunctionConcurrency",
          "lambda:GetFunctionConcurrency",
          "lambda:GetFunctionConfiguration",
          "lambda:GetFunctionEventInvokeConfig",
          "lambda:GetFunctionUrlConfig",
          "lambda:GetFunctionCodeSigningConfig",
          "lambda:TagResource",
        ]
        Resource = [
          "arn:aws:lambda:${var.aws_region}:*:function:${var.app_name}-*"
        ]
      },
      # IAM permissions for Lambda roles
      {
        Effect = "Allow"
        Action = [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PassRole"
        ]
        Resource = [
          "arn:aws:iam::*:role/${var.app_name}-*"
        ]
      },
      # CloudWatch Logs for Lambda
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DeleteLogGroup"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/lambda/${var.app_name}-*"
        ]
      },
      # DynamoDB permissions for backend data (full access for Terraform management)
      {
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:DescribeTimeToLive",
          "dynamodb:UpdateTimeToLive",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:CreateTable",
          "dynamodb:DeleteTable",
          "dynamodb:DescribeContinuousBackups",
          "dynamodb:UpdateContinuousBackups",
          "dynamodb:UpdateTable",
          "dynamodb:UpdateContinuousBackups",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:TagResource",
          "dynamodb:UntagResource",
          "dynamodb:ListTagsOfResource",
          "dynamodb:ListTables",
          "dynamodb:ListBackups",
          "dynamodb:ListStreams",
          "dynamodb:ListTagsOfResource",
          "dynamodb:ListTagsOfResource",
          "dynamodb:ListGlobalTables",
          "dynamodb:ListExports",
          "dynamodb:ListImports"
        ]
        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.app_name}-*",
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.app_name}-*/index/*",
          "arn:aws:dynamodb:${var.aws_region}:*:table/${var.app_name}-*/backup/*"
        ]
      },
      # API Gateway permissions
      {
        Effect = "Allow"
        Action = [
          "apigateway:*"
        ]
        Resource = [
          "arn:aws:apigateway:${var.aws_region}::/restapis/*"
        ]
      },
      # CloudFront permissions for cache invalidation (environment-specific)
      {
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation",
          "cloudfront:GetInvalidation",
          "cloudfront:ListInvalidations",
          "cloudfront:GetDistribution",
          "cloudfront:GetDistributionConfig",
          "cloudfront:UpdateDistribution",
          "cloudfront:DeleteDistribution",
          "cloudfront:ListDistributions",
          "cloudfront:ListTagsForResource",
          "cloudfront:TagResource",
          "cloudfront:UntagResource"
        ]
        Resource = "arn:aws:cloudfront::*:distribution/*"
      },
      # IAM permissions for reading existing resources
      {
        Effect = "Allow"
        Action = [
          "sts:GetCallerIdentity",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:GetOpenIDConnectProvider",
          "iam:ListOpenIDConnectProviders",
          "iam:ListAttachedRolePolicies"
        ]
        Resource = "*"
      },
      # ECR permissions for Docker image management
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:CreateRepository",
          "ecr:DeleteRepository",
          "ecr:DescribeRepositories",
          "ecr:ListImages",
          "ecr:DescribeImages",
          "ecr:BatchDeleteImage",
          "ecr:GetLifecyclePolicy",
          "ecr:PutLifecyclePolicy",
          "ecr:DeleteLifecyclePolicy",
          "ecr:GetRepositoryPolicy",
          "ecr:SetRepositoryPolicy",
          "ecr:DeleteRepositoryPolicy",
          "ecr:TagResource",
          "ecr:UntagResource",
          "ecr:ListTagsForResource"
        ]
        Resource = [
          "arn:aws:ecr:${var.aws_region}:*:repository/${var.app_name}-*",
          "arn:aws:ecr:${var.aws_region}:*:repository/${var.app_name}-*/*"
        ]
      },
      # ECR registry permissions
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:DescribeRegistry",
          "ecr:GetRegistryPolicy",
          "ecr:PutRegistryPolicy",
          "ecr:DeleteRegistryPolicy",
          "ecr:GetRegistryScanningConfiguration",
          "ecr:PutRegistryScanningConfiguration",
          "ecr:PutReplicationConfiguration",
          "ecr:GetReplicationConfiguration",
          "ecr:DeleteReplicationConfiguration"
        ]
        Resource = "*"
      }
      ],
      # Additional permissions based on environment
      var.environment == "live" ? [
        # Live environment permissions (production-like)
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
      # Development environment permissions
      var.environment == "dev" ? [
        # Additional debugging permissions for development
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
