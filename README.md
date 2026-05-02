# Project Management MVP

A local-first MVP project management app with:

- Next.js frontend Kanban board
- FastAPI backend API and static file hosting
- Supabase Postgres persistence
- Anthropic-powered AI sidebar that can create, edit, and move cards

The backend serves the built frontend at `/`, so a single process/container runs the full app.

## Current MVP scope

- Session login with hardcoded demo credentials
- One board per signed-in user in the database
- Drag/drop card movement and card editing
- AI chat sidebar connected to backend actions
- Backend auto-provisions a default board for first-time users

## Tech stack

- Frontend: Next.js 16, React 19, TypeScript, dnd-kit
- Backend: FastAPI, psycopg, Anthropic SDK
- DB: Supabase Postgres (via `SUPABASE_DB_URL`)
- Packaging/runtime: Docker, docker-compose, uv
- Tests: Vitest (unit), Playwright (e2e), pytest (backend)

## Repository layout

- `frontend/`: Next.js app, unit tests, e2e tests
- `backend/`: FastAPI app, repository/service layers, tests, migrations
- `backend/migrations/`: SQL migrations and seed data
- `backend/static/`: Built frontend assets served by FastAPI
- `scripts/`: Start/stop scripts for macOS, Linux, Windows
- `docs/`: Plan and progress tracking

## Prerequisites

- Docker Desktop (recommended path)
- Node.js 22+ (for local frontend development)
- Python 3.12+ and uv (for local backend development)
- A Supabase Postgres connection string
- Anthropic API key

## Environment variables

Copy `.env.example` to `.env` and set values:

- `SUPABASE_DB_URL`: Required for board read/write APIs
- `ANTHROPIC_API_KEY`: Required for AI APIs
- `ANTHROPIC_MODEL`: Optional, defaults to `claude-sonnet-4-5-20250929`
- `CORS_ALLOW_ORIGINS`: Optional; comma-separated frontend origins, defaults to `*`
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: present for future use

## Deploy to Vercel

Use two Vercel projects from this monorepo:

1. Backend project with Root Directory `backend/`
2. Frontend project with Root Directory `frontend/`

### Backend (FastAPI) on Vercel

- Import repo in Vercel, set Root Directory to `backend/`.
- Add backend environment variables:
  - `SUPABASE_DB_URL`
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_MODEL` (optional)
  - `CORS_ALLOW_ORIGINS` (set to your frontend Vercel URL, for example `https://pm-frontend.vercel.app`)
- Deploy and verify health endpoint:
  - `https://<your-backend-domain>/api/health`

### Frontend (Next.js) on Vercel

- Import repo again in Vercel, set Root Directory to `frontend/`.
- Add frontend environment variable:
  - `NEXT_PUBLIC_API_BASE_URL=https://<your-backend-domain>`
- Deploy and open the app URL.

The frontend now builds API requests using `NEXT_PUBLIC_API_BASE_URL` when provided, and falls back to same-origin `/api` locally.

## Quick start (Docker)

### macOS

```bash
./scripts/start-mac.sh
```

### Linux

```bash
./scripts/start-linux.sh
```

### Windows PowerShell

```powershell
./scripts/start-windows.ps1
```

Open:

- http://localhost:8000

Stop:

- macOS/Linux: `./scripts/stop-mac.sh` or `./scripts/stop-linux.sh`
- Windows: `./scripts/stop-windows.ps1`

## Local development without Docker

## 1) Backend

```bash
cd backend
uv sync --project . --extra dev
set -a
source ../.env
set +a
.venv/bin/uvicorn app.main:app --app-dir . --host 127.0.0.1 --port 8010
```

Notes:

- On startup, backend applies migrations from `backend/migrations`.
- In this repo, using an absolute app-dir path can be the most reliable option if cwd issues appear:

```bash
/Users/sanjayfuloria/projects/pm/backend/.venv/bin/uvicorn app.main:app --app-dir /Users/sanjayfuloria/projects/pm/backend --host 127.0.0.1 --port 8010
```

## 2) Frontend (standalone dev mode)

```bash
cd frontend
npm install
npm run dev
```

If you run frontend standalone, ensure it reaches backend `/api` endpoints from the same origin/proxy setup.

## 3) Rebuild frontend static assets for backend hosting

When frontend code changes and you want FastAPI to serve the new UI:

```bash
cd frontend
npm run build
rm -rf ../backend/static
mkdir -p ../backend/static
cp -R out/. ../backend/static/
```

## Demo logins

- `user` / `password`
- `teacher` / `password`
- `student1` / `password`
- `student2` / `password`

Each user has an independent board in persistence.

## API overview

Base path: `/api`

- `GET /api/health`
- `GET /api/hello`
- `GET /api/board`
- `PUT /api/board`
- `POST /api/ai/connectivity`
- `POST /api/ai/chat`

User identity for board/AI routes comes from header `x-username` (defaults to `user` when omitted).

### Example: read board

```bash
curl -sS -H 'x-username: student1' http://127.0.0.1:8010/api/board
```

### Example: update board

```bash
curl -sS -X PUT \
  -H 'Content-Type: application/json' \
  -H 'x-username: student1' \
  -d '{"state":{"columns":[],"cards":{}}}' \
  http://127.0.0.1:8010/api/board
```

### Example: AI chat mutation

```bash
curl -sS -X POST \
  -H 'Content-Type: application/json' \
  -H 'x-username: student1' \
  -d '{"prompt":"Move Prototype analytics view from Discovery to Review"}' \
  http://127.0.0.1:8010/api/ai/chat
```

## Testing

### Frontend unit tests

```bash
cd frontend
npm run test:unit
```

### Frontend e2e tests

```bash
cd frontend
npm run test:e2e
```

### Backend tests

```bash
cd backend
uv sync --project . --extra dev
.venv/bin/pytest -q
```

## Data model and migrations

Migrations are in `backend/migrations`:

- `0001_extensions.sql`
- `0002_kanban_schema.sql`
- `0003_seed_demo_user.sql`

Core tables:

- `app_users`
- `boards`
- `board_snapshots`

The repository auto-creates a user and default board when a known username first requests `/api/board`.

## Troubleshooting

### "Backend unavailable. Using local board state."

Cause: frontend failed to load `/api/board`.

Checklist:

1. Open the app from backend origin (for local backend runs, `http://127.0.0.1:8010/`).
2. Confirm backend is up: `curl -sS http://127.0.0.1:8010/api/health`.
3. Confirm board API works for the logged in user:
   `curl -sS -H 'x-username: teacher' http://127.0.0.1:8010/api/board`.
4. Hard refresh browser after static updates.

### AI says a move happened, but board did not change

Checklist:

1. Ensure AI requests include `x-username` so actions apply to the signed-in user.
2. Check `applied_actions` in `/api/ai/chat` response.
3. Re-fetch the same user's board from `/api/board` and verify columns/cardIds.

### Frequent local startup failures on 8001/8002

Use a stable port and explicit app-dir:

```bash
set -a
source /Users/sanjayfuloria/projects/pm/.env
set +a
/Users/sanjayfuloria/projects/pm/backend/.venv/bin/uvicorn app.main:app --app-dir /Users/sanjayfuloria/projects/pm/backend --host 127.0.0.1 --port 8010
```

### Docker container restarts with "uvicorn: no such file or directory"

Cause: a host virtual environment was copied into the image and replaced container binaries.

Fix: ensure `.dockerignore` excludes local virtualenv paths:

```text
backend/.venv
.venv
```

Then rebuild:

```bash
docker compose up --build -d
```

## Project planning docs

- `docs/PLAN.md`
- `docs/PROGRESS.md`
- `docs/PART5_SUPABASE_SCHEMA.md`

## License

No license file is currently included.
