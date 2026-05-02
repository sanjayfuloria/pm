# Project Plan

This document defines implementation phases, checklists, tests, and success criteria.

## Execution status (May 2, 2026)

- Completed: Parts 1-8
- In progress next: Part 9 (structured AI board operations, baseline implemented)
- Detailed per-part progress and git status snapshots: `docs/PROGRESS.md`

## Global constraints

- Frontend: Next.js app in frontend/
- Backend: FastAPI app in backend/
- Packaging: single Docker workflow for local run
- Python package manager in container: uv
- AI provider: Anthropic direct API only
- AI model family: Claude Sonnet tier
- Database: Supabase hosted Postgres, free tier constraints only
- MVP auth UX: hardcoded credentials user/password
- MVP board model: one board per signed-in user

## Part 1: Planning and alignment

Goal: lock requirements and execution sequence before implementation.

Checklist
- [x] Confirm business requirements and technical stack in root AGENTS.md.
- [x] Update provider choices to Anthropic direct API + Claude Sonnet tier.
- [x] Update persistence choice to Supabase free tier.
- [x] Enrich this plan with detailed checklists, tests, and success criteria.
- [x] Create frontend/AGENTS.md documenting the existing frontend codebase.
- [x] User reviews and approves plan before moving to implementation phases.

Tests
- Manual review by user of docs/PLAN.md and frontend/AGENTS.md.

Success criteria
- Plan is explicit enough for phased execution without guessing.
- Technical choices match user-approved constraints.

## Part 2: Scaffolding

Goal: establish runnable backend + container + platform scripts with a proven hello path.

Checklist
- [x] Create backend project skeleton (app package, main entrypoint, config module).
- [x] Add health endpoint and sample API endpoint.
- [x] Add static hello page serving path to verify backend web serving.
- [x] Create Dockerfile with uv-based Python dependency flow.
- [x] Add docker-compose for local orchestration.
- [x] Create start/stop scripts for macOS, Linux, and Windows in scripts/.
- [x] Add .env example with required env vars.

Tests
- [x] Build container image successfully.
- [x] Start stack with script and verify backend responds.
- [x] Verify / serves hello page and /api health endpoint returns success.
- [x] Stop stack cleanly with script.

Success criteria
- Fresh clone can run one command per platform to start and stop the app.
- Hello page and sample API both work from containerized setup.

## Part 3: Serve existing frontend

Goal: ship current Next.js Kanban UI through backend/container path.

Checklist
- [x] Configure frontend static build output for containerized serving path.
- [x] Wire backend to serve built frontend assets at /.
- [x] Ensure frontend asset routing works under backend host.
- [x] Ensure existing frontend tests are runnable in CI/local workflow.

Tests
- [x] Run frontend unit tests.
- [x] Run frontend e2e tests against served app.
- [x] Verify board renders at / with 5 columns.

Success criteria
- Kanban demo loads from integrated stack at /.
- No regressions in existing unit/e2e frontend tests.

## Part 4: Dummy sign-in flow

Goal: gate board access behind MVP login/logout flow.

Checklist
- [x] Add login screen on first visit.
- [x] Validate credentials against hardcoded user/password.
- [x] Persist authenticated state for session.
- [x] Add logout action that clears auth state.
- [x] Block board routes when unauthenticated.

Tests
- [x] Unit tests for login validation and auth state transitions.
- [x] Integration test for redirect/gating behavior.
- [x] E2E test: failed login, successful login, logout.

Success criteria
- Unauthenticated users cannot access board UI.
- Correct credentials always allow access.
- Logout reliably returns user to login state.

## Part 5: Supabase data model

Goal: define storage model for one-board-per-user Kanban on Supabase free tier.

Checklist
- [x] Propose relational schema (users, boards, board snapshots or normalized cards/columns).
- [x] Use JSONB only where it simplifies MVP operations.
- [x] Define primary keys, foreign keys, indexes, and uniqueness constraints.
- [x] Define migration files and migration order.
- [x] Document Supabase free-tier considerations (resource limits, connection limits, backup expectations).
- [x] Capture CRUD query patterns used by backend routes.
- [x] Get user sign-off on schema before coding persistence layer.

Tests
- [ ] SQL migration apply test on clean database.
- [ ] SQL rollback or idempotency check for local development.
- [ ] Basic query smoke tests for read/update board operations.

Success criteria
- Schema supports current MVP and future multi-user expansion.
- Schema can be initialized repeatably from migrations.

## Part 6: Backend CRUD API

Goal: implement stable board APIs backed by Supabase.

Checklist
- [x] Add Supabase client integration in backend config.
- [x] Implement startup migration/verification step.
- [x] Implement routes for read board and update board for authenticated user.
- [x] Validate request payloads and return typed responses.
- [x] Add structured error handling (4xx for client, 5xx for server).
- [x] Add backend unit tests around service and route layers.

Tests
- [x] Unit tests for board service operations.
- [x] Route tests for success and validation failures.
- [ ] Integration test with test Supabase project or local Postgres-compatible target.

Success criteria
- Board changes persist across restarts.
- API contract is deterministic and tested.

## Part 7: Frontend and backend integration

Goal: move frontend state from local-only to persisted backend state.

Checklist
- [x] Replace local initial-only data flow with backend fetch on load.
- [x] Persist rename/add/delete/move operations through backend API.
- [x] Add loading and error states for fetch and mutation paths.
- [x] Keep optimistic UI minimal and predictable.
- [x] Preserve existing UX behavior where possible.

Tests
- [x] Unit tests for frontend API client functions.
- [x] Component/integration tests for load and mutation flows.
- [ ] E2E tests verifying persistence after page reload.

Success criteria
- User interactions update backend and survive reload/restart.
- UI remains responsive and clear on API failure.

## Part 8: AI connectivity

Goal: prove Anthropic direct API integration using Claude Sonnet tier.

Checklist
- [x] Add Anthropic SDK dependency and backend client wrapper.
- [x] Read ANTHROPIC_API_KEY from environment safely.
- [x] Add minimal AI route/service for connectivity check.
- [x] Implement deterministic test prompt path (for example 2+2).

Tests
- [x] Connectivity smoke test against Anthropic direct endpoint.
- [x] Unit tests with mocked Anthropic client.
- [x] Error-path test for missing/invalid API key.

Success criteria
- Backend can complete a successful request to Claude Sonnet.
- Failure scenarios return actionable backend errors.

## Part 9: Structured AI board operations

Goal: support AI responses that can optionally update board state.

Checklist
- [x] Define strict response schema for AI output (message + optional board actions).
- [ ] Send current board JSON + user prompt + conversation history to model.
- [x] Validate model output against schema before applying changes.
- [x] Implement backend action executor for create/edit/move card operations.
- [x] Persist AI-applied board changes through same board service layer.
- [ ] Add audit fields for AI-originated updates.

Tests
- [ ] Unit tests for schema parsing and rejection of invalid outputs.
- [x] Unit tests for action executor behavior.
- [x] Integration tests for chat request causing valid board mutation.
- [ ] Regression tests for no-op responses.

Success criteria
- AI responses are schema-valid or safely rejected.
- Valid AI actions persist and match expected board changes.

## Part 10: AI chat sidebar UX

Goal: add full chat sidebar tied to backend AI workflow and board refresh.

Checklist
- [ ] Add sidebar layout with message list, input, and send actions.
- [ ] Hook chat UI to backend AI endpoints.
- [ ] Render chat history and request status states.
- [ ] Refresh board state automatically after AI-applied updates.
- [ ] Preserve mobile and desktop usability.

Tests
- [ ] Component tests for chat input, submit, loading, and error states.
- [ ] Integration tests for message rendering and board refresh triggers.
- [ ] E2E scenario: ask AI to move/create/edit card and verify UI updates.

Success criteria
- Chat works end-to-end with backend.
- AI-triggered board changes are visible without manual refresh.
- Core interactions remain stable across viewport sizes.

## Definition of done for MVP

- [ ] Local Docker run works on macOS, Linux, and Windows scripts.
- [ ] Login gate + persistent board + AI sidebar all function end to end.
- [ ] Anthropic direct API with Claude Sonnet tier is the only AI path.
- [ ] Supabase free-tier-backed persistence is documented and working.
- [ ] Unit/integration/e2e tests pass at agreed coverage level.