# Backend

FastAPI backend scaffold for the Project Management MVP.

## Run locally without Docker

```bash
cd backend
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API endpoints

- `GET /api/health`
- `GET /api/hello`
- `GET /api/board` (uses `X-Username` header, defaults to `user`)
- `PUT /api/board` with body `{ "state": { ... } }`
- `POST /api/ai/connectivity` with body `{ "prompt": "What is 2+2?" }`

## Static page

- `GET /` serves `backend/static/index.html`

## Environment

- `SUPABASE_DB_URL` is required for board APIs and startup migrations.
- `ANTHROPIC_API_KEY` is required for AI connectivity API.
- `ANTHROPIC_MODEL` is optional and defaults to `claude-sonnet-4-5-20250929`.

## Tests

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e '.[dev]'
pytest
```
