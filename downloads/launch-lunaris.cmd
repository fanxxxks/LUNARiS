@echo off
setlocal
set "LUNARIS_LAUNCHER_FILE=%~f0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "$s=[IO.File]::ReadAllText($env:LUNARIS_LAUNCHER_FILE); & ([scriptblock]::Create(($s -split '(?m)^# LUNARIS_POWERSHELL\r?$',2)[1]))"
if errorlevel 1 pause
exit /b
# LUNARIS_POWERSHELL
$ErrorActionPreference = 'Stop'
$candidates = @(
 (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'),
 (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
 (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'),
 (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
 (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
 (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
)
$browser = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
if (-not $browser) { throw 'Please install Microsoft Edge or Google Chrome.' }
$profile = Join-Path $env:LOCALAPPDATA 'LUNARIS\online-performance-browser'
$arguments = @("--user-data-dir=$profile", '--force-high-performance-gpu', '--use-angle=d3d11', '--no-first-run', '--no-default-browser-check', '--start-maximized', '--app=https://fanxxxks.github.io/LUNARiS/')
Start-Process -FilePath $browser -ArgumentList ($arguments | ForEach-Object { '"' + $_ + '"' }) -WindowStyle Normal
