# Free ports 8000 and 8010 from stray Python/Uvicorn (fixes WinError 10013).
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\free-dev-ports.ps1
param(
    [switch] $Quiet
)

$stopped = $false
$ports = @(8000, 8010)
foreach ($port in $ports) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | ForEach-Object {
        $procId = $_.OwningProcess
        $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if ($p -and $p.ProcessName -match '^(python|pythonw)$') {
            if (-not $Quiet) {
                Write-Host "Stopping $($p.ProcessName) PID $procId on port $port"
            }
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            $stopped = $true
        }
    }
}

if (-not $Quiet) {
    if ($stopped) {
        Write-Host "Freed dev ports (Python listeners removed)."
    }
    $left = Get-NetTCPConnection -LocalPort 8000, 8010 -State Listen -ErrorAction SilentlyContinue
    if ($left) {
        Write-Host "Still listening on 8000/8010 (non-Python or new process):"
        $left | Format-Table LocalPort, OwningProcess, State
    }
}
