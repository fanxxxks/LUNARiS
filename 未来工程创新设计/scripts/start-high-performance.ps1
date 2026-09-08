# A project-only browser instance: does not modify Windows GPU or browser settings.
$ErrorActionPreference = 'Stop'
$projectFile = Join-Path (Split-Path $PSScriptRoot -Parent) '月宫华容_三维仿真软件.html'
if (-not (Test-Path -LiteralPath $projectFile -PathType Leaf)) {
    throw "Simulation file not found: $projectFile"
}
$browserCandidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
)
$browserPath = $browserCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browserPath) { throw 'Please install Microsoft Edge or Google Chrome.' }
$profilePath = Join-Path $env:LOCALAPPDATA 'LUNARIS\performance-browser'
$projectRoot = Split-Path $PSScriptRoot -Parent
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Node.js 20+ is required for intelligent scheduling. Install Node.js, then launch again. The HTML file still supports offline demos.' }
$servicePort = if ($env:LUNARIS_PORT) { [int]$env:LUNARIS_PORT } else { 8787 }
$projectUrl = "http://127.0.0.1:$servicePort"
$rootHasher = [System.Security.Cryptography.SHA256]::Create()
$projectId = ([System.BitConverter]::ToString($rootHasher.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($projectRoot)))).Replace('-', '').ToLower().Substring(0, 16)
$rootHasher.Dispose()
function Get-LunarisHealth {
    try { return Invoke-RestMethod -Uri "$projectUrl/api/health" -TimeoutSec 2 } catch { return $null }
}
$health = Get-LunarisHealth
if ($health -and ($health.service -ne 'lunaris' -or $health.project -ne $projectId)) { throw "Port $servicePort belongs to another project. Set LUNARIS_PORT to another port." }
if (-not $health) {
    $serverFile = Join-Path $projectRoot 'src\server\server.cjs'
    Start-Process -FilePath $nodeCommand.Source -ArgumentList ('"' + $serverFile + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        $health = Get-LunarisHealth
        if ($health) { break }
    }
}
if (-not $health -or $health.service -ne 'lunaris' -or $health.project -ne $projectId) { throw 'Local scheduling service could not start. Check the port and run npm start for details.' }
$browserArguments = @(
    "--user-data-dir=$profilePath",
    '--force-high-performance-gpu',
    '--use-angle=d3d11',
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    "--app=$projectUrl"
)
# A dedicated profile makes the GPU choice apply even when Edge is already open.
# Keep vsync enabled: rendered frames follow the display, including 240 Hz panels.
# This is the interactive simulation window, not a background helper. Detach its
# standard handles so closing the launcher console cannot affect the app.
Start-Process -FilePath $browserPath -ArgumentList ($browserArguments | ForEach-Object { '"' + $_ + '"' }) -WindowStyle Normal
