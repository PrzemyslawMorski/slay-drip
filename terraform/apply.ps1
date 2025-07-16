# Terraform Apply Script
# Automatically sets the environment variable for applying

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment
)

Write-Host "🚀 Applying Terraform for environment: $Environment" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path "main.tf")) {
    Write-Host "❌ Error: Please run this script from the terraform directory" -ForegroundColor Red
    exit 1
}

# Check if plan file exists
$planFile = "$Environment.tfplan"
if (-not (Test-Path $planFile)) {
    Write-Host "❌ Error: Plan file '$planFile' not found!" -ForegroundColor Red
    Write-Host "💡 Run the plan script first:" -ForegroundColor Cyan
    Write-Host "   .\plan.ps1 -Environment $Environment" -ForegroundColor White
    exit 1
}

# Initialize Terraform if needed
if (-not (Test-Path ".terraform")) {
    Write-Host "📦 Initializing Terraform..." -ForegroundColor Yellow
    terraform init
}

# Select workspace
Write-Host "🔄 Selecting workspace: $Environment" -ForegroundColor Yellow
terraform workspace select $Environment 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Workspace '$Environment' not found. Creating..." -ForegroundColor Yellow
    terraform workspace new $Environment
}

# Ask for confirmation
Write-Host "⚠️  WARNING: This will apply changes to the $Environment environment!" -ForegroundColor Red
$confirmation = Read-Host "🤔 Are you sure you want to apply? (y/N)"
if ($confirmation -ne "y" -and $confirmation -ne "Y") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 1
}

# Apply the plan
Write-Host "🚀 Applying Terraform changes..." -ForegroundColor Cyan
terraform apply -var="environment=$Environment" $planFile 

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Apply completed successfully!" -ForegroundColor Green
    
    # Show outputs
    Write-Host ""
    Write-Host "📊 Environment Outputs:" -ForegroundColor Cyan
    terraform output
    
    # Clean up plan file
    Remove-Item $planFile -Force
    Write-Host "🗑️  Plan file cleaned up" -ForegroundColor Gray
} else {
    Write-Host "❌ Apply failed!" -ForegroundColor Red
    exit 1
} 