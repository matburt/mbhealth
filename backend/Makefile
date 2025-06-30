.PHONY: help install install-dev install-test install-docs install-prod run run-dev test test-cov lint format type-check clean build publish

# Default target
help: ## Show this help message
	@echo "MBHealth Backend - Available Commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Installation targets
install: ## Install production dependencies
	uv sync --no-dev

install-dev: ## Install development dependencies
	uv sync --group dev

install-test: ## Install test dependencies
	uv sync --group test

install-docs: ## Install documentation dependencies
	uv sync --group docs

install-prod: ## Install production dependencies
	uv sync --group production

# Development targets
run: ## Run the application in production mode
	uv run python -m uvicorn main:app --host 0.0.0.0 --port 8000

run-dev: ## Run the application in development mode
	uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

run-debug: ## Run the application in debug mode
	uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 --log-level debug

# Background processing targets
worker: ## Start Celery worker for background tasks
	uv run celery -A app.core.celery_app worker --loglevel=info

worker-debug: ## Start Celery worker in debug mode
	uv run celery -A app.core.celery_app worker --loglevel=debug

monitor: ## Monitor Celery tasks and workers
	uv run celery -A app.core.celery_app flower

purge: ## Purge all Celery tasks from queue
	uv run celery -A app.core.celery_app purge -f

inspect: ## Inspect active Celery workers and tasks
	uv run celery -A app.core.celery_app inspect active

# Testing targets
test: ## Run tests
	uv run pytest

test-cov: ## Run tests with coverage
	uv run pytest --cov=app --cov-report=html --cov-report=term

test-watch: ## Run tests in watch mode
	uv run pytest-watch

# Code quality targets
lint: ## Run linting checks
	uv run ruff check .

format: ## Format code with black and isort
	uv run black .
	uv run isort .

format-check: ## Check code formatting
	uv run black --check .
	uv run isort --check-only .

type-check: ## Run type checking
	uv run mypy app/

# Database targets
db-migrate: ## Run database migrations
	uv run alembic upgrade head

db-revision: ## Create a new migration
	uv run alembic revision --autogenerate -m "$(message)"

db-downgrade: ## Downgrade database
	uv run alembic downgrade -1

db-reset: ## Reset database (delete and recreate)
	rm -f health_data.db
	uv run alembic upgrade head

db-history: ## Show migration history
	uv run alembic history

db-current: ## Show current migration
	uv run alembic current

db-init: ## Initialize database with migrations (replaces create_db.py)
	uv run python -c "from app.core.database import init_db; init_db()"

# Documentation targets
docs-serve: ## Serve documentation locally
	uv run mkdocs serve

docs-build: ## Build documentation
	uv run mkdocs build

# Build and publish targets
build: ## Build the package
	uv build

publish: ## Publish to PyPI
	uv publish

# Utility targets
clean: ## Clean build artifacts
	rm -rf build/
	rm -rf dist/
	rm -rf *.egg-info/
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -rf .coverage
	find . -type d -name __pycache__ -delete
	find . -type f -name "*.pyc" -delete

shell: ## Start a Python shell with the app context
	uv run python -c "from app.core.database import engine; from app.models import *; print('Database models loaded successfully')"

# Development setup
setup: install-dev install-test ## Set up development environment
	@echo "Development environment set up successfully!"
	@echo "Run 'make run-dev' to start the development server"

# Quick development workflow
dev: format lint type-check test ## Run full development checks
	@echo "All checks passed! 🎉"

# Production deployment
deploy: clean build ## Prepare for production deployment
	@echo "Package built successfully for deployment" 