# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend Commands (from `/backend` directory)
- **Development server**: `uv run python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- **Production server**: `make run`
- **Debug mode**: `make run-debug`
- **Background worker**: `make worker` (for AI analysis processing)
- **Worker debug mode**: `make worker-debug`
- **Monitor tasks**: `make monitor` (Celery Flower interface)
- **Install dependencies**: `uv sync --group dev`
- **Run tests**: `uv run pytest` or `make test`
- **Run tests with coverage**: `make test-cov`
- **Format code**: `make format` (runs black and isort)
- **Lint code**: `make lint` (runs ruff)
- **Type check**: `make type-check` (runs mypy)
- **Full dev checks**: `make dev` (format, lint, type-check, test)
- **Database migrations**: `make db-migrate`
- **Reset database**: `make db-reset`
- **Purge task queue**: `make purge` (clears all pending Celery tasks)
- **Inspect workers**: `make inspect` (shows active workers and tasks)

### Frontend Commands (from `/frontend` directory)
- **Development server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Preview build**: `npm run preview`

### Docker Commands (from project root)
- **Start all services**: `docker-compose up -d`
- **View logs**: `docker-compose logs -f`
- **Stop services**: `docker-compose down`

### Redis Commands (required for background processing)
- **Start Redis**: `redis-server` or `brew services start redis` (macOS)
- **Redis CLI**: `redis-cli`
- **Check Redis**: `redis-cli ping` (should return PONG)
- **Docker Redis**: `docker run -d --name redis -p 6379:6379 redis:alpine`

## Architecture Overview

### Backend Architecture (FastAPI + SQLAlchemy)
- **FastAPI** REST API with automatic OpenAPI documentation at `/docs`
- **SQLAlchemy** ORM with Alembic migrations
- **JWT authentication** with bearer tokens
- **API versioning** via `/api/v1` prefix
- **Dependency injection** pattern for database sessions and authentication
- **Pydantic schemas** for request/response validation
- **Service layer** pattern separating business logic from API endpoints

### Key Backend Components
- `app/api/api_v1/api.py`: Main API router that includes all endpoint routers
- `app/core/config.py`: Configuration management with pydantic-settings
- `app/core/database.py`: Database connection and session management
- `app/core/security.py`: JWT token handling and password hashing
- `app/core/celery_app.py`: Celery configuration for background processing
- `app/models/`: SQLAlchemy database models
- `app/schemas/`: Pydantic request/response schemas
- `app/services/`: Business logic and external API integrations
- `app/services/ai_providers/`: AI provider implementations and abstractions
- `app/services/ai_analysis_service.py`: AI analysis orchestration service
- `app/tasks/`: Celery background task definitions
- `app/api/deps.py`: Dependency injection utilities
- `app/api/websocket.py`: WebSocket connection management for real-time updates

### Frontend Architecture (React + TypeScript + Vite)
- **React 18** with TypeScript for type safety
- **Vite** for fast development and building
- **React Router** for client-side routing
- **Axios** for API communication with automatic JWT token handling
- **Tailwind CSS** for styling
- **Recharts** for data visualization
- **React Hook Form** for form management

### Key Frontend Components
- `src/services/api.ts`: Axios instance with JWT interceptors (base URL: http://localhost:8000/api/v1)
- `src/services/aiAnalysis.ts`: AI analysis and provider management API service
- `src/contexts/AuthContext.tsx`: Authentication state management
- `src/components/`: Reusable UI components
- `src/components/AnalysisCard.tsx`: Real-time analysis status display with progress tracking
- `src/components/CreateProviderModal.tsx`: AI provider configuration interface
- `src/pages/`: Page-level components
- `src/pages/AIProvidersPage.tsx`: AI provider management interface
- `src/services/`: API service layer organized by domain
- `src/types/`: TypeScript type definitions matching backend schemas
- `src/types/aiAnalysis.ts`: AI analysis and provider type definitions

### Database Structure
- **SQLite** for development (file: `backend/health_data.db`)
- **PostgreSQL** for production
- **Redis** for caching, sessions, and background job queue
- **Alembic** for database migrations (we aren't actually using alembic right now, call create_db.py for the moment)
- Core entities: User, HealthData, Family, CareTeam, Note, AIAnalysis, AIProvider, AnalysisJob, AnalysisSettings

### AI Integration
- **Multiple AI providers**: OpenAI, OpenRouter, Google Generative AI, Anthropic Claude, Custom providers
- **Provider management**: Dynamic provider configuration and testing
- **Background processing**: Celery/Redis for async analysis processing
- **Health data analysis**: AI-powered insights and recommendations
- **Encrypted storage**: Secure API key management with Fernet encryption
- **Real-time updates**: WebSocket support for analysis status updates
- **Configurable via environment variables**: API keys are optional

### Authentication Flow
- JWT tokens stored in localStorage
- Automatic token attachment via axios interceptors
- 401 responses automatically redirect to login page
- Token expiration handled gracefully

## Development Patterns

### Backend Patterns
- **Repository pattern**: Database operations abstracted through SQLAlchemy models
- **Dependency injection**: Database sessions and current user injected via FastAPI dependencies
- **Schema validation**: All API inputs/outputs validated with Pydantic
- **Error handling**: Consistent HTTP exception responses
- **Environment configuration**: All settings configurable via `.env` file

### Frontend Patterns
- **Custom hooks**: Reusable logic for API calls and state management
- **Component composition**: Small, focused components composed into larger features
- **Type-first development**: TypeScript interfaces match backend schemas
- **Centralized API**: All HTTP requests go through the `api.ts` service layer

### Code Quality Tools
- **Backend**: black (formatting), isort (import sorting), ruff (linting), mypy (type checking), pytest (testing)
- **Frontend**: ESLint (linting), TypeScript compiler (type checking)
- **Pre-commit hooks**: Automated code quality checks

## Key File Locations
- Backend entry point: `backend/main.py`
- Frontend entry point: `frontend/src/main.tsx`
- API documentation: http://localhost:8000/docs (when backend is running)
- Environment config: `backend/.env` (create from README examples)
- Database file: `backend/health_data.db` (SQLite, auto-created)

## Testing
- **Backend**: pytest with coverage reporting, async test support
- **Frontend**: Vite's built-in test runner
- **Test databases**: Separate test database configurations
- Run `make test` (backend) or `npm test` (frontend) for testing