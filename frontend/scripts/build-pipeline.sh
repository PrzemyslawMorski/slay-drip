#!/bin/bash

# Frontend Build Pipeline Script
# This script handles the complete frontend build process including environment configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="development"
API_GATEWAY_URL=""
BUILD_MODE="development"
OUTPUT_DIR="dist"
SKIP_TESTS=false
SKIP_LINT=false
VERBOSE=false
DRY_RUN=false

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

print_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Frontend Build Pipeline Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Build environment (development|production) [default: development]"
    echo "  -a, --api-url URL        API Gateway URL for production builds"
    echo "  -m, --mode MODE          Build mode (development|production) [default: development]"
    echo "  -o, --output DIR         Output directory [default: dist]"
    echo "  --skip-tests             Skip running tests"
    echo "  --skip-lint              Skip linting"
    echo "  -v, --verbose            Enable verbose output"
    echo "  --dry-run                Show what would be done without executing"
    echo "  -h, --help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --environment development"
    echo "  $0 --environment production --api-url https://abc123.execute-api.us-east-1.amazonaws.com/production"
    echo "  $0 -e production -a https://abc123.execute-api.us-east-1.amazonaws.com/production --verbose"
    echo ""
    echo "Environment Variables:"
    echo "  API_GATEWAY_URL          API Gateway URL (alternative to --api-url)"
    echo "  BUILD_ENVIRONMENT        Build environment (alternative to --environment)"
    echo "  SKIP_TESTS              Skip tests (alternative to --skip-tests)"
}

# Function to log verbose output
log_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ "$NODE_VERSION" -lt 16 ]]; then
        print_error "Node.js version 16 or higher is required (current: $(node --version))"
        exit 1
    fi
    
    print_success "Node.js version: $(node --version)"
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    print_success "npm version: $(npm --version)"
    
    # Check if package.json exists
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Run this script from the frontend directory."
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Function to install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Would run: npm ci"
        return
    fi
    
    npm ci
    print_success "Dependencies installed successfully"
}

# Function to run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        print_warning "Skipping tests (--skip-tests flag)"
        return
    fi
    
    print_step "Running tests..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Would run: npm test"
        return
    fi
    
    npm test
    print_success "Tests completed successfully"
}

# Function to run linting
run_lint() {
    if [[ "$SKIP_LINT" == "true" ]]; then
        print_warning "Skipping linting (--skip-lint flag)"
        return
    fi
    
    print_step "Running linting..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Would run: npm run lint"
        return
    fi
    
    npm run lint
    print_success "Linting completed successfully"
}

# Function to prepare environment configuration
prepare_environment() {
    print_step "Preparing environment configuration..."
    
    # Create temporary configuration directory
    TEMP_CONFIG_DIR="temp-config"
    mkdir -p "$TEMP_CONFIG_DIR"
    
    # Copy the template configuration
    if [[ ! -f "src/config/environment.template.ts" ]]; then
        print_error "Environment template not found: src/config/environment.template.ts"
        exit 1
    fi
    
    cp "src/config/environment.template.ts" "$TEMP_CONFIG_DIR/environment.ts"
    
    # Replace placeholders based on environment
    if [[ "$ENVIRONMENT" == "production" ]]; then
        if [[ -z "$API_GATEWAY_URL" ]]; then
            print_error "API Gateway URL is required for production builds"
            echo "Use --api-url or set API_GATEWAY_URL environment variable"
            exit 1
        fi
        
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
    
    print_success "Environment configuration prepared"
}

# Function to build frontend
build_frontend() {
    print_step "Building frontend..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_status "Would run: npm run build:$BUILD_MODE"
        return
    fi
    
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
}

# Function to cleanup
cleanup() {
    print_step "Cleaning up..."
    
    # Restore original environment file
    if [[ -f "src/config/environment.ts.backup" ]]; then
        cp "src/config/environment.ts.backup" "src/config/environment.ts"
        rm "src/config/environment.ts.backup"
        print_status "Restored original environment configuration"
    fi
    
    # Clean up temporary files
    if [[ -d "temp-config" ]]; then
        rm -rf "temp-config"
        print_status "Cleaned up temporary files"
    fi
    
    print_success "Cleanup completed"
}

# Function to show build summary
show_summary() {
    echo ""
    echo "=========================================="
    echo "           BUILD SUMMARY"
    echo "=========================================="
    echo "Environment:     $ENVIRONMENT"
    echo "Build Mode:      $BUILD_MODE"
    echo "Output Directory: $OUTPUT_DIR"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        echo "API Gateway URL: $API_GATEWAY_URL"
    fi
    echo "Tests:           $([[ "$SKIP_TESTS" == "true" ]] && echo "Skipped" || echo "Run")"
    echo "Linting:         $([[ "$SKIP_LINT" == "true" ]] && echo "Skipped" || echo "Run")"
    echo "=========================================="
    
    if [[ "$DRY_RUN" == "true" ]]; then
        print_warning "This was a dry run - no actual changes were made"
    else
        print_success "Frontend build pipeline completed successfully!"
    fi
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
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-lint)
            SKIP_LINT=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
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

# Check environment variables if not provided via command line
if [[ -z "$API_GATEWAY_URL" && -n "$API_GATEWAY_URL_ENV" ]]; then
    API_GATEWAY_URL="$API_GATEWAY_URL_ENV"
fi

if [[ -z "$ENVIRONMENT" && -n "$BUILD_ENVIRONMENT" ]]; then
    ENVIRONMENT="$BUILD_ENVIRONMENT"
fi

if [[ -n "$SKIP_TESTS_ENV" ]]; then
    SKIP_TESTS="$SKIP_TESTS_ENV"
fi

# Validate environment
if [[ "$ENVIRONMENT" != "development" && "$ENVIRONMENT" != "production" ]]; then
    print_error "Invalid environment: $ENVIRONMENT. Must be 'development' or 'production'"
    exit 1
fi

# Validate build mode
if [[ "$BUILD_MODE" != "development" && "$BUILD_MODE" != "production" ]]; then
    print_error "Invalid build mode: $BUILD_MODE. Must be 'development' or 'production'"
    exit 1
fi

# Main execution
main() {
    print_status "Starting frontend build pipeline..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Build mode: $BUILD_MODE"
    if [[ "$ENVIRONMENT" == "production" ]]; then
        print_status "API Gateway URL: $API_GATEWAY_URL"
    fi
    
    # Set up trap for cleanup on exit
    trap cleanup EXIT
    
    check_prerequisites
    install_dependencies
    run_tests
    run_lint
    prepare_environment
    build_frontend
    show_summary
}

# Run main function
main
