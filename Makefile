# Команды разработки. Требования: Python 3.11+, uv, Node 20+.

.PHONY: install dev-backend dev-frontend types test lint build

install:  ## Установить зависимости бэка и фронта
	cd backend && uv sync
	cd frontend && npm install

dev-backend:  ## FastAPI на :8000 (мок iiko, см. .env.example)
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:  ## Vite на :5173 (проксирует /api на :8000)
	cd frontend && npm run dev

types:  ## Перегенерировать TS-типы из OpenAPI-схемы бэка
	cd backend && uv run python scripts/export_openapi.py ../frontend/openapi.json
	cd frontend && npx openapi-typescript openapi.json -o src/api/schema.d.ts && rm openapi.json

test:  ## Тесты бэка
	cd backend && uv run pytest -q

lint:  ## Линт бэка + типы фронта
	cd backend && uv run ruff check .
	cd frontend && npm run typecheck

build:  ## Прод-сборка фронта
	cd frontend && npm run build
