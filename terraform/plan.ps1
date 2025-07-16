# Terraform Plan Script
# Automatically sets the environment variable for planning

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment
)

Write-Host "🔍 Planning Terraform for environment: $Environment" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "main.tf")) {
    Write-Host "❌ Error: Please run this script from the terraform directory" -ForegroundColor Red
    exit 1
}

# Initialize Terraform if needed
if (-not (Test-Path ".terraform")) {
    Write-Host "📦 Initializing Terraform..." -ForegroundColor Yellow
    terraform init
}

# Select or create workspace
Write-Host "🔄 Selecting workspace: $Environment" -ForegroundColor Yellow
terraform workspace select $Environment 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Workspace '$Environment' not found. Creating..." -ForegroundColor Yellow
    terraform workspace new $Environment
}

# Plan with environment variable
Write-Host "📋 Planning Terraform changes..." -ForegroundColor Cyan
terraform plan -var="environment=$Environment" -out="$Environment.tfplan" 

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Plan completed successfully!" -ForegroundColor Green
    Write-Host "📄 Plan saved to: $Environment.tfplan" -ForegroundColor Gray
    Write-Host ""
    Write-Host "💡 To apply this plan, run:" -ForegroundColor Cyan
    Write-Host "   .\apply.ps1 -Environment $Environment" -ForegroundColor White
} else {
    Write-Host "❌ Plan failed!" -ForegroundColor Red
    exit 1
} 