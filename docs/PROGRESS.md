# Work Progress and Git Status by Part

This log summarizes progress part-by-part and records the git status snapshot for each part based on files changed during that phase.

## Part 1 - Planning and alignment

Progress
- Locked stack constraints to Anthropic direct API, Claude Sonnet tier, and Supabase free tier.
- Expanded execution plan with checklists, tests, and success criteria.
- Documented frontend codebase structure.

Git status snapshot
- Modified: AGENTS.md, docs/PLAN.md
- Added: frontend/AGENTS.md

## Part 2 - Scaffolding

Progress
- Built backend scaffold with FastAPI app and hello/health endpoints.
- Added docker + compose setup and cross-platform start/stop scripts.
- Added env template and backend/scripts documentation notes.

Git status snapshot
- Added: Dockerfile, docker-compose.yml, .dockerignore, .env.example
- Added: backend/pyproject.toml, backend/app/__init__.py, backend/app/main.py, backend/static/index.html, backend/README.md
- Added: scripts/start-mac.sh, scripts/stop-mac.sh, scripts/start-linux.sh, scripts/stop-linux.sh, scripts/start-windows.ps1, scripts/stop-windows.ps1
- Modified: backend/AGENTS.md, scripts/AGENTS.md, docs/PLAN.md

## Part 3 - Serve existing frontend

Progress
- Converted frontend to static export mode.
- Updated Docker to build frontend export and serve it via backend at /.
- Stabilized Playwright config to avoid port/server reuse conflicts.

Git status snapshot
- Modified: frontend/next.config.ts, frontend/playwright.config.ts, Dockerfile, docs/PLAN.md, backend/AGENTS.md

## Part 4 - Dummy sign-in flow

Progress
- Added login gate with hardcoded user/password.
- Added logout and session-based auth persistence.
- Added unit and e2e coverage for failed login, successful login, and logout.

Git status snapshot
- Modified: frontend/src/app/page.tsx, frontend/tests/kanban.spec.ts, docs/PLAN.md
- Added: frontend/src/app/page.test.tsx
- Modified: frontend/AGENTS.md

## Part 5 - Supabase data model

Progress
- Authored schema proposal and migration order for Supabase free tier.
- Added SQL migrations for extensions, schema, and demo seed board.
- Documented CRUD query patterns and free-tier considerations.

Git status snapshot
- Added: docs/PART5_SUPABASE_SCHEMA.md
- Added: backend/migrations/0001_extensions.sql, backend/migrations/0002_kanban_schema.sql, backend/migrations/0003_seed_demo_user.sql
- Modified: docs/PLAN.md

## Part 6 - Backend CRUD API

Progress
- Implemented board repository/service/dependency layers.
- Added startup migration application path with SUPABASE_DB_URL config.
- Added /api/board GET/PUT with structured error handling.
- Added backend test suite for service/routes/static behavior.

Git status snapshot
- Added: backend/app/config.py, backend/app/errors.py, backend/app/models.py, backend/app/repository.py, backend/app/service.py, backend/app/deps.py
- Modified: backend/app/main.py, backend/pyproject.toml, .env.example, backend/README.md, backend/AGENTS.md, docs/PLAN.md
- Added: backend/tests/test_service.py, backend/tests/test_routes.py, backend/tests/test_main_static.py, backend/tests/__init__.py

## Part 7 - Frontend and backend integration

Progress
- Added frontend board API client for /api/board.
- Integrated Kanban UI with backend load/save path plus local fallback mode.
- Added frontend tests for API client and backend-mode board behavior.

Git status snapshot
- Added: frontend/src/lib/boardApi.ts, frontend/src/lib/boardApi.test.ts
- Modified: frontend/src/components/KanbanBoard.tsx, frontend/src/components/KanbanColumn.tsx, frontend/src/components/KanbanBoard.test.tsx, frontend/src/app/page.tsx, frontend/src/app/page.test.tsx
- Modified: docs/PLAN.md, frontend/AGENTS.md

## Current consolidated git status

At the time of preparing this log, the working tree includes the cumulative changes above across Parts 1-7.

## Part 8 kickoff - AI connectivity

Objective
- Establish Anthropic direct API connectivity in backend using Claude Sonnet tier only.

Initial tasks
- Add Anthropic SDK dependency to backend project.
- Implement a minimal backend AI client wrapper and connectivity route.
- Load and validate ANTHROPIC_API_KEY from environment.
- Add mocked unit tests for success and error paths.

Definition of ready to proceed
- API key available in local .env for manual smoke test.
- Existing backend tests remain green before integrating AI code.

Expected proof for Part 8 completion
- One successful backend call to Claude Sonnet through Anthropic direct API.
- Deterministic endpoint response path for a simple prompt.
- Clear 4xx/5xx handling for missing key and upstream failures.
