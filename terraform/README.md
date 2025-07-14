# Frontend Deployment Infrastructure

This Terraform configuration deploys a React frontend to AWS with the following components:

## 🏗️ Infrastructure Components

- **S3 Bucket** - Static website hosting for React app
- **CloudFront Distribution** - Global CDN with HTTPS
- **PWA Support** - Optimized caching for service workers and manifests
- **SPA Routing** - Custom error responses for React Router

## 🚀 Quick Deployment

### 1. Deploy Infrastructure
```bash
cd terraform
terraform init
terraform plan
terraform apply
```

### 2. Deploy Frontend
```bash
chmod +x deploy-frontend.sh
./deploy-frontend.sh
```

## 📊 Outputs

After deployment, you'll get:
- S3 bucket name for direct access
- CloudFront URL for global distribution
- S3 website endpoint as fallback

## 💰 Cost

~$1-2/month for typical usage:
- S3 Storage: ~$0.50/month
- CloudFront Transfer: ~$0.50/month

## 🌐 Access Your App

Your React app will be available at the CloudFront URL provided in the deployment output.
