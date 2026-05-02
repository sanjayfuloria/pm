# Backend notes

This directory contains the FastAPI backend scaffold for the Project Management MVP.

## Current contents

- app/main.py: FastAPI app with:
	- GET /api/health
	- GET /api/hello
	- GET /api/board
	- PUT /api/board
	- POST /api/ai/connectivity
	- POST /api/ai/chat
	- Static site mount at / using backend/static/
- static/index.html: Hello-world page that calls /api/hello from the browser.
- pyproject.toml: Python dependencies and build metadata.
- migrations/: SQL migrations for schema setup and demo seed data.

## Run patterns

- Dockerized run is driven from repository root via docker compose.
- Local non-Docker run can be done with uv from this directory.

## Status

- This is scaffolding only.
- In Docker, backend/static/ is populated from the frontend static export during image build, so / serves the Kanban app.
- Backend board CRUD routes are implemented against Supabase Postgres via SUPABASE_DB_URL.
- Startup migration verification is implemented.
- AI connectivity route is implemented with Anthropic direct API and Claude Sonnet tier.
- Structured AI chat board operations are implemented via /api/ai/chat.