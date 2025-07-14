# GitHub Actions Setup Script for Slay Drip Frontend Deployment
# PowerShell version for Windows

param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\setup-github-actions.ps1" -ForegroundColor Green
    Write-Host "This script sets up AWS credentials for GitHub Actions deployment" -ForegroundColor Yellow
    exit 0
}

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

Write-Host "🚀 GitHub Actions Setup for Slay Drip Frontend" -ForegroundColor $Blue
Write-Host ""

# Check if AWS CLI is installed
try {
    $awsVersion = aws --version 2>$null
    if (-not $awsVersion) {
        Write-Host "❌ AWS CLI is not installed. Please install it first:" -ForegroundColor $Red
        Write-Host "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" -ForegroundColor $Yellow
        exit 1
    }
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first:" -ForegroundColor $Red
    Write-Host "https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html" -ForegroundColor $Yellow
    exit 1
}

# Check if user is authenticated with AWS
try {
    $callerIdentity = aws sts get-caller-identity 2>$null
    if (-not $callerIdentity) {
        Write-Host "❌ AWS CLI is not configured. Please run:" -ForegroundColor $Red
        Write-Host "aws configure" -ForegroundColor $Yellow
        exit 1
    }
} catch {
    Write-Host "❌ AWS CLI is not configured. Please run:" -ForegroundColor $Red
    Write-Host "aws configure" -ForegroundColor $Yellow
    exit 1
}

Write-Host "✅ AWS CLI is configured" -ForegroundColor $Green

# Get current AWS account info
$accountId = aws sts get-caller-identity --query Account --output text 2>$null
$userArn = aws sts get-caller-identity --query Arn --output text 2>$null

Write-Host "📋 Current AWS Configuration:" -ForegroundColor $Blue
Write-Host "Account ID: $accountId"
Write-Host "User ARN: $userArn"
Write-Host ""

# Create IAM user for GitHub Actions
Write-Host "🔧 Creating IAM user for GitHub Actions..." -ForegroundColor $Yellow

$userName = "slay-drip-github-actions"
$policyName = "SlayDripFrontendDeployment"

# Create IAM user
try {
    aws iam create-user --user-name $userName 2>$null
    Write-Host "✅ Created IAM user: $userName" -ForegroundColor $Green
} catch {
    Write-Host "ℹ️  IAM user already exists: $userName" -ForegroundColor $Yellow
}

# Create policy document
$policyDocument = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::slay-drip-frontend-*",
        "arn:aws:s3:::slay-drip-frontend-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListInvalidations"
      ],
      "Resource": "arn:aws:cloudfront::*:distribution/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::terraform-state-*/*"
    }
  ]
}
"@

$policyDocument | Out-File -FilePath "frontend-deployment-policy.json" -Encoding UTF8

# Create policy
try {
    aws iam create-policy --policy-name $policyName --policy-document file://frontend-deployment-policy.json 2>$null
    Write-Host "✅ Created IAM policy: $policyName" -ForegroundColor $Green
} catch {
    Write-Host "ℹ️  IAM policy already exists: $policyName" -ForegroundColor $Yellow
}

# Attach policy to user
aws iam attach-user-policy --user-name $userName --policy-arn "arn:aws:iam::$accountId`:policy/$policyName" 2>$null

# Create access keys
Write-Host "🔑 Creating access keys..." -ForegroundColor $Yellow
$accessKeyOutput = aws iam create-access-key --user-name $userName 2>$null

# Parse JSON output (simplified for PowerShell)
$accessKeyId = ($accessKeyOutput | ConvertFrom-Json).AccessKey.AccessKeyId
$secretAccessKey = ($accessKeyOutput | ConvertFrom-Json).AccessKey.SecretAccessKey

Write-Host "✅ IAM user and access keys created successfully" -ForegroundColor $Green
Write-Host ""

# Display GitHub setup instructions
Write-Host "📝 GitHub Repository Setup Instructions:" -ForegroundColor $Blue
Write-Host ""
Write-Host "1. Go to your GitHub repository: https://github.com/YOUR_USERNAME/slay-drip"
Write-Host ""
Write-Host "2. Navigate to Settings → Secrets and variables → Actions"
Write-Host ""
Write-Host "3. Add these repository secrets:"
Write-Host ""
Write-Host "AWS_ACCESS_KEY_ID:" -ForegroundColor $Yellow
Write-Host "$accessKeyId"
Write-Host ""
Write-Host "AWS_SECRET_ACCESS_KEY:" -ForegroundColor $Yellow
Write-Host "$secretAccessKey"
Write-Host ""
Write-Host "4. Create GitHub Environments:"
Write-Host "   - Go to Settings → Environments"
Write-Host "   - Create: development, staging, production"
Write-Host ""
Write-Host "5. For production environment, add protection rules:"
Write-Host "   - Require reviewers"
Write-Host "   - Add wait timer (optional)"
Write-Host ""

# Test the credentials
Write-Host "🧪 Testing AWS credentials..." -ForegroundColor $Yellow
$env:AWS_ACCESS_KEY_ID = $accessKeyId
$env:AWS_SECRET_ACCESS_KEY = $secretAccessKey

try {
    $testResult = aws sts get-caller-identity 2>$null
    if ($testResult) {
        Write-Host "✅ AWS credentials work correctly" -ForegroundColor $Green
    } else {
        Write-Host "❌ AWS credentials test failed" -ForegroundColor $Red
    }
} catch {
    Write-Host "❌ AWS credentials test failed" -ForegroundColor $Red
}

# Clean up temporary files
Remove-Item -Path "frontend-deployment-policy.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor $Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor $Blue
Write-Host "1. Add the secrets to your GitHub repository"
Write-Host "2. Create the GitHub environments"
Write-Host "3. Push to the develop branch to trigger your first deployment"
Write-Host ""
Write-Host "⚠️  Important: Keep these credentials secure!" -ForegroundColor $Yellow
Write-Host "The access keys are shown above. Store them safely." 