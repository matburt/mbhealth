# MBHealth Documentation

Welcome to the MBHealth documentation. This directory contains comprehensive guides, examples, and setup instructions for the MBHealth application.

## 📚 Documentation Index

### Setup & Configuration
- **[PostgreSQL Setup](POSTGRESQL_SETUP.md)** - Complete guide for setting up PostgreSQL for production deployments
- **[Environment Configuration](../CLAUDE.md#key-file-locations)** - Environment variables and configuration setup

### Development Guides
- **[Error Handling Examples](ERROR_HANDLING_EXAMPLES.md)** - Comprehensive examples of error handling patterns
- **[Architecture Overview](../CLAUDE.md#architecture-overview)** - System architecture and component overview
- **[Development Commands](../CLAUDE.md#development-commands)** - All available make commands and scripts

### Error Handling & Resilience
- **[Error Handling Patterns](../CLAUDE.md#error-handling-and-resilience)** - Backend and frontend error handling documentation
- **[Circuit Breaker Usage](ERROR_HANDLING_EXAMPLES.md#2-circuit-breaker-pattern)** - Circuit breaker implementation examples
- **[Retry Logic](ERROR_HANDLING_EXAMPLES.md#3-retry-logic-with-exponential-backoff)** - Retry patterns and exponential backoff
- **[Health Monitoring](ERROR_HANDLING_EXAMPLES.md#health-monitoring-examples)** - System health and monitoring examples

### API Documentation
- **API Endpoints**: Available at `http://localhost:8000/docs` when backend is running
- **Health Endpoints**: 
  - `GET /api/v1/health/` - Basic service health
  - `GET /api/v1/health/circuit-breakers` - Circuit breaker monitoring
  - `GET /api/v1/health/detailed` - Comprehensive system health

### Database & Migrations
- **[Database Migrations](../CLAUDE.md#database-migrations)** - Alembic migration workflows
- **[Database Structure](../CLAUDE.md#database-structure)** - Core entities and relationships

### Frontend Development
- **[Frontend Architecture](../CLAUDE.md#frontend-architecture-react--typescript--vite)** - React app structure and patterns
- **[Error Boundaries](ERROR_HANDLING_EXAMPLES.md#1-using-error-boundaries)** - React error handling examples
- **[API Integration](ERROR_HANDLING_EXAMPLES.md#3-enhanced-api-calls-with-retry)** - Frontend API patterns

### Testing
- **[Testing Guide](../CLAUDE.md#testing)** - Backend and frontend testing approaches
- **[Error Scenario Testing](ERROR_HANDLING_EXAMPLES.md#testing-error-scenarios)** - Testing error handling patterns

## 🚀 Quick Start

1. **Development Setup**: See [Development Commands](../CLAUDE.md#development-commands)
2. **Database Setup**: Follow [Database Migrations](../CLAUDE.md#database-migrations)
3. **Error Handling**: Review [Error Handling Patterns](../CLAUDE.md#error-handling-and-resilience)
4. **Production Setup**: Use [PostgreSQL Setup](POSTGRESQL_SETUP.md) for production databases

## 🔧 Common Tasks

### Backend Development
```bash
# Start development server
make run

# Run tests with coverage
make test-cov

# Apply database migrations
make db-migrate

# Check system health
curl http://localhost:8000/api/v1/health/detailed
```

### Frontend Development
```bash
# Start development server
cd frontend && npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Error Handling
```python
# Backend error handling
from app.core.exceptions import ValidationException
from app.core.circuit_breaker import circuit_breaker
from app.services.retry_service import retry_on_failure

@circuit_breaker("external_api")
@retry_on_failure("api_call", "external_api")
async def protected_api_call():
    # Your API call here
    pass
```

```tsx
// Frontend error handling
import { useErrorHandler } from '../hooks/useErrorHandler';
import ErrorBoundary from '../components/ErrorBoundary';

function MyComponent() {
  const { withErrorHandling } = useErrorHandler();
  
  const handleAction = async () => {
    await withErrorHandling(async () => {
      // Your async operation here
    });
  };
  
  return (
    <ErrorBoundary>
      {/* Your component content */}
    </ErrorBoundary>
  );
}
```

## 📞 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Architecture Questions**: Refer to [CLAUDE.md](../CLAUDE.md)
- **Error Handling**: See [Error Handling Examples](ERROR_HANDLING_EXAMPLES.md)

## 📝 Contributing

When adding new documentation:
1. Place setup guides and configuration in this `docs/` directory
2. Update this README.md with links to new documentation
3. Follow the existing documentation patterns and formatting
4. Include practical examples where applicable