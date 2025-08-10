# Frontend Build Pipeline Script (PowerShell)
# This script handles the complete frontend build process including environment configuration

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "production")]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$ApiUrl = "",
    
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "production")]
    [string]$BuildMode = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$OutputDir = "dist",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipLint,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verbose,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Default values
$script:Environment = $Environment
$script:ApiGatewayUrl = $ApiUrl
$script:BuildMode = $BuildMode
$script:OutputDir = $OutputDir
$script:SkipTests = $SkipTests
$script:SkipLint = $SkipLint
$script:Verbose = $Verbose
$script:DryRun = $DryRun

# Function to write colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-Step {
    param([string]$Message)
    Write-Host "[STEP] $Message" -ForegroundColor Magenta
}

function Write-Verbose {
    param([string]$Message)
    if ($script:Verbose) {
        Write-Host "[VERBOSE] $Message" -ForegroundColor Cyan
    }
}

# Function to show usage
function Show-Usage {
    Write-Host "Frontend Build Pipeline Script (PowerShell)" -ForegroundColor White
    Write-Host ""
    Write-Host "Usage: .\build-pipeline.ps1 [PARAMETERS]" -ForegroundColor White
    Write-Host ""
    Write-Host "Parameters:" -ForegroundColor White
    Write-Host "  -Environment ENV     Build environment (development|production) [default: development]" -ForegroundColor White
    Write-Host "  -ApiUrl URL          API Gateway URL for production builds" -ForegroundColor White
    Write-Host "  -BuildMode MODE      Build mode (development|production) [default: development]" -ForegroundColor White
    Write-Host "  -OutputDir DIR       Output directory [default: dist]" -ForegroundColor White
    Write-Host "  -SkipTests           Skip running tests" -ForegroundColor White
    Write-Host "  -SkipLint            Skip linting" -ForegroundColor White
    Write-Host "  -Verbose             Enable verbose output" -ForegroundColor White
    Write-Host "  -DryRun              Show what would be done without executing" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\build-pipeline.ps1 -Environment development" -ForegroundColor White
    Write-Host "  .\build-pipeline.ps1 -Environment production -ApiUrl 'https://abc123.execute-api.us-east-1.amazonaws.com/production'" -ForegroundColor White
    Write-Host "  .\build-pipeline.ps1 -Environment production -ApiUrl 'https://abc123.execute-api.us-east-1.amazonaws.com/production' -Verbose" -ForegroundColor White
    Write-Host ""
    Write-Host "Environment Variables:" -ForegroundColor White
    Write-Host "  API_GATEWAY_URL      API Gateway URL (alternative to -ApiUrl)" -ForegroundColor White
    Write-Host "  BUILD_ENVIRONMENT    Build environment (alternative to -Environment)" -ForegroundColor White
    Write-Host "  SKIP_TESTS          Skip tests (alternative to -SkipTests)" -ForegroundColor White
}

# Function to check prerequisites
function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version 2>$null
        if (-not $nodeVersion) {
            throw "Node.js not found"
        }
        Write-Success "Node.js version: $nodeVersion"
    }
    catch {
        Write-Error "Node.js is not installed or not in PATH"
        exit 1
    }
    
    # Check Node.js version
    $nodeMajorVersion = (node --version | ForEach-Object { $_.Split('v')[1].Split('.')[0] })
    if ([int]$nodeMajorVersion -lt 16) {
        Write-Error "Node.js version 16 or higher is required (current: $nodeVersion)"
        exit 1
    }
    
    # Check if npm is installed
    try {
        $npmVersion = npm --version 2>$null
        if (-not $npmVersion) {
            throw "npm not found"
        }
        Write-Success "npm version: $npmVersion"
    }
    catch {
        Write-Error "npm is not installed or not in PATH"
        exit 1
    }
    
    # Check if package.json exists
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found. Run this script from the frontend directory."
        exit 1
    }
    
    Write-Success "Prerequisites check completed"
}

# Function to install dependencies
function Install-Dependencies {
    Write-Step "Installing dependencies..."
    
    if ($script:DryRun) {
        Write-Status "Would run: npm ci"
        return
    }
    
    npm ci
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    
    Write-Success "Dependencies installed successfully"
}

# Function to run tests
function Invoke-Tests {
    if ($script:SkipTests) {
        Write-Warning "Skipping tests (-SkipTests flag)"
        return
    }
    
    Write-Step "Running tests..."
    
    if ($script:DryRun) {
        Write-Status "Would run: npm test"
        return
    }
    
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Tests failed"
        exit 1
    }
    
    Write-Success "Tests completed successfully"
}

# Function to run linting
function Invoke-Lint {
    if ($script:SkipLint) {
        Write-Warning "Skipping linting (-SkipLint flag)"
        return
    }
    
    Write-Step "Running linting..."
    
    if ($script:DryRun) {
        Write-Status "Would run: npm run lint"
        return
    }
    
    npm run lint
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Linting failed"
        exit 1
    }
    
    Write-Success "Linting completed successfully"
}

# Function to prepare environment configuration
function Prepare-Environment {
    Write-Step "Preparing environment configuration..."
    
    # Create temporary configuration directory
    $tempConfigDir = "temp-config"
    if (-not (Test-Path $tempConfigDir)) {
        New-Item -ItemType Directory -Path $tempConfigDir -Force | Out-Null
    }
    
    # Copy the template configuration
    if (-not (Test-Path "src/config/environment.template.ts")) {
        Write-Error "Environment template not found: src/config/environment.template.ts"
        exit 1
    }
    
    Copy-Item "src/config/environment.template.ts" "$tempConfigDir/environment.ts"
    
    # Replace placeholders based on environment
    if ($script:Environment -eq "production") {
        if (-not $script:ApiGatewayUrl) {
            Write-Error "API Gateway URL is required for production builds"
            Write-Host "Use -ApiUrl parameter or set API_GATEWAY_URL environment variable" -ForegroundColor White
            exit 1
        }
        
        Write-Status "Replacing API Gateway URL placeholder with: $($script:ApiGatewayUrl)"
        
        # Read the file content
        $content = Get-Content "$tempConfigDir/environment.ts" -Raw
        
        # Replace the placeholder
        $content = $content -replace "__API_GATEWAY_URL__", $script:ApiGatewayUrl
        
        # Write back to file
        Set-Content "$tempConfigDir/environment.ts" -Value $content
        
        # Verify replacement
        $checkContent = Get-Content "$tempConfigDir/environment.ts" -Raw
        if ($checkContent -match "__API_GATEWAY_URL__") {
            Write-Error "Failed to replace API Gateway URL placeholder"
            exit 1
        }
        
        Write-Success "API Gateway URL placeholder replaced successfully"
    }
    else {
        Write-Status "Using development configuration (no URL replacement needed)"
    }
    
    # Backup original environment file
    if (Test-Path "src/config/environment.ts") {
        Copy-Item "src/config/environment.ts" "src/config/environment.ts.backup"
        Write-Status "Backed up original environment configuration"
    }
    
    # Replace the environment file with the temporary one
    Copy-Item "$tempConfigDir/environment.ts" "src/config/environment.ts"
    
    Write-Success "Environment configuration prepared"
}

# Function to build frontend
function Build-Frontend {
    Write-Step "Building frontend..."
    
    if ($script:DryRun) {
        if ($script:BuildMode -eq "production") {
            Write-Status "Would run: npm run build:live"
        } else {
            Write-Status "Would run: npm run build:dev"
        }
        return
    }
    
    if ($script:BuildMode -eq "production") {
        npm run build:live
    } else {
        npm run build:dev
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Frontend built successfully"
        
        # Show build output information
        if (Test-Path $script:OutputDir) {
            $buildSize = (Get-ChildItem $script:OutputDir -Recurse | Measure-Object -Property Length -Sum).Sum
            $buildSizeMB = [math]::Round($buildSize / 1MB, 2)
            Write-Status "Build output size: $buildSizeMB MB"
            Write-Status "Build output directory: $($script:OutputDir)"
        }
    } else {
        Write-Error "Frontend build failed"
        exit 1
    }
}

# Function to cleanup
function Invoke-Cleanup {
    Write-Step "Cleaning up..."
    
    # Restore original environment file
    if (Test-Path "src/config/environment.ts.backup") {
        Copy-Item "src/config/environment.ts.backup" "src/config/environment.ts"
        Remove-Item "src/config/environment.ts.backup"
        Write-Status "Restored original environment configuration"
    }
    
    # Clean up temporary files
    if (Test-Path "temp-config") {
        Remove-Item "temp-config" -Recurse -Force
        Write-Status "Cleaned up temporary files"
    }
    
    Write-Success "Cleanup completed"
}

# Function to show build summary
function Show-Summary {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor White
    Write-Host "           BUILD SUMMARY" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor White
    Write-Host "Environment:     $($script:Environment)" -ForegroundColor White
    Write-Host "Build Mode:      $($script:BuildMode)" -ForegroundColor White
    Write-Host "Output Directory: $($script:OutputDir)" -ForegroundColor White
    if ($script:Environment -eq "production") {
        Write-Host "API Gateway URL: $($script:ApiGatewayUrl)" -ForegroundColor White
    }
    Write-Host "Tests:           $(if ($script:SkipTests) { 'Skipped' } else { 'Run' })" -ForegroundColor White
    Write-Host "Linting:         $(if ($script:SkipLint) { 'Skipped' } else { 'Run' })" -ForegroundColor White
    Write-Host "==========================================" -ForegroundColor White
    
    if ($script:DryRun) {
        Write-Warning "This was a dry run - no actual changes were made"
    } else {
        Write-Success "Frontend build pipeline completed successfully!"
    }
}

# Main execution
function Main {
    Write-Status "Starting frontend build pipeline..."
    Write-Status "Environment: $($script:Environment)"
    Write-Status "Build mode: $($script:BuildMode)"
    if ($script:Environment -eq "production") {
        Write-Status "API Gateway URL: $($script:ApiGatewayUrl)"
    }
    
    # Check environment variables if not provided via parameters
    if (-not $script:ApiGatewayUrl -and $env:API_GATEWAY_URL) {
        $script:ApiGatewayUrl = $env:API_GATEWAY_URL
    }
    
    if (-not $script:Environment -and $env:BUILD_ENVIRONMENT) {
        $script:Environment = $env:BUILD_ENVIRONMENT
    }
    
    if (-not $script:SkipTests -and $env:SKIP_TESTS) {
        $script:SkipTests = $true
    }
    
    # Validate environment
    if ($script:Environment -notin @("development", "production")) {
        Write-Error "Invalid environment: $($script:Environment). Must be 'development' or 'production'"
        exit 1
    }
    
    # Validate build mode
    if ($script:BuildMode -notin @("development", "production")) {
        Write-Error "Invalid build mode: $($script:BuildMode). Must be 'development' or 'production'"
        exit 1
    }
    
    try {
        Test-Prerequisites
        Install-Dependencies
        Invoke-Tests
        Invoke-Lint
        Prepare-Environment
        Build-Frontend
        Show-Summary
    }
    catch {
        Write-Error "Build pipeline failed: $($_.Exception.Message)"
        exit 1
    }
    finally {
        Invoke-Cleanup
    }
}

# Check if help is requested
if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "-?") {
    Show-Usage
    exit 0
}

# Run main function
Main
