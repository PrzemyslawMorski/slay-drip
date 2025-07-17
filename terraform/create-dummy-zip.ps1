# Create dummy.zip for Terraform Lambda function initialization
# This is a placeholder file that will be replaced by actual Lambda code during deployment

$dummyContent = "This is a placeholder ZIP file for Terraform initialization. The actual Lambda code will be deployed by GitHub Actions."

# Create a temporary directory
$tempDir = "temp-dummy"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Create dummy file
$dummyContent | Out-File -FilePath "$tempDir\placeholder.txt" -Encoding UTF8

# Create ZIP file using .NET
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, "dummy.zip")

# Clean up
Remove-Item $tempDir -Recurse -Force

Write-Host "✅ Created dummy.zip for Terraform initialization" -ForegroundColor Green
Write-Host "   This file will be replaced by actual Lambda code during deployment" -ForegroundColor Yellow 