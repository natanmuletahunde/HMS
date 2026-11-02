# Nexus HMS - Single-command runner
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Nexus HMS Enterprise Servers " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Start API Server (NestJS on port 8080)
Write-Host "Starting NestJS API Server on port 8080..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm --filter @workspace/api-server run start" -WindowStyle Minimized

# 2. Wait 3 seconds for API to bind
Start-Sleep -Seconds 3

# 3. Start Frontend (Next.js on port 3000)
Write-Host "Starting Next.js Frontend on port 3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "pnpm --filter @workspace/hotel-management run dev" -WindowStyle Minimized

# 4. Open in default browser
Start-Sleep -Seconds 4
Write-Host "Opening application at http://localhost:3000..." -ForegroundColor Green
Start-Process "http://localhost:3000"
