#!/bin/bash

# Environment Setup Script for Slay Drip
# This script helps developers work with different environments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_commands=()
    
    if ! command_exists node; then
        missing_commands+=("node")
    fi
    
    if ! command_exists npm; then
        missing_commands+=("npm")
    fi
    
    if ! command_exists go; then
        missing_commands+=("go")
    fi
    
    if ! command_exists aws; then
        missing_commands+=("aws")
    fi
    
    if ! command_exists terraform; then
        missing_commands+=("terraform")
    fi
    
    if [ ${#missing_commands[@]} -eq 0 ]; then
        print_status "All prerequisites are installed"
    else
        print_error "Missing required commands: ${missing_commands[*]}"
        print_warning "Please install the missing commands and run this script again"
        exit 1
    fi
}

# Function to setup development environment
setup_dev_environment() {
    print_header "Setting up Development Environment"
    
    cd frontend
    
    print_status "Installing frontend dependencies..."
    npm install
    
    print_status "Setting up development configuration..."
    # Create development environment file if it doesn't exist
    if [ ! -f ".env.development" ]; then
        cat > .env.development << EOF
# Development Environment Configuration
VITE_APP_TITLE=Slay Drip - Development
VITE_API_BASE_URL=http://localhost:3000
VITE_ENVIRONMENT=development
VITE_ENABLE_DEBUG=true
EOF
        print_status "Created .env.development file"
    fi
    
    cd ../backend/lambda
    
    print_status "Installing backend dependencies..."
    go mod tidy
    
    cd ../..
    
    print_status "Development environment setup complete"
}

# Function to setup live environment
setup_live_environment() {
    print_header "Setting up Live Environment"
    
    print_warning "Live environment requires AWS credentials and proper permissions"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured or invalid"
        print_warning "Please run 'aws configure' and set up your credentials"
        exit 1
    fi
    
    print_status "AWS credentials verified"
    
    # Check if we're in the right directory
    if [ ! -f "terraform/main.tf" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    cd terraform
    
    print_status "Initializing Terraform..."
    terraform init
    
    print_status "Live environment setup complete"
    print_warning "Remember to set the environment variable to 'live' when deploying"
}

# Function to start development server
start_dev_server() {
    print_header "Starting Development Server"
    
    cd frontend
    
    print_status "Starting development server on http://localhost:3001"
    print_status "Press Ctrl+C to stop the server"
    
    npm run dev:dev
}

# Function to build for specific environment
build_for_environment() {
    local environment=$1
    
    if [ -z "$environment" ]; then
        print_error "Please specify environment (dev or live)"
        exit 1
    fi
    
    print_header "Building for $environment environment"
    
    cd frontend
    
    case $environment in
        "dev"|"development")
            print_status "Building for development..."
            npm run build:dev
            ;;
        "live"|"production")
            print_status "Building for production..."
            npm run build:live
            ;;
        *)
            print_error "Invalid environment: $environment. Use 'dev' or 'live'"
            exit 1
            ;;
    esac
    
    print_status "Build complete for $environment environment"
}

# Function to show environment status
show_environment_status() {
    print_header "Environment Status"
    
    # Check frontend
    if [ -d "frontend" ]; then
        cd frontend
        print_status "Frontend dependencies:"
        if [ -d "node_modules" ]; then
            echo "  ✓ node_modules installed"
        else
            echo "  ✗ node_modules missing"
        fi
        
        if [ -f ".env.development" ]; then
            echo "  ✓ .env.development exists"
        else
            echo "  ✗ .env.development missing"
        fi
        
        cd ..
    fi
    
    # Check backend
    if [ -d "backend/lambda" ]; then
        cd backend/lambda
        print_status "Backend dependencies:"
        if [ -f "go.mod" ]; then
            echo "  ✓ go.mod exists"
        else
            echo "  ✗ go.mod missing"
        fi
        
        cd ../..
    fi
    
    # Check Terraform
    if [ -d "terraform" ]; then
        cd terraform
        print_status "Terraform status:"
        if [ -d ".terraform" ]; then
            echo "  ✓ Terraform initialized"
        else
            echo "  ✗ Terraform not initialized"
        fi
        
        cd ..
    fi
}

# Function to show help
show_help() {
    echo "Environment Setup Script for Slay Drip"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  setup-dev      Setup development environment"
    echo "  setup-live     Setup live environment (requires AWS credentials)"
    echo "  start-dev      Start development server"
    echo "  build [ENV]    Build for specific environment (dev or live)"
    echo "  status         Show environment status"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 setup-dev"
    echo "  $0 setup-live"
    echo "  $0 start-dev"
    echo "  $0 build dev"
    echo "  $0 build live"
    echo "  $0 status"
}

# Main script logic
main() {
    local command=$1
    
    case $command in
        "setup-dev")
            check_prerequisites
            setup_dev_environment
            ;;
        "setup-live")
            check_prerequisites
            setup_live_environment
            ;;
        "start-dev")
            start_dev_server
            ;;
        "build")
            local environment=$2
            build_for_environment "$environment"
            ;;
        "status")
            show_environment_status
            ;;
        "help"|"--help"|"-h"|"")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
