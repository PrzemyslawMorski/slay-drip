# Terraform Destroy Script
# Automatically sets the environment variable for destroying resources

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("development", "staging", "production")]
    [string]$Environment
)

Write-Host "💥 Destroying Terraform resources for environment: $Environment" -ForegroundColor Red

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

# Select workspace
Write-Host "🔄 Selecting workspace: $Environment" -ForegroundColor Yellow
terraform workspace select $Environment 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Workspace '$Environment' not found!" -ForegroundColor Red
    exit 1
}

# Show what will be destroyed
Write-Host "📋 Planning destroy operation..." -ForegroundColor Yellow
terraform plan -destroy -var="environment=$Environment" -out="$Environment.destroy.tfplan" 

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Destroy plan failed!" -ForegroundColor Red
    exit 1
}

# Ask for confirmation
Write-Host "⚠️  WARNING: This will DESTROY ALL RESOURCES in the $Environment environment!" -ForegroundColor Red
Write-Host "⚠️  This action cannot be undone!" -ForegroundColor Red
$confirmation = Read-Host "🤔 Are you absolutely sure you want to destroy? Type 'DESTROY' to confirm"
if ($confirmation -ne "DESTROY") {
    Write-Host "❌ Cancelled" -ForegroundColor Red
    exit 1
}

# Apply the destroy plan
Write-Host "💥 Destroying Terraform resources..." -ForegroundColor Red
terraform apply -var="environment=$Environment" "$Environment.destroy.tfplan"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Destroy completed successfully!" -ForegroundColor Green
    
    # Clean up plan file
    Remove-Item "$Environment.destroy.tfplan" -Force
    Write-Host "🗑️  Destroy plan file cleaned up" -ForegroundColor Gray
} else {
    Write-Host "❌ Destroy failed!" -ForegroundColor Red
    exit 1
} 