FROM node:22-alpine AS frontend-builder

WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build


FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

COPY backend/pyproject.toml /app/backend/pyproject.toml
RUN uv sync --project /app/backend --no-dev --no-install-project

COPY backend /app/backend
COPY --from=frontend-builder /workspace/frontend/out /app/backend/static

EXPOSE 8000

CMD ["/app/backend/.venv/bin/uvicorn", "app.main:app", "--app-dir", "/app/backend", "--host", "0.0.0.0", "--port", "8000"]
