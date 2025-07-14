# GitHub Actions Frontend Deployment

This guide explains how to set up and use the automated frontend deployment workflow.

## 🚀 **Workflow Overview**

The workflow automatically builds and deploys your React frontend to AWS S3 with CloudFront CDN when you:

- **Push to `develop` branch** → Deploys to development environment
- **Push to `main` branch** → Deploys to staging environment  
- **Manual trigger** → Choose environment (dev/staging/production)

## 📋 **Prerequisites**

### **1. AWS Credentials**
You need AWS credentials with permissions for:
- S3 bucket access
- CloudFront invalidation
- Terraform state access

### **2. GitHub Secrets**
Set these secrets in your repository settings:

```bash
# Required secrets
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Optional secrets (for notifications)
SLACK_WEBHOOK_URL=your_slack_webhook
DISCORD_WEBHOOK_URL=your_discord_webhook
```

### **3. GitHub Environments**
Create environments in your repository:
- `development` (for dev deployments)
- `staging` (for staging deployments)  
- `production` (for production deployments)

## 🔧 **Setup Instructions**

### **Step 1: Configure AWS Credentials**

Create an IAM user with these permissions:

```json
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
        "terraform:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### **Step 2: Add GitHub Secrets**

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | AWS access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

### **Step 3: Create GitHub Environments**

1. Go to Settings → Environments
2. Create three environments:

**Development Environment:**
- Name: `development`
- Protection rules: None (or add branch restrictions)

**Staging Environment:**
- Name: `staging` 
- Protection rules: Require reviewers

**Production Environment:**
- Name: `production`
- Protection rules: Require reviewers + wait timer

## 🎯 **How to Use the Workflow**

### **Automatic Deployments**

**Development (develop branch):**
```bash
git checkout develop
git add .
git commit -m "feat: add new feature"
git push origin develop
# → Automatically deploys to development environment
```

**Staging (main branch):**
```bash
git checkout main
git merge develop
git push origin main
# → Automatically deploys to staging environment
```

### **Manual Deployments**

1. Go to Actions tab in your repository
2. Select "Deploy Frontend to S3" workflow
3. Click "Run workflow"
4. Choose environment: dev/staging/production
5. Click "Run workflow"

### **Pull Request Testing**

The workflow also runs on pull requests to `main` branch:
- Runs tests and builds
- Does NOT deploy (safety feature)
- Provides feedback on code quality

## 📊 **Workflow Jobs**

### **1. Test Job**
- ✅ Runs on every push and PR
- ✅ Installs dependencies
- ✅ Runs tests with coverage
- ✅ Runs linting
- ✅ Must pass before build

### **2. Build Job**
- ✅ Runs after tests pass
- ✅ Builds React app
- ✅ Uploads artifacts for deployment
- ✅ Optimized for production

### **3. Deploy Jobs**
- ✅ **deploy-dev**: Deploys to development
- ✅ **deploy-staging**: Deploys to staging
- ✅ **deploy-production**: Deploys to production
- ✅ Each job is environment-specific

### **4. Notify Job**
- ✅ Runs after all deployments
- ✅ Provides deployment summary
- ✅ Reports success/failure status

## 🔍 **Workflow Features**

### **Smart Caching**
```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: frontend/package-lock.json
```

### **PWA Optimization**
```bash
# Service worker: No caching for immediate updates
aws s3 cp service-worker.js s3://bucket/ \
  --cache-control "no-cache, no-store, must-revalidate"

# Manifest: 1-hour cache for controlled updates  
aws s3 cp manifest.json s3://bucket/ \
  --cache-control "max-age=3600"
```

### **CloudFront Cache Invalidation**
```bash
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

### **Environment-Specific Deployments**
```yaml
env:
  TF_VAR_environment: dev  # or staging/production
```

## 🛠️ **Customization Options**

### **1. Change Node.js Version**
```yaml
env:
  NODE_VERSION: '20'  # Change from '18'
```

### **2. Add Custom Build Commands**
```yaml
- name: Build application
  run: |
    npm run build
    npm run build:analyze  # Add bundle analysis
```

### **3. Add Slack Notifications**
```yaml
- name: Notify Slack
  if: always()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"Frontend deployment ${{ job.status }}\"}" \
      ${{ secrets.SLACK_WEBHOOK_URL }}
```

### **4. Add Performance Monitoring**
```yaml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

## 🚨 **Troubleshooting**

### **Common Issues**

**1. AWS Credentials Error:**
```bash
# Check if secrets are set correctly
# Verify IAM permissions
# Test with AWS CLI locally
```

**2. Terraform State Error:**
```bash
# Ensure Terraform state is initialized
# Check S3 bucket exists
# Verify environment variables
```

**3. Build Failures:**
```bash
# Check Node.js version compatibility
# Verify all dependencies are installed
# Check for TypeScript errors
```

**4. Deployment Failures:**
```bash
# Verify S3 bucket permissions
# Check CloudFront distribution exists
# Ensure proper cache invalidation
```

### **Debug Commands**

```bash
# Test AWS credentials
aws sts get-caller-identity

# Test S3 access
aws s3 ls s3://your-bucket-name/

# Test CloudFront access
aws cloudfront list-distributions

# Test Terraform
cd terraform
terraform init
terraform plan
```

## 📈 **Monitoring and Metrics**

### **Workflow Metrics**
- **Build time**: Track optimization opportunities
- **Deployment frequency**: Monitor team velocity
- **Failure rate**: Identify common issues
- **Cache hit rate**: Optimize CloudFront settings

### **Performance Monitoring**
```javascript
// Add to your React app
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🔒 **Security Best Practices**

### **1. Use OIDC (Recommended)**
Instead of long-term AWS credentials, use GitHub OIDC:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/github-actions
    aws-region: us-east-1
```

### **2. Environment Protection**
- Require reviewers for staging/production
- Add wait timers for production
- Use branch protection rules

### **3. Secret Rotation**
- Rotate AWS credentials regularly
- Use temporary credentials when possible
- Monitor secret usage

## 🎯 **Next Steps**

### **Immediate Improvements**
1. **Add performance monitoring** (Lighthouse CI)
2. **Set up Slack/Discord notifications**
3. **Add bundle analysis** for optimization
4. **Implement blue-green deployments**

### **Advanced Features**
1. **Multi-region deployments**
2. **A/B testing support**
3. **Rollback capabilities**
4. **Automated testing in deployment**

## 📚 **Resources**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/) 