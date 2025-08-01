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
- **Database migrations**: `make db-migrate` (upgrade to latest)
- **Create new migration**: `make db-revision message="Description"`
- **Initialize database**: `make db-init` (replaces create_db.py)
- **Reset database**: `make db-reset`
- **Check migration status**: `make db-current`
- **Show migration history**: `make db-history`
- **Downgrade migration**: `make db-downgrade`
- **Purge task queue**: `make purge` (clears all pending Celery tasks)
- **Inspect workers**: `make inspect` (shows active workers and tasks)

### Frontend Commands (from `/frontend` directory)
- **Development server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Preview build**: `npm run preview`
- **Run tests**: `npm test` (interactive mode)
- **Run tests once**: `npm run test:run`
- **Test with coverage**: `npm run test:coverage`
- **Test UI**: `npm run test:ui` (visual test interface)

### Docker Commands (from project root)
- **Start all services**: `docker-compose up -d`
- **Run migrations in Docker**: `docker-compose --profile migrate up migrate`
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
- `app/core/config.py`: Environment-based configuration management with validation and feature flags
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
- `src/config/environment.ts`: Environment-based configuration management with smart defaults
- `src/services/api.ts`: Axios instance with JWT interceptors and environment-aware API URLs
- `src/services/aiAnalysis.ts`: AI analysis and provider management API service
- `src/contexts/AuthContext.tsx`: Authentication state management
- `src/contexts/TimezoneContext.tsx`: Timezone management with backend persistence
- `src/components/`: Reusable UI components
- `src/components/AnalysisCard.tsx`: Real-time analysis status display with progress tracking
- `src/components/CreateProviderModal.tsx`: AI provider configuration interface
- `src/components/EnhancedBloodPressureInsights.tsx`: Advanced blood pressure analytics with clinical categorization
- `src/components/QuickQuestionBox.tsx`: Instant AI health question interface with contextual prompts
- `src/components/FoodAnalysisBox.tsx`: Specialized nutritional analysis with health condition awareness
- `src/components/MainAnalysisInterface.tsx`: Central AI analysis hub with quick boxes integration
- `src/components/AnalysisHelpGuide.tsx`: Comprehensive interactive help system for AI features
- `src/components/AnalysisPresets.tsx`: Pre-configured analysis templates for common health scenarios
- `src/components/SavedAnalysisConfigs.tsx`: Management interface for reusable analysis configurations
- `src/pages/`: Page-level components
- `src/pages/AIProvidersPage.tsx`: AI provider management interface
- `src/pages/DataVisualizationPage.tsx`: Advanced health data visualization with enhanced insights
- `src/services/`: API service layer organized by domain
- `src/types/`: TypeScript type definitions matching backend schemas
- `src/types/aiAnalysis.ts`: AI analysis and provider type definitions
- `src/utils/formatters.ts`: Centralized value formatting utilities for consistent display
- `src/utils/bloodPressure.ts`: Blood pressure categorization and clinical analysis utilities

### Database Structure
- **SQLite** for development (file: `backend/health_data.db`)
- **PostgreSQL** for production
- **Alembic** for database migrations and schema versioning
- **Redis** for caching, sessions, and background job queue
- Core entities: User, HealthData, Family, CareTeam, Note, AIAnalysis, AIProvider, AnalysisJob, AnalysisSettings, AnalysisSchedule, AnalysisWorkflow, NotificationChannel, NotificationPreference

### AI Integration
- **Multiple AI providers**: OpenAI, OpenRouter, Google Generative AI, Anthropic Claude, Custom providers
- **Provider management**: Dynamic provider configuration and testing
- **Background processing**: Celery/Redis for async analysis processing
- **Health data analysis**: AI-powered insights and recommendations
- **Encrypted storage**: Secure API key management with Fernet encryption
- **Real-time updates**: WebSocket support for analysis status updates
- **Configurable via environment variables**: API keys are optional

### Configuration Management
- **Environment-based configuration**: Automatic environment detection with smart defaults
- **Backend validation**: Pydantic-based validation with security checks and feature flags
- **Frontend configuration**: Environment-aware API URLs and WebSocket endpoints
- **Development/Production modes**: Separate configuration files for different environments
- **Security validation**: Prevents deployment with default secrets in production
- **Feature flags**: Enable/disable AI analysis, notifications, and workflows per environment

### Authentication Flow
- JWT tokens stored in localStorage
- Automatic token attachment via axios interceptors
- 401 responses automatically redirect to login page
- Token expiration handled gracefully

### Notification System
- **Apprise integration**: Universal notification support for 100+ services
- **Event-based notifications**: Real-time alerts for analysis completion, schedule execution, workflow progress
- **Encrypted storage**: Notification service URLs encrypted using Fernet encryption
- **Smart management**: Rate limiting, quiet hours, priority filtering, content customization
- **Channel types**: Email, Discord, Slack, Teams, Telegram, SMS, Webhooks, Push notifications
- **Service locations**:
  - `app/services/notification_service.py`: Core notification orchestration
  - `app/models/notification.py`: Database models for channels, preferences, history
  - `app/api/api_v1/endpoints/notifications.py`: Notification management API
  - Frontend components in `src/components/Notification*.tsx`

## Database Migrations

### Important: Creating New Migrations
**ALWAYS create a new migration when you:**
- Add or remove a model/table
- Add, remove, or modify columns
- Change column types or constraints
- Add or modify indexes
- Change foreign key relationships

### Migration Workflow
1. **Make model changes** in `app/models/`
2. **Generate migration**: `make db-revision message="Add new column to users"`
3. **Review the generated migration** in `alembic/versions/`
4. **Apply migration**: `make db-migrate`
5. **Test rollback**: `make db-downgrade` (then `make db-migrate` to go back up)

### Common Migration Commands
- `make db-revision message="Description"` - Generate new migration after model changes
- `make db-migrate` - Apply pending migrations
- `make db-current` - Check current migration version
- `make db-history` - View migration history
- `make db-downgrade` - Rollback one migration
- `make db-reset` - Delete database and recreate from migrations

### Migration Best Practices
- Always review auto-generated migrations before applying
- Test migrations on a copy of production data
- Include both upgrade and downgrade operations
- Keep migrations small and focused
- Never edit applied migrations - create new ones instead

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

## Error Handling and Resilience

### Backend Error Handling
- **Structured Exceptions**: Use `app.core.exceptions` for consistent error responses
  - `AppException`: Base class with error codes and user-friendly messages
  - `ValidationException`: For input validation errors (422 status)
  - `AIProviderException`: For AI service failures (503/500 status)
  - `DatabaseException`: For database operation failures
  - `CircuitBreakerException`: When services are temporarily unavailable

- **Circuit Breaker Pattern**: Protect against cascading failures
  - Import: `from app.core.circuit_breaker import circuit_breaker, circuit_registry`
  - Usage: `@circuit_breaker("service_name", failure_threshold=5, recovery_timeout=120)`
  - Monitor: GET `/api/v1/health/circuit-breakers` for status

- **Retry Logic**: Automatic retry with exponential backoff
  - Import: `from app.services.retry_service import retry_on_failure, retry_service`
  - Decorator: `@retry_on_failure("service_name", "ai_provider", max_attempts=3)`
  - Manual: `await retry_service.retry_async(func, *args, service_name="test")`

- **Database Operations**: Use safe wrappers for transient error handling
  - Import: `from app.core.exceptions import safe_database_operation`
  - Usage: `@safe_database_operation("user creation")`

### Frontend Error Handling
- **Error Boundaries**: React components that catch JavaScript errors
  - `ErrorBoundary`: Wrap components to catch and display errors gracefully
  - `RouteErrorBoundary`: Route-level error handling for navigation errors
  - Usage: Already integrated in `main.tsx` and route definitions

- **Centralized Error Hook**: Consistent error handling across components
  - Import: `import { useErrorHandler } from './hooks/useErrorHandler'`
  - Usage: `const { handleError, withErrorHandling, clearError } = useErrorHandler()`
  - Auto-retry: `const result = await withErrorHandling(async () => api.call())`

- **API Service**: Enhanced axios client with retry and circuit breaker logic
  - Import: `import { apiGet, apiPost, apiPut, apiDelete } from './services/api'`
  - Retry config: `apiGet(url, config, { retries: 3, retryDelay: 1000 })`
  - Automatic handling of 401, 403, 404, 5xx errors

### Error Handling Best Practices
1. **Never use bare `except:` clauses** - always specify exception types
2. **Use structured exceptions** from `app.core.exceptions` for consistent responses
3. **Apply circuit breakers** to external service calls (AI providers, APIs)
4. **Wrap database operations** with `@safe_database_operation` decorator
5. **Use retry decorators** for transient failures (network, rate limits)
6. **Log errors with context** using `log_exception_context(error, context)`
7. **Handle errors in React** with error boundaries and the `useErrorHandler` hook
8. **Test error scenarios** - see `tests/unit/test_error_handling.py` for examples

### Health Monitoring
- **Health Endpoints**: 
  - GET `/api/v1/health/` - Basic service health
  - GET `/api/v1/health/circuit-breakers` - Circuit breaker status
  - GET `/api/v1/health/detailed` - Comprehensive system health
- **Circuit Breaker Monitoring**: Check failure counts and recovery times
- **Error Logging**: All errors logged with structured context for observability

## Testing
- **Backend**: pytest with coverage reporting, async test support
- **Frontend**: Vite's built-in test runner
- **Test databases**: Separate test database configurations
- **Error Testing**: Comprehensive error scenario tests in `test_error_handling.py`
- Run `make test` (backend) or `npm test` (frontend) for testing