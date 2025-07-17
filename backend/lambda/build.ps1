# Build script for Lambda functions with documentation
# PowerShell equivalent of build.sh

param(
    [switch]$Clean,
    [switch]$Verbose
)

# Error handling
$ErrorActionPreference = "Stop"

# Colors for output (PowerShell compatible)
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️  $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
}

Write-ColorOutput "Building Lambda functions..." "Green"

# Create build directory
$BUILD_DIR = "build"
if (Test-Path $BUILD_DIR) {
    if ($Clean) {
        Write-Info "Cleaning existing build directory..."
        Remove-Item -Path $BUILD_DIR -Recurse -Force
    }
}
New-Item -ItemType Directory -Path $BUILD_DIR -Force | Out-Null

# List of functions to build
$FUNCTIONS = @(
    "get-items",
    "get-item", 
    "create-item",
    "get-outfits",
    "get-outfit",
    "create-outfit"
)

# Build each function
foreach ($func in $FUNCTIONS) {
    Write-Info "Building $func..."
    
    # Create function build directory
    $FUNC_DIR = Join-Path $BUILD_DIR $func
    New-Item -ItemType Directory -Path $FUNC_DIR -Force | Out-Null
    
    # Copy shared code to function directory
    Write-Info "  Copying shared code..."
    Copy-Item -Path "models" -Destination $FUNC_DIR -Recurse -Force
    Copy-Item -Path "handlers" -Destination $FUNC_DIR -Recurse -Force
    Copy-Item -Path "go.mod" -Destination $FUNC_DIR -Force
    Copy-Item -Path "go.sum" -Destination $FUNC_DIR -Force
    
    # Copy the function's main.go
    Copy-Item -Path "functions\$func\main.go" -Destination $FUNC_DIR -Force
    
    # Build Go binary for Lambda
    Write-Info "  Building Go binary..."
    Push-Location $FUNC_DIR
    
    try {
        $env:GOOS = "linux"
        $env:GOARCH = "amd64"
        
        if ($Verbose) {
            go build -v -o bootstrap main.go
        } else {
            go build -o bootstrap main.go
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Go build failed for $func"
        }
        
        # Create ZIP file
        Write-Info "  Creating ZIP file..."
        $zipPath = Join-Path ".." "$func.zip"
        
        # Use .NET compression for cross-platform compatibility
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        if (Test-Path $zipPath) {
            Remove-Item $zipPath -Force
        }
        
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            (Get-Location).Path, 
            (Join-Path ".." "$func.zip")
        )
        
        Pop-Location
        
        Write-Success "Built $func.zip"
        
    } catch {
        Pop-Location
        Write-Error "Failed to build $func`: $($_.Exception.Message)"
        exit 1
    }
}

Write-Success "All Lambda functions built successfully!"
Write-Info "Build artifacts:"
Get-ChildItem -Path "$BUILD_DIR\*.zip" | ForEach-Object {
    Write-Host "  $($_.Name) ($([math]::Round($_.Length / 1KB, 2)) KB)" -ForegroundColor Cyan
}

Write-Info "API Documentation:"
Write-Host "  Lambda functions are ready for deployment to AWS Lambda" -ForegroundColor White
Write-Host "  Each function can be deployed individually or as a group" -ForegroundColor White
Write-Host "  Use AWS CLI or Terraform to deploy the ZIP files" -ForegroundColor White

# Optional: Show deployment commands
Write-Info "Deployment commands (example):"
Write-Host "  aws lambda update-function-code --function-name get-items --zip-file fileb://build/get-items.zip" -ForegroundColor Gray
Write-Host "  aws lambda update-function-code --function-name create-item --zip-file fileb://build/create-item.zip" -ForegroundColor Gray 