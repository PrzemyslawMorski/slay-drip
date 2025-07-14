# Frontend Deployment Guide

This guide walks you through deploying your React frontend to AWS using Terraform.

## 🎯 What We're Building

```
Internet → CloudFront CDN → S3 Bucket (React App)
```

## 📋 Prerequisites

- ✅ **AWS CLI** configured with appropriate permissions
- ✅ **Terraform** installed locally
- ✅ **Node.js and npm** for building React app
- ✅ **Git** for version control

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Environment

```bash
# Clone your repository
git clone <your-repo-url>
cd slay-drip

# Navigate to terraform directory
cd terraform
```

### Step 2: Deploy Infrastructure

```bash
# Initialize Terraform (first time only)
terraform init

# Review the deployment plan
terraform plan

# Apply the infrastructure
terraform apply
```

**What this creates:**
- S3 bucket for static website hosting
- CloudFront distribution with HTTPS
- All necessary IAM policies and configurations

### Step 3: Deploy Your Frontend

**Option A: Automated Deployment (Recommended)**

```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

**Option B: Manual Deployment**

```bash
# Build the React app
cd ../frontend
npm install
npm run build

# Get bucket name from Terraform
cd ../terraform
BUCKET_NAME=$(terraform output -raw frontend_bucket_name)

# Upload to S3
aws s3 sync ../frontend/build/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $(terraform output -raw frontend_cloudfront_distribution_id) --paths "/*"
```

### Step 4: Access Your App

After deployment, you'll see output like:
```
🎉 Deployment completed successfully!
🌐 Your app is available at: https://d1234567890abc.cloudfront.net
```

## 🔧 Configuration Options

### Environment Variables

You can customize the deployment by setting these variables:

```bash
# Set custom values
export TF_VAR_app_name="my-app"
export TF_VAR_environment="production"
export TF_VAR_aws_region="us-west-2"

# Then run terraform apply
terraform apply
```

### Custom Domain (Optional)

To use a custom domain:

1. **Add Route 53 hosted zone**
2. **Request SSL certificate** in ACM
3. **Update CloudFront distribution** with custom domain
4. **Update DNS records**

## 📊 Monitoring and Maintenance

### Check Deployment Status

```bash
# Verify S3 bucket contents
aws s3 ls s3://$(terraform output -raw frontend_bucket_name)/

# Check CloudFront distribution
aws cloudfront get-distribution --id $(terraform output -raw frontend_cloudfront_distribution_id)

# View CloudFront metrics
aws cloudwatch get-metric-statistics --namespace AWS/CloudFront --metric-name Requests
```

### Update Your App

To deploy updates:

```bash
# Simply run the deployment script again
./deploy-frontend.sh
```

### Cache Management

```bash
# Invalidate CloudFront cache (if needed)
aws cloudfront create-invalidation \
  --distribution-id $(terraform output -raw frontend_cloudfront_distribution_id) \
  --paths "/*"
```

## 🛠️ Troubleshooting

### Common Issues

**Build fails:**
```bash
# Check Node.js version
node --version

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Upload fails:**
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Check S3 permissions
aws s3 ls s3://$(terraform output -raw frontend_bucket_name)/
```

**CloudFront not updating:**
- Wait 5-10 minutes for cache propagation
- Invalidate cache manually
- Check CloudFront distribution status

### Useful Commands

```bash
# View Terraform outputs
terraform output

# Check infrastructure status
terraform show

# Destroy infrastructure (if needed)
terraform destroy

# View CloudFront logs
aws logs describe-log-groups --log-group-name-prefix CloudFront
```

## 💰 Cost Breakdown

**Monthly costs for typical usage:**
- **S3 Storage** (1GB): ~$0.50
- **CloudFront Transfer** (1GB): ~$0.50
- **Total**: ~$1-2/month

**Cost optimization tips:**
- Use CloudFront caching effectively
- Compress assets before upload
- Monitor usage with CloudWatch

## 🔒 Security Features

### Built-in Security
- **HTTPS enforcement** - All traffic encrypted
- **Origin protection** - S3 bucket not directly accessible
- **CORS headers** - Controlled cross-origin access
- **Cache security** - Proper cache headers for PWA

### Additional Security (Optional)
- **WAF** - Web Application Firewall
- **Custom SSL certificates** - For custom domains
- **Geographic restrictions** - Limit access by region

## 📈 Performance Optimization

### CloudFront Caching Strategy
| Asset Type | Cache Duration | Purpose |
|------------|----------------|---------|
| Static files | 1 year | CSS, JS, images |
| PWA manifest | 1 hour | Allow updates |
| Service worker | No cache | Immediate updates |
| HTML files | 1 hour | App updates |

### Performance Tips
- **Optimize images** before upload
- **Minify CSS/JS** in build process
- **Use CDN** for external libraries
- **Monitor Core Web Vitals**

## 🎯 Next Steps

### Immediate Improvements
1. **Set up CI/CD** - GitHub Actions for automatic deployment
2. **Add monitoring** - CloudWatch dashboards
3. **Custom domain** - Route 53 + SSL certificate
4. **Performance monitoring** - Real User Monitoring

### Advanced Features
1. **A/B testing** - Multiple CloudFront distributions
2. **Blue-green deployment** - Zero-downtime updates
3. **Backup strategy** - S3 versioning + lifecycle policies
4. **Multi-region** - Global distribution optimization

## 📚 Resources

- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [CloudFront Best Practices](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/best-practices.html)
- [S3 Static Website Hosting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

---

**Happy deploying! 🚀** 