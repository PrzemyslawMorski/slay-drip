#!/bin/bash

# Frontend Build Script with Environment Configuration
# This script builds the frontend with environment-specific configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
API_GATEWAY_URL=""
BUILD_MODE="development"
OUTPUT_DIR="dist"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Build environment (development|production) [default: development]"
    echo "  -a, --api-url URL        API Gateway URL for production builds"
    echo "  -m, --mode MODE          Build mode (development|production) [default: development]"
    echo "  -o, --output DIR         Output directory [default: dist]"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment development"
    echo "  $0 --environment production --api-url https://abc123.execute-api.us-east-1.amazonaws.com/production"
    echo "  $0 -e production -a https://abc123.execute-api.us-east-1.amazonaws.com/production"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -a|--api-url)
            API_GATEWAY_URL="$2"
            shift 2
            ;;
        -m|--mode)
            BUILD_MODE="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_DIR="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
    exit 1
fi

# Validate API Gateway URL for production
if [[ "$ENVIRONMENT" == "production" && -z "$API_GATEWAY_URL" ]]; then
    print_error "API Gateway URL is required for production builds"
    echo "Example: $0 --environment production --api-url https://abc123.execute-api.us-east-1.amazonaws.com/production"
    exit 1
fi

# Validate build mode
if [[ "$BUILD_MODE" != "development" && "$BUILD_MODE" != "production" ]]; then
    print_error "Invalid build mode: $BUILD_MODE. Must be 'development' or 'production'"
    exit 1
fi

print_status "Building frontend for environment: $ENVIRONMENT"
print_status "Build mode: $BUILD_MODE"
if [[ "$ENVIRONMENT" == "production" ]]; then
    print_status "API Gateway URL: $API_GATEWAY_URL"
fi

# Create temporary environment configuration
TEMP_CONFIG_DIR="temp-config"
mkdir -p "$TEMP_CONFIG_DIR"

# Copy the template configuration
cp "src/config/environment.template.ts" "$TEMP_CONFIG_DIR/environment.ts"

# Replace placeholders based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    print_status "Replacing API Gateway URL placeholder with: $API_GATEWAY_URL"
    
    # Replace the placeholder with the actual API Gateway URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|__API_GATEWAY_URL__|$API_GATEWAY_URL|g" "$TEMP_CONFIG_DIR/environment.ts"
    else
        # Linux
        sed -i "s|__API_GATEWAY_URL__|$API_GATEWAY_URL|g" "$TEMP_CONFIG_DIR/environment.ts"
    fi
    
    # Verify replacement
    if grep -q "__API_GATEWAY_URL__" "$TEMP_CONFIG_DIR/environment.ts"; then
        print_error "Failed to replace API Gateway URL placeholder"
        exit 1
    fi
    
    print_success "API Gateway URL placeholder replaced successfully"
else
    print_status "Using development configuration (no URL replacement needed)"
fi

# Backup original environment file
if [[ -f "src/config/environment.ts" ]]; then
    cp "src/config/environment.ts" "src/config/environment.ts.backup"
    print_status "Backed up original environment configuration"
fi

# Replace the environment file with the temporary one
cp "$TEMP_CONFIG_DIR/environment.ts" "src/config/environment.ts"

# Build the frontend
print_status "Building frontend with Vite..."
if [[ "$BUILD_MODE" == "production" ]]; then
    npm run build:live
else
    npm run build:dev
fi

# Check if build was successful
if [[ $? -eq 0 ]]; then
    print_success "Frontend built successfully"
    
    # Show build output information
    if [[ -d "$OUTPUT_DIR" ]]; then
        BUILD_SIZE=$(du -sh "$OUTPUT_DIR" | cut -f1)
        print_status "Build output size: $BUILD_SIZE"
        print_status "Build output directory: $OUTPUT_DIR"
    fi
else
    print_error "Frontend build failed"
    exit 1
fi

# Restore original environment file
if [[ -f "src/config/environment.ts.backup" ]]; then
    cp "src/config/environment.ts.backup" "src/config/environment.ts"
    rm "src/config/environment.ts.backup"
    print_status "Restored original environment configuration"
fi

# Clean up temporary files
rm -rf "$TEMP_CONFIG_DIR"
print_status "Cleaned up temporary files"

print_success "Frontend build completed successfully!"
print_status "Environment: $ENVIRONMENT"
print_status "Build mode: $BUILD_MODE"
if [[ "$ENVIRONMENT" == "production" ]]; then
    print_status "API Gateway URL: $API_GATEWAY_URL"
fi
