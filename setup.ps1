# CFA Buddy — Quick Setup Script (Windows PowerShell)
# Run this ONCE after cloning or pulling new code:
#   .\setup.ps1

Write-Host "CFA Buddy Setup..." -ForegroundColor Cyan

# Clean build artifacts
Write-Host "  Cleaning .next cache..." -ForegroundColor Gray
if (Test-Path .next) { Remove-Item -Recurse -Force .next }

# Install dependencies
Write-Host "  Installing dependencies..." -ForegroundColor Gray
npm install --silent

# Generate Prisma client
Write-Host "  Generating Prisma client..." -ForegroundColor Gray
npx prisma generate 2>$null

# Verify TypeScript
Write-Host "  Checking TypeScript..." -ForegroundColor Gray
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { Write-Host "TSC FAILED" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "Setup complete! Run: npm run dev" -ForegroundColor Green
Write-Host "Open: http://localhost:3000" -ForegroundColor Green
Write-Host ""
Write-Host "Note: The app works 100% without environment variables." -ForegroundColor Yellow
Write-Host "All data is stored in localStorage." -ForegroundColor Yellow
