.PHONY: help install install-backend install-frontend \
        dev dev-backend dev-frontend \
        test test-verbose \
        lint typespec-compile \
        clean

# ── Цвета ─────────────────────────────────────────────────────────────────────
CYAN  := \033[0;36m
RESET := \033[0m

help: ## Показать список команд
	@echo ""
	@echo "  Calendar of Calls — команды управления проектом"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ── Установка зависимостей ────────────────────────────────────────────────────

install: install-backend install-frontend ## Установить все зависимости

install-backend: ## Установить зависимости бэкенда (pip)
	pip install -r backend/requirements.txt

install-frontend: ## Установить зависимости фронтенда (npm)
	npm install --prefix frontend

# ── Запуск серверов ───────────────────────────────────────────────────────────

# Load environment variables from backend/.env if it exists
ifneq (,$(wildcard backend/.env))
	include backend/.env
	export
endif

dev: ## Запустить бэкенд и фронтенд одновременно (читает backend/.env)
	uvicorn main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend & \
	npm run dev --prefix frontend

dev-backend: ## Запустить FastAPI бэкенд (порт 8000, с hot-reload, читает backend/.env)
	uvicorn main:app --reload --host 0.0.0.0 --port 8000 --app-dir backend

dev-frontend: ## Запустить Vite фронтенд (порт 5173)
	npm run dev --prefix frontend

# ── Тесты ─────────────────────────────────────────────────────────────────────

test: ## Запустить все тесты бэкенда (читает backend/.env)
	cd backend && python3 -m unittest discover -s tests -p "test_*.py"

test-verbose: ## Запустить тесты с подробным выводом (читает backend/.env)
	cd backend && python3 -m unittest discover -s tests -p "test_*.py" -v

test-owner: ## Тесты сценариев владельца (читает backend/.env)
	cd backend && python3 -m unittest discover -s tests -p "test_owner.py" -v

test-guest: ## Тесты сценариев гостя (читает backend/.env)
	cd backend && python3 -m unittest discover -s tests -p "test_guest.py" -v

test-occupancy: ## Тесты правила занятости (читает backend/.env)
	cd backend && python3 -m unittest discover -s tests -p "test_occupancy.py" -v

# ── E2E тесты ─────────────────────────────────────────────────────────────────

test-e2e: ## Запустить e2e тесты (Playwright)
	npm run test:e2e --prefix frontend

# ── TypeSpec ──────────────────────────────────────────────────────────────────

typespec-compile: ## Скомпилировать TypeSpec → openapi.yaml
	cd typespec && npx tsp compile .

# ── Сборка фронтенда ──────────────────────────────────────────────────────────

build-frontend: ## Собрать фронтенд для продакшена
	npm run build --prefix frontend

# ── Очистка ───────────────────────────────────────────────────────────────────

clean: ## Удалить кэш Python и артефакты сборки
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf frontend/dist
