# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Local-first Project Management MVP: a Kanban board app with an AI chat sidebar for card operations. Monorepo with a Next.js frontend and FastAPI backend, connected to Supabase Postgres. Runs in a single Docker container (backend serves static frontend assets).

## Build & Run Commands

### Docker (primary)
```bash
./scripts/start-mac.sh       # macOS
./scripts/start-linux.sh     # Linux
./scripts/start-windows.ps1  # Windows
# App at http://localhost:8000
```

### Local Backend Development
```bash
cd backend
uv sync --project . --extra dev
set -a && source ../.env && set +a
.venv/bin/uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8010
```

### Local Frontend Development
```bash
cd frontend
npm install
npm run dev    # port 3000
```

### Build Frontend into Backend
```bash
cd frontend && npm run build
rm -rf ../backend/static && mkdir -p ../backend/static
cp -R out/. ../backend/static/
```

### Testing
```bash
# Frontend unit tests
cd frontend && npm run test:unit

# Frontend e2e tests
cd frontend && npm run test:e2e

# Backend tests
cd backend && .venv/bin/pytest -q
```

## Architecture

### Backend (FastAPI, Python 3.12+, uv)
Layered design in `backend/app/`:
- **main.py** - Routes and lifespan hooks. All API routes under `/api`. Also serves static frontend from `backend/static/`.
- **service.py** - Business logic: `BoardService` (CRUD), `AIService` (chat + structured actions)
- **repository.py** - Data access + auto-apply migrations from `backend/migrations/` on startup
- **models.py** - Pydantic request/response schemas
- **ai.py** - Anthropic SDK wrapper (`AnthropicConnectivityClient`) with fallback JSON parsing
- **config.py** - Settings loaded from environment variables
- **deps.py** - Dependency injection

### Frontend (Next.js 16, React 19, TypeScript, Tailwind CSS 4)
Static export (`output: "export"` in next.config.ts). Key source in `frontend/src/`:
- **app/page.tsx** - Login page + authenticated app root
- **components/** - `KanbanBoard`, `KanbanColumn`, `KanbanCard`, `AIChatSidebar`, etc.
- **lib/boardApi.ts** - `/api/board` client calls
- **lib/aiApi.ts** - `/api/ai/*` client calls
- **lib/kanban.ts** - Board state manipulation logic

### Database (Supabase Postgres)
Tables: `app_users`, `boards` (state as JSONB), `board_snapshots`, `schema_migrations`. Board state structure has `columns` (with `cardIds`) and `cards` (keyed by ID). Migrations in `backend/migrations/` are auto-applied on startup.

### Key Integration Points
- Frontend sends `x-username` header for auth (session-based, demo credentials only)
- Backend auto-creates boards for first-time users
- AI chat returns structured actions (move_card, create_card, edit_card) applied server-side; frontend refreshes board after
- Drag-and-drop uses dnd-kit

## Environment Variables

Defined in `.env` (see `.env.example`): `SUPABASE_DB_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `CORS_ALLOW_ORIGINS`.

## Coding Standards

1. Use latest library versions and idiomatic approaches
2. Keep it simple - never over-engineer, always simplify, no unnecessary defensive programming
3. Be concise. No emojis ever.
4. When hitting issues, identify root cause with evidence before attempting a fix
5. Use Anthropic direct API only (Claude Sonnet tier) for AI calls

## Color Scheme

- Accent Yellow: `#ecad0a` | Blue Primary: `#209dd7` | Purple Secondary: `#753991`
- Dark Navy: `#032147` | Gray Text: `#888888`

## Deployment

- **Local**: Docker via docker-compose (port 8000)
- **Vercel**: Separate projects for backend (serverless) and frontend (static). Backend needs `SUPABASE_DB_URL`, `ANTHROPIC_API_KEY`, `CORS_ALLOW_ORIGINS`. Frontend needs `NEXT_PUBLIC_API_BASE_URL`.
