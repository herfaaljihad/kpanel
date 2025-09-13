Write-Host "Building KPanel React App..." -ForegroundColor Yellow
Set-Location client
npm run build
Write-Host "âœ… Build completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting production server..." -ForegroundColor Yellow
Set-Location ..
node production-server.js
