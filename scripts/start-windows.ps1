$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

docker compose up --build -d
Write-Output "Started. Open http://localhost:8000"
