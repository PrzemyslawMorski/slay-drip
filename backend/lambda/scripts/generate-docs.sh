#!/bin/bash

# Generate OpenAPI documentation from Go code
set -e

echo " Generating OpenAPI documentation..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create api-docs directory
mkdir -p api-docs

# Generate OpenAPI spec from Go annotations
echo -e "${YELLOW}Scanning Go files for annotations...${NC}"
swag init \
    --generalInfo "handlers/items.go" \
    --output "api-docs" \
    --parseDependency \
    --parseInternal \
    --parseDepth 2 \
    --dir "./handlers,./models" \
    --parseVendor \
    --parseDependency \
    --parseInternal

# Create a simple HTML viewer
cat > api-docs/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Slay Drip API Documentation</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        body { margin: 0; padding: 0; }
        #swagger-ui { height: 100vh; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
    <script>
        window.onload = function() {
            SwaggerUIBundle({
                url: './swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>
EOF

echo -e "${GREEN}✅ Documentation generated successfully!${NC}"
echo -e "${YELLOW} Files created:${NC}"
echo "   - api-docs/swagger.json"
echo "   - api-docs/index.html"
echo ""
echo -e "${YELLOW}🌐 To view docs locally:${NC}"
echo "   cd api-docs && python3 -m http.server 8080"
echo "   Then visit: http://localhost:8080" 