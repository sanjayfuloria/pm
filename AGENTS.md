# The Project Management MVP web app

## Business Requirements

This project is building a Project Management App. Key features:
- A user can sign in
- When signed in, the user sees a Kanban board representing their project
- The Kanban board has fixed columns that can be renamed
- The cards on the Kanban board can be moved with drag and drop, and edited
- There is an AI chat feature in a sidebar; the AI is able to create / edit / move one or more cards

## Limitations

For the MVP, there will only be a user sign in (hardcoded to 'user' and 'password') but the database will support multiple users for future.

For the MVP, there will only be 1 Kanban board per signed in user.

For the MVP, this will run locally (in a docker container)

## Technical Decisions

- NextJS frontend
- Python FastAPI backend, including serving the static NextJS site at /
- Everything packaged into a Docker container
- Use "uv" as the package manager for python in the Docker container
- Use Anthropic direct API only for AI calls. An ANTHROPIC_API_KEY is in .env in the project root
- Use Claude Sonnet tier as the model family
- Use Supabase free tier (hosted Postgres) for persistence, with schema migrations applied on startup if needed
- Start and Stop server scripts for Mac, PC, Linux in scripts/

## Starting Point

A working MVP of the frontend has been built and is already in frontend. This is not yet designed for the Docker setup. It's a pure frontend-only demo.

## Color Scheme

- Accent Yellow: `#ecad0a` - accent lines, highlights
- Blue Primary: `#209dd7` - links, key sections
- Purple Secondary: `#753991` - submit buttons, important actions
- Dark Navy: `#032147` - main headings
- Gray Text: `#888888` - supporting text, labels

## Coding standards

1. Use latest versions of libraries and idiomatic approaches as of today
2. Keep it simple - NEVER over-engineer, ALWAYS simplify, NO unnecessary defensive programming. No extra features - focus on simplicity.
3. Be concise. Keep README minimal. IMPORTANT: no emojis ever
4. When hitting issues, always identify root cause before trying a fix. Do not guess. Prove with evidence, then fix the root cause.

## Working documentation

All documents for planning and executing this project will be in the docs/ directory.
Please review the docs/PLAN.md document before proceeding.

## Current status (May 2, 2026)

- Parts 1-8 are implemented and committed.
- Backend and frontend are integrated for persisted board reads/writes through `/api/board`.
- Backend AI connectivity is implemented at `/api/ai/connectivity` using Anthropic direct API and Claude Sonnet tier.
- Part 9 baseline is implemented: structured AI actions are generated in backend and applied through `/api/ai/chat`.
- Frontend AI sidebar is wired to `/api/ai/chat` and refreshes board state after applied actions.
- Remaining Part 9 refinements are conversation history in prompt context and AI audit fields.
- Detailed per-part progress, including git status snapshots, is tracked in `docs/PROGRESS.md`.