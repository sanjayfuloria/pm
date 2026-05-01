#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
docker compose up --build -d

echo "Started. Open http://localhost:8000"
