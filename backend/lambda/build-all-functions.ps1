param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("development", "staging", "production", "all")]
    [string]$Environment = "staging"
)

# Configuration
$AWS_REGION = "eu-central-1"

# Get AWS account ID from current context
function Get-AWSAccountId {
    try {
        $accountId = aws sts get-caller-identity --query "Account" --output text
        if ($LASTEXITCODE -eq 0 -and $accountId) {
            return $accountId.Trim()
        } else {
            Write-Error "Failed to get AWS account ID from current context"
            exit 1
        }
    }
    catch {
        Write-Error "Failed to get AWS account ID: $_"
        exit 1
    }
}

$AWS_ACCOUNT_ID = Get-AWSAccountId
$ECR_REGISTRY = "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

# Function names (matching the directories in functions/)
$FUNCTIONS = @(
    "create-item",
    "create-outfit", 
    "get-item",
    "get-items",
    "get-outfit",
    "get-outfits"
)

# Environments
$ENVIRONMENTS = @{
    "development" = @("development")
    "staging" = @("staging") 
    "production" = @("production")
    "all" = @("development", "staging", "production")
}

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" $Green
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" $Red
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️  $Message" $Blue
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" $Yellow
}

function Test-Docker {
    try {
        docker --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Test-AWSCLI {
    try {
        aws --version | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Login-ECR {
    Write-Info "Logging into ECR..."
    try {
        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REGISTRY
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Successfully logged into ECR"
        } else {
            Write-Error "Failed to login to ECR"
            exit 1
        }
    }
    catch {
        Write-Error "Failed to login to ECR: $_"
        exit 1
    }
}

function Build-Function {
    param(
        [string]$FunctionName,
        [string]$Environment
    )
    
    $ImageName = "slay-drip-$FunctionName-$Environment"
    $FullImageName = "$ECR_REGISTRY/$ImageName"
    
    Write-Info "Building $FunctionName for $Environment environment..."
    
    # Build the Docker image with platform specification
    Write-Info "Building Docker image: $ImageName"
    docker build --platform linux/amd64 --build-arg FUNCTION_NAME=$FunctionName -f Dockerfile.template -t $ImageName .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to build Docker image for $FunctionName"
        return $false
    }
    
    # Tag the image
    Write-Info "Tagging image: $FullImageName"
    docker tag $ImageName`:latest $FullImageName`:latest
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to tag Docker image for $FunctionName"
        return $false
    }
    
    # Push the image
    Write-Info "Pushing image to ECR: $FullImageName"
    docker push $FullImageName`:latest
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to push Docker image for $FunctionName"
        return $false
    }
    
    Write-Success "Successfully built and pushed $FunctionName for $Environment"
    return $true
}

function Build-AllFunctions {
    param([string[]]$TargetEnvironments)
    
    $TotalFunctions = $FUNCTIONS.Count * $TargetEnvironments.Count
    $CompletedFunctions = 0
    $FailedFunctions = @()
    
    Write-Info "Starting build process for $TotalFunctions total builds..."
    Write-Info "Functions: $($FUNCTIONS -join ', ')"
    Write-Info "Environments: $($TargetEnvironments -join ', ')"
    
    foreach ($env in $TargetEnvironments) {
        Write-Info "Processing environment: $env"
        
        foreach ($function in $FUNCTIONS) {
            $CompletedFunctions++
            Write-Info "[$CompletedFunctions/$TotalFunctions] Building $function for $env"
            
            if (Build-Function -FunctionName $function -Environment $env) {
                Write-Success "[$CompletedFunctions/$TotalFunctions] ✅ $function ($env)"
            } else {
                Write-Error "[$CompletedFunctions/$TotalFunctions] ❌ $function ($env)"
                $FailedFunctions += "$function ($env)"
            }
        }
    }
    
    # Summary
    Write-Info "Build process completed!"
    Write-Info "Total builds: $TotalFunctions"
    Write-Info "Successful: $($TotalFunctions - $FailedFunctions.Count)"
    Write-Info "Failed: $($FailedFunctions.Count)"
    
    if ($FailedFunctions.Count -gt 0) {
        Write-Warning "Failed builds:"
        foreach ($failed in $FailedFunctions) {
            Write-Warning "  - $failed"
        }
        exit 1
    } else {
        Write-Success "All builds completed successfully! 🎉"
    }
}

# Main execution
Write-Info "Slay Drip Lambda Functions Builder"
Write-Info "=================================="
Write-Info "Environment: $Environment"
Write-Info "AWS Region: $AWS_REGION"
Write-Info "AWS Account ID: $AWS_ACCOUNT_ID"
Write-Info "ECR Registry: $ECR_REGISTRY"

# Check prerequisites
Write-Info "Checking prerequisites..."

if (-not (Test-Docker)) {
    Write-Error "Docker is not installed or not available in PATH"
    exit 1
}

if (-not (Test-AWSCLI)) {
    Write-Error "AWS CLI is not installed or not available in PATH"
    exit 1
}

Write-Success "Prerequisites check passed"

# Login to ECR
Login-ECR

# Get target environments
$TargetEnvironments = $ENVIRONMENTS[$Environment]
if (-not $TargetEnvironments) {
    Write-Error "Invalid environment: $Environment"
    Write-Info "Valid environments: $($ENVIRONMENTS.Keys -join ', ')"
    exit 1
}

# Build all functions
Build-AllFunctions -TargetEnvironments $TargetEnvironments 