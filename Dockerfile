# ── Stage 1: сборка фронтенда ─────────────────────────────────────────────────
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: финальный образ ──────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Зависимости Python
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Исходники бэкенда
COPY backend/ ./

# Статика фронтенда
COPY --from=frontend-build /app/frontend/dist ./static

ENV PORT=8000

EXPOSE $PORT

CMD uvicorn main:app --host 0.0.0.0 --port $PORT
