# Quick Start: Deploy Frontend to AWS

This guide will get your React frontend deployed to AWS in under 10 minutes.

## Prerequisites

✅ **AWS CLI configured** with appropriate permissions  
✅ **Terraform installed** locally  
✅ **Node.js and npm** for building React app  

## Step 1: Deploy Infrastructure

```bash
# Navigate to terraform directory
cd terraform

# Initialize Terraform (first time only)
terraform init

# Plan the deployment
terraform plan

# Apply the infrastructure
terraform apply
```

This creates:
- S3 bucket for static website hosting
- CloudFront CDN distribution
- All necessary IAM policies

## Step 2: Deploy Frontend

```bash
# Make script executable
chmod +x deploy-frontend.sh

# Run the deployment script
./deploy-frontend.sh
```

## Step 3: Access Your App

After deployment, you'll see output like:
```
🎉 Deployment completed successfully!
🌐 Your app is available at: https://d1234567890abc.cloudfront.net
```

## What You Get

- **Global CDN**: CloudFront serves your app from edge locations worldwide
- **HTTPS**: Automatic SSL certificate
- **SPA Support**: Handles React Router routes properly
- **Caching**: Optimized cache settings for static assets
- **Cost**: ~$1-2/month for typical usage

## Next Steps

1. **Custom Domain**: Add Route 53 and custom SSL certificate
2. **CI/CD**: Set up GitHub Actions for automatic deployments
3. **Monitoring**: Add CloudWatch alarms and logging
4. **Security**: Enable WAF and additional security measures

## Troubleshooting

### Common Issues

**Build fails**: Check Node.js version and run `npm install`  
**Upload fails**: Verify AWS credentials with `aws sts get-caller-identity`  
**CloudFront not updating**: Wait 5-10 minutes or invalidate cache  

### Useful Commands

```bash
# Check S3 bucket contents
aws s3 ls s3://$(terraform output -raw frontend_bucket_name)/

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $(terraform output -raw frontend_cloudfront_distribution_id) --paths "/*"

# Check CloudFront status
aws cloudfront get-distribution --id $(terraform output -raw frontend_cloudfront_distribution_id)
```

## Cost Breakdown

- **S3 Storage**: ~$0.50/month for 1GB
- **CloudFront Transfer**: ~$0.50/month for 1GB
- **Total**: ~$1-2/month for typical usage

## Architecture

```
Internet → CloudFront CDN → S3 Bucket (Static Files)
```

Your React app is served globally with:
- **Fast loading** via CloudFront edge locations
- **Automatic HTTPS** with SSL certificates
- **SPA routing** support for React Router
- **Caching** for optimal performance 