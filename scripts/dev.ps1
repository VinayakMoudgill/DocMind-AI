# DocMind AI — start backend + frontend (two new PowerShell windows).
# Usage (from repo root):  powershell -ExecutionPolicy Bypass -File .\scripts\dev.ps1
#
# Port: default 8010 (8000 is often already taken by another Python/uvicorn on Windows → WinError 10013).
# Override:  $env:DOCMIND_API_PORT = "8000"; .\scripts\dev.ps1

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

# Clear stray Python listeners on 8000/8010 (avoids WinError 10013)
& (Join-Path $PSScriptRoot "free-dev-ports.ps1") -Quiet

$Python = Join-Path $Root "venv\Scripts\python.exe"

if (-not (Test-Path $Python)) {
    Write-Error "Python venv not found at $Python — run: python -m venv venv && .\venv\Scripts\pip install -r backend\requirements.txt"
    exit 1
}

$BackendPort = 8010
if ($env:DOCMIND_API_PORT) {
    $BackendPort = [int]$env:DOCMIND_API_PORT
}

$busy8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($busy8000 -and $BackendPort -eq 8000) {
    Write-Host ""
    Write-Host "Port 8000 is already in use (PID $($busy8000.OwningProcess))." -ForegroundColor Red
    Write-Host "Fix:  Stop-Process -Id $($busy8000.OwningProcess) -Force" -ForegroundColor Yellow
    Write-Host "Or:   `$env:DOCMIND_API_PORT = '8010'; .\scripts\dev.ps1" -ForegroundColor Yellow
    Write-Host ""
}

# Frontend reads this in dev (overrides .env.development if present)
$envDevLocal = Join-Path $Root "frontend\.env.development.local"
$apiUrl = "http://127.0.0.1:$BackendPort/api"
Set-Content -Path $envDevLocal -Encoding utf8 -Value "NEXT_PUBLIC_API_URL=$apiUrl"
Write-Host "Wrote $envDevLocal -> NEXT_PUBLIC_API_URL=$apiUrl" -ForegroundColor DarkGray

$backendCmd = @"
Set-Location '$Root'
`$env:PYTHONPATH = '$Root'
`$env:DOCMIND_SKIP_NLI = '1'
Write-Host 'Backend: http://127.0.0.1:$BackendPort  (Ctrl+C to stop)' -ForegroundColor Cyan
& '$Python' -m uvicorn backend.main:app --host 127.0.0.1 --port $BackendPort --reload
"@

$frontendCmd = @"
Set-Location '$Root\frontend'
if (-not (Test-Path 'node_modules')) { npm install }
Write-Host 'Frontend: http://localhost:3000  (Ctrl+C to stop)' -ForegroundColor Green
npm run dev
"@

Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $backendCmd)
Start-Sleep -Seconds 2
Start-Process powershell.exe -ArgumentList @("-NoExit", "-Command", $frontendCmd)

Write-Host ""
Write-Host "Started backend and frontend in separate windows." -ForegroundColor Yellow
Write-Host "  API:    http://127.0.0.1:$BackendPort"
Write-Host "  Health: http://127.0.0.1:$BackendPort/health"
Write-Host "  App:    http://localhost:3000"
Write-Host ""
