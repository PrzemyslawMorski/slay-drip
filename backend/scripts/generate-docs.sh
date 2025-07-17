#!/bin/bash

# Generate OpenAPI documentation from Go code
set -e

echo "🔧 Generating OpenAPI documentation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create docs directory if it doesn't exist
mkdir -p docs

# Generate OpenAPI spec from Go annotations
echo -e "${YELLOW}Scanning Go files for annotations...${NC}"
swag init \
    --generalInfo "main.go" \
    --output "docs" \
    --parseDependency \
    --parseInternal \
    --parseDepth 2 \
    --parseVendor

echo -e "${GREEN}✅ Documentation generated successfully!${NC}"
echo -e "${YELLOW}Files created:${NC}"
echo "   - docs/docs.go"
echo "   - docs/swagger.json"
echo "   - docs/swagger.yaml"
echo ""
echo -e "${YELLOW}🌐 To view docs locally:${NC}"
echo "   go run main.go"
echo "   Then visit: http://localhost:8080/swagger/index.html" 