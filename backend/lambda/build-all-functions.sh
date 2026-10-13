#!/bin/bash

# Build the API container image for the specified environment and push it to the
# Scaleway Container Registry (rg.<region>.scw.cloud).
ENVIRONMENT=${1:-"dev"}

# Function to display usage
usage() {
    echo "Usage: $0 [environment]"
    echo "  environment: dev or live (default: dev)"
    echo ""
    echo "Examples:"
    echo "  $0                 # Build and push the API image for dev"
    echo "  $0 live            # Build and push the API image for live"
    echo ""
    echo "Note: This script builds the API container and pushes it to the Scaleway"
    echo "      Container Registry. Set SCW_SECRET_KEY (and optionally SCW_REGION)"
    echo "      before running. The registry namespace is created by Terraform."
    echo ""
    echo "You can also run: $0 -h | --help | help"
}

# Support help flag/command
if [[ "$ENVIRONMENT" == "-h" || "$ENVIRONMENT" == "--help" || "$ENVIRONMENT" == "help" ]]; then
    usage
    exit 0
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|live)$ ]]; then
    echo "❌ Error: Invalid environment '$ENVIRONMENT'"
    echo ""
    echo "Valid environments: dev, live"
    echo ""
    usage
    exit 1
fi

# Check if Docker is available and running
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    echo "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker daemon is not running"
    echo ""
    echo "Please start Docker Desktop and wait for it to be ready."
    echo "On Windows, you can start it from the Start menu or system tray."
    echo ""
    echo "To verify Docker is running, try: docker info"
    exit 1
fi

# Scaleway registry settings
SCW_REGION=${SCW_REGION:-"fr-par"}
REGISTRY="rg.${SCW_REGION}.scw.cloud"
NAMESPACE="slay-drip-${ENVIRONMENT}"
IMAGE_NAME="api"
IMAGE_URI="${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:latest"

if [ -z "$SCW_SECRET_KEY" ]; then
    echo "❌ Error: SCW_SECRET_KEY is not set"
    echo "   Export a Scaleway IAM API secret key with registry access."
    exit 1
fi

echo "🏗️  Building API container for environment: $ENVIRONMENT"
echo ""
echo "📍 Scaleway Region: $SCW_REGION"
echo "📍 Registry namespace: $NAMESPACE"
echo ""

# Build image
echo "🔨 Building $IMAGE_NAME..."
docker build \
    -f Dockerfile.template \
    -t "${NAMESPACE}/${IMAGE_NAME}:latest" \
    .

docker tag "${NAMESPACE}/${IMAGE_NAME}:latest" "$IMAGE_URI"

# Login to the Scaleway Container Registry (username is ignored, secret key is the password)
echo "   Logging in to Scaleway Container Registry..."
echo "$SCW_SECRET_KEY" | docker login "$REGISTRY" --username nologin --password-stdin

# Push image
echo "   Pushing $IMAGE_URI..."
docker push "$IMAGE_URI"

echo ""
echo "🎉 API container built and pushed successfully!"
echo ""
echo "📋 Summary:"
echo "   Environment: $ENVIRONMENT"
echo "   Image: $IMAGE_URI"
echo ""
echo "🔗 Next steps:"
echo "   1. Deploy infrastructure with Terraform (terraform/)"
echo "   2. Or redeploy the existing container: see .github/workflows/deploy-lambda-containers.yml"
echo ""
