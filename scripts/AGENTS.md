# Scripts notes

This folder contains platform-specific start/stop scripts for local Docker execution.

## Scripts

- start-mac.sh / stop-mac.sh
- start-linux.sh / stop-linux.sh
- start-windows.ps1 / stop-windows.ps1

## Behavior

- Start scripts run: docker compose up --build -d
- Stop scripts run: docker compose down

## Scope

- These scripts are intentionally minimal for MVP scaffolding.