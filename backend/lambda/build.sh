#!/bin/bash

# Build script for Lambda functions with documentation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Lambda functions...${NC}"

# Create build directory
BUILD_DIR="build"
mkdir -p $BUILD_DIR

# List of functions to build
FUNCTIONS=(
    "get-items"
    "get-item"
    "create-item"
    "get-outfits"
    "get-outfit"
    "create-outfit"
)

# Build each function
for func in "${FUNCTIONS[@]}"; do
    echo -e "${YELLOW}Building $func...${NC}"
    
    # Create function build directory
    FUNC_DIR="$BUILD_DIR/$func"
    mkdir -p $FUNC_DIR
    
    # Copy shared code to function directory
    cp -r models $FUNC_DIR/
    cp -r handlers $FUNC_DIR/
    cp go.mod $FUNC_DIR/
    cp go.sum $FUNC_DIR/
    
    # Copy the function's main.go
    cp functions/$func/main.go $FUNC_DIR/
    
    # Build Go binary for Lambda
    cd $FUNC_DIR
    GOOS=linux GOARCH=amd64 go build -o bootstrap main.go
    
    # Create ZIP file
    zip -r ../$func.zip .
    cd ../..
    
    echo -e "${GREEN}✅ Built $func.zip${NC}"
done

echo -e "${GREEN}✅ All Lambda functions built successfully!${NC}"
echo -e "${YELLOW} Build artifacts:${NC}"
ls -la $BUILD_DIR/*.zip
echo ""
echo -e "${YELLOW} API Documentation:${NC}"