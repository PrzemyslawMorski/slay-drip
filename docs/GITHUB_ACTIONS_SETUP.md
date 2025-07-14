# GitHub Actions Frontend Deployment Setup

This guide provides a complete setup for automated frontend deployment using GitHub Actions.

## 🎯 **What We're Building**

A complete CI/CD pipeline that:
- ✅ **Tests** your React app on every push
- ✅ **Builds** optimized production bundles
- ✅ **Deploys** to S3 with CloudFront CDN
- ✅ **Invalidates** cache for immediate updates
- ✅ **Supports** multiple environments (dev/staging/production)

## 📁 **Files Created**

```
.github/
├── workflows/
│   ├── deploy-frontend.yml          # Main workflow
│   └── README.md                    # Workflow documentation
scripts/
├── setup-github-actions.sh          # Linux/macOS setup script
└── setup-github-actions.ps1         # Windows PowerShell setup script
docs/
└── GITHUB_ACTIONS_SETUP.md          # This guide
```

## 🚀 **Quick Start (5 Minutes)**

### **Step 1: Run Setup Script**

**Windows (PowerShell):**
```powershell
.\scripts\setup-github-actions.ps1
```

**Linux/macOS:**
```bash
chmod +x scripts/setup-github-actions.sh
./scripts/setup-github-actions.sh
```

### **Step 2: Add GitHub Secrets**

1. Go to your repository → Settings → Secrets and variables → Actions
2. Add these secrets:
   - `AWS_ACCESS_KEY_ID` (from setup script)
   - `AWS_SECRET_ACCESS_KEY` (from setup script)

### **Step 3: Create GitHub Environments**

1. Go to Settings → Environments
2. Create three environments:
   - `development` (no protection rules)
   - `staging` (require reviewers)
   - `production` (require reviewers + wait timer)

### **Step 4: Deploy Infrastructure**

```bash
cd terraform
terraform init
terraform apply
```

### **Step 5: Trigger First Deployment**

```bash
git checkout develop
git add .
git commit -m "feat: add GitHub Actions workflow"
git push origin develop
```

## 🔧 **Workflow Features**

### **Multi-Environment Support**

| Branch/Trigger | Environment | Protection |
|----------------|-------------|------------|
| `develop` branch | Development | None |
| `main` branch | Staging | Reviewers |
| Manual trigger | Any | Configurable |

### **Smart Caching**

```yaml
# npm cache for faster builds
cache: 'npm'
cache-dependency-path: frontend/package-lock.json

# PWA-optimized cache headers
service-worker.js: no-cache
manifest.json: 1-hour cache
static assets: 1-year cache
```

### **PWA Optimization**

- **Service Worker**: No caching for immediate updates
- **Manifest**: 1-hour cache for controlled updates
- **Static Assets**: Long-term caching for performance
- **CloudFront**: Automatic cache invalidation

### **Security Features**

- **Environment Protection**: Require reviewers for staging/production
- **Secret Management**: Secure AWS credentials
- **Branch Protection**: Prevent direct pushes to main
- **Audit Trail**: Complete deployment history

## 📊 **Workflow Jobs**

### **1. Test Job**
```yaml
test:
  runs-on: ubuntu-latest
  steps:
    - Setup Node.js with caching
    - Install dependencies
    - Run tests with coverage
    - Run linting
```

### **2. Build Job**
```yaml
build:
  needs: test
  steps:
    - Build React app
    - Upload artifacts
    - Optimize for production
```

### **3. Deploy Jobs**
```yaml
deploy-dev:     # Automatic on develop branch
deploy-staging: # Automatic on main branch  
deploy-production: # Manual trigger only
```

### **4. Notify Job**
```yaml
notify:
  needs: [deploy-dev, deploy-staging, deploy-production]
  steps:
    - Generate deployment summary
    - Report success/failure
```

## 🎯 **Usage Examples**

### **Development Workflow**

```bash
# 1. Create feature branch
git checkout -b feature/new-component

# 2. Make changes
# ... edit files ...

# 3. Test locally
cd frontend
npm test
npm run build

# 4. Push to develop (auto-deploys to dev)
git checkout develop
git merge feature/new-component
git push origin develop
```

### **Production Deployment**

```bash
# 1. Merge to main (auto-deploys to staging)
git checkout main
git merge develop
git push origin main

# 2. Manual production deployment
# Go to Actions tab → Run workflow → Choose production
```

### **Emergency Rollback**

```bash
# 1. Revert to previous commit
git revert HEAD

# 2. Push to trigger re-deployment
git push origin main
```

## 🔍 **Monitoring & Debugging**

### **View Workflow Status**

1. Go to Actions tab in your repository
2. Click on "Deploy Frontend to S3"
3. View real-time logs and status

### **Common Issues & Solutions**

**Build Failures:**
```bash
# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Deployment Failures:**
```bash
# Test AWS credentials
aws sts get-caller-identity

# Check S3 bucket access
aws s3 ls s3://your-bucket-name/

# Verify CloudFront distribution
aws cloudfront list-distributions
```

**Cache Issues:**
```bash
# Manual cache invalidation
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### **Performance Monitoring**

```javascript
// Add to your React app for performance tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getFCP(console.log);
getLCP(console.log);
getTTFB(console.log);
```

## 🛠️ **Customization Options**

### **1. Change Node.js Version**

```yaml
# In .github/workflows/deploy-frontend.yml
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

### **4. Add Performance Testing**

```yaml
- name: Lighthouse CI
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

## 🔒 **Security Best Practices**

### **1. Use OIDC (Recommended)**

Instead of long-term AWS credentials:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/github-actions
    aws-region: us-east-1
```

### **2. Environment Protection**

- **Staging**: Require reviewers
- **Production**: Require reviewers + wait timer
- **Branch Protection**: Prevent direct pushes to main

### **3. Secret Rotation**

- Rotate AWS credentials quarterly
- Use temporary credentials when possible
- Monitor secret usage in GitHub

## 📈 **Cost Optimization**

### **Current Setup Costs**

| Component | Monthly Cost | Notes |
|-----------|-------------|-------|
| S3 Storage | ~$0.50 | 1GB storage |
| CloudFront | ~$85 | PriceClass_100 |
| GitHub Actions | ~$0 | Free tier (2000 min/month) |
| **Total** | **~$85.50** | |

### **Cost Reduction Options**

**Option 1: Cloudflare (Free)**
```bash
# Switch from CloudFront to Cloudflare
# Savings: $85/month
# Trade-off: Less AWS integration
```

**Option 2: S3 Website Only**
```bash
# Remove CloudFront entirely
# Savings: $85/month  
# Trade-off: No CDN, slower performance
```

**Option 3: Regional Restrictions**
```yaml
# Add geographic restrictions to CloudFront
restrictions:
  geo_restriction:
    restriction_type = "whitelist"
    locations = ["US", "CA", "GB", "DE", "FR"]
```

## 🎯 **Next Steps**

### **Immediate Improvements**

1. **Add Performance Monitoring**
   ```bash
   npm install @lhci/cli
   # Add to workflow for automated performance testing
   ```

2. **Set up Notifications**
   ```yaml
   # Add Slack/Discord webhooks
   SLACK_WEBHOOK_URL: your_webhook_url
   ```

3. **Add Bundle Analysis**
   ```bash
   npm install --save-dev webpack-bundle-analyzer
   # Add to build process
   ```

4. **Implement Blue-Green Deployments**
   ```yaml
   # Create multiple CloudFront distributions
   # Switch between them for zero-downtime updates
   ```

### **Advanced Features**

1. **Multi-Region Deployments**
   - Deploy to multiple AWS regions
   - Route traffic based on location

2. **A/B Testing Support**
   - Multiple CloudFront distributions
   - Traffic splitting capabilities

3. **Automated Testing**
   - E2E tests in deployment
   - Visual regression testing

4. **Rollback Capabilities**
   - Automatic rollback on failure
   - One-click rollback to previous version

## 📚 **Resources**

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)

## 🆘 **Support**

If you encounter issues:

1. **Check the logs** in GitHub Actions
2. **Verify AWS credentials** with the setup script
3. **Test locally** with the deployment script
4. **Review this guide** for common solutions

The workflow is designed to be robust and self-healing, but proper monitoring and testing are essential for production use. 