# Error Handling Examples

This document provides practical examples of using the error handling and resilience patterns implemented in the MBHealth application.

## Backend Examples

### 1. Using Structured Exceptions

```python
from app.core.exceptions import ValidationException, AIProviderException, DatabaseException

# Validation error
if not user_input.email:
    raise ValidationException(
        field="email",
        message="Email is required",
        value=user_input.email
    )

# AI provider error
try:
    result = await openai_api_call()
except Exception as e:
    raise AIProviderException(
        provider="openai",
        message=str(e),
        details={"model": "gpt-3.5-turbo", "attempt": 1},
        is_transient=True  # Indicates this can be retried
    )

# Database error
try:
    db.commit()
except SQLAlchemyError as e:
    raise DatabaseException(
        operation="user_creation",
        message=str(e),
        is_transient=_is_connection_error(e)
    )
```

### 2. Circuit Breaker Pattern

```python
from app.core.circuit_breaker import circuit_breaker

class ExternalAPIService:
    @circuit_breaker("external_api", failure_threshold=5, recovery_timeout=60)
    async def call_external_api(self, data):
        """This method is protected by a circuit breaker"""
        async with httpx.AsyncClient() as client:
            response = await client.post("https://api.example.com", json=data)
            response.raise_for_status()
            return response.json()

# Check circuit breaker status
from app.core.circuit_breaker import circuit_registry

breaker = circuit_registry.get("external_api")
if breaker:
    stats = breaker.stats
    print(f"Circuit state: {stats['state']}")
    print(f"Failure count: {stats['failure_count']}")
```

### 3. Retry Logic with Exponential Backoff

```python
from app.services.retry_service import retry_on_failure, retry_service

# Using decorator
@retry_on_failure(
    "database_operation", 
    "database", 
    max_attempts=3,
    retryable_exceptions=(ConnectionError, TimeoutError)
)
async def create_user(user_data):
    # Database operation that might fail transiently
    return db.create(user_data)

# Using service directly
async def complex_operation():
    return await retry_service.retry_async(
        some_unreliable_function,
        arg1, arg2,
        service_name="complex_op",
        service_type="external_api",
        retryable_exceptions=(httpx.RequestError, httpx.HTTPStatusError)
    )
```

### 4. Safe Database Operations

```python
from app.core.exceptions import safe_database_operation

class UserService:
    @safe_database_operation("user creation")
    def create_user(self, user_data):
        """Automatically wraps database errors in DatabaseException"""
        user = User(**user_data)
        self.db.add(user)
        self.db.commit()
        return user

    @safe_database_operation("user update")  
    def update_user(self, user_id, updates):
        user = self.db.query(User).filter(User.id == user_id).first()
        for key, value in updates.items():
            setattr(user, key, value)
        self.db.commit()
        return user
```

### 5. AI Provider with Full Protection

```python
from app.core.circuit_breaker import circuit_breaker
from app.services.retry_service import retry_on_failure

class AIProvider:
    @circuit_breaker("ai_analysis", failure_threshold=5, recovery_timeout=120)
    @retry_on_failure(
        "ai_analysis", 
        "ai_provider", 
        max_attempts=3,
        retryable_exceptions=(httpx.HTTPStatusError, httpx.RequestError)
    )
    async def generate_analysis(self, prompt, data):
        """Fully protected AI analysis with circuit breaker and retry"""
        try:
            response = await self._call_ai_api(prompt, data)
            return self._process_response(response)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:  # Rate limit
                raise  # Will be retried by decorator
            elif e.response.status_code >= 500:  # Server error
                raise  # Will be retried by decorator
            else:  # Client error (4xx) - don't retry
                raise AIProviderError(f"AI API error: {e.response.status_code}")
```

### 6. Error Logging with Context

```python
from app.core.exceptions import log_exception_context

try:
    result = await process_health_data(user_id, data)
except Exception as e:
    log_exception_context(
        e,
        {
            "user_id": user_id,
            "data_type": data.get("type"),
            "operation": "process_health_data",
            "timestamp": datetime.utcnow().isoformat()
        },
        level="error"
    )
    raise  # Re-raise after logging
```

## Frontend Examples

### 1. Using Error Boundaries

```tsx
// Component-level error boundary
import ErrorBoundary from './components/ErrorBoundary';

function DataVisualizationPage() {
  return (
    <ErrorBoundary>
      <ComplexChartComponent />
      <DataTableComponent />
    </ErrorBoundary>
  );
}

// Custom fallback UI
function CustomErrorFallback({ error, retry }) {
  return (
    <div className="error-container">
      <h2>Chart Loading Failed</h2>
      <p>Unable to load the data visualization.</p>
      <button onClick={retry}>Try Again</button>
    </div>
  );
}

<ErrorBoundary fallback={<CustomErrorFallback />}>
  <ChartComponent />
</ErrorBoundary>
```

### 2. Using the Error Handler Hook

```tsx
import { useErrorHandler } from '../hooks/useErrorHandler';

function UserProfileComponent() {
  const { handleError, withErrorHandling, isLoading, error, clearError } = useErrorHandler();

  const updateProfile = async (data) => {
    const result = await withErrorHandling(async () => {
      return await apiPut('/users/profile', data);
    });

    if (result) {
      // Success - result contains the response data
      toast.success('Profile updated successfully');
    }
    // Error handling is automatic - no need to handle manually
  };

  const handleManualError = async () => {
    try {
      await someRiskyOperation();
    } catch (err) {
      const appError = handleError(err);
      // appError contains structured error information
      console.log('Error code:', appError.errorCode);
      console.log('User message:', appError.userMessage);
    }
  };

  return (
    <div>
      {error && (
        <div className="error-banner">
          <p>{error.userMessage}</p>
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
      
      <form onSubmit={updateProfile}>
        {/* Form fields */}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}
```

### 3. Enhanced API Calls with Retry

```tsx
import { apiGet, apiPost } from '../services/api';

// API call with custom retry configuration
const loadAnalysisData = async (analysisId) => {
  try {
    const data = await apiGet(
      `/ai-analysis/${analysisId}`,
      {}, // axios config
      { 
        retries: 5, 
        retryDelay: 2000,
        retryCondition: (error) => {
          // Custom retry logic
          return error.response?.status >= 500 || error.code === 'NETWORK_ERROR';
        }
      }
    );
    return data;
  } catch (error) {
    // Error has been retried automatically
    console.error('Analysis loading failed after retries:', error);
    throw error;
  }
};

// API call with circuit breaker integration
const createAnalysis = async (analysisData) => {
  return await apiPost('/ai-analysis', analysisData, {
    timeout: 30000 // 30 second timeout
  });
};
```

### 4. Error-Aware Components

```tsx
function AIAnalysisCard({ analysisId }) {
  const [analysis, setAnalysis] = useState(null);
  const { withErrorHandling, isLoading, error } = useErrorHandler({
    onError: (error) => {
      // Custom error handling
      if (error.errorCode === 'AI_PROVIDER_ERROR') {
        // Show specific UI for AI provider errors
        toast.error('AI analysis is temporarily unavailable');
      }
    }
  });

  const loadAnalysis = useCallback(async () => {
    const result = await withErrorHandling(async () => {
      return await apiGet(`/ai-analysis/${analysisId}`);
    });
    
    if (result) {
      setAnalysis(result);
    }
  }, [analysisId, withErrorHandling]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  if (isLoading) return <LoadingSpinner />;
  
  if (error) {
    return (
      <div className="analysis-error">
        <h3>Analysis Unavailable</h3>
        <p>{error.userMessage}</p>
        {error.isTransient && (
          <button onClick={loadAnalysis}>Retry</button>
        )}
      </div>
    );
  }

  return <AnalysisDisplay analysis={analysis} />;
}
```

## Health Monitoring Examples

### 1. Checking Circuit Breaker Health

```python
# In a health check endpoint or monitoring script
from app.core.circuit_breaker import get_circuit_breaker_health

async def monitor_system_health():
    cb_health = await get_circuit_breaker_health()
    
    if cb_health["overall_health"] == "degraded":
        # Send alert to monitoring system
        await send_alert({
            "level": "warning",
            "message": f"{cb_health['total_breakers'] - cb_health['healthy_breakers']} circuit breakers are open",
            "details": cb_health["breakers"]
        })
    
    return cb_health
```

### 2. Custom Health Checks

```python
from app.api.api_v1.endpoints.health import router

@router.get("/database")
async def database_health():
    try:
        # Simple database connectivity check
        db.execute("SELECT 1")
        return {"status": "healthy", "message": "Database connection OK"}
    except Exception as e:
        log_exception_context(e, {"component": "database_health_check"})
        return {"status": "unhealthy", "message": "Database connection failed"}

@router.get("/ai-providers")
async def ai_providers_health():
    # Check if AI providers are responsive
    providers_status = {}
    
    for provider_name in ["openai", "anthropic", "google"]:
        breaker = circuit_registry.get(f"{provider_name}_analysis")
        if breaker:
            providers_status[provider_name] = breaker.stats
        else:
            providers_status[provider_name] = {"status": "unknown"}
    
    return {"providers": providers_status}
```

## Testing Error Scenarios

### 1. Backend Error Testing

```python
import pytest
from unittest.mock import Mock, patch
from app.core.exceptions import AIProviderException
from app.services.retry_service import RetryService

@pytest.mark.asyncio
async def test_retry_service_with_transient_failures():
    retry_service = RetryService()
    call_count = 0
    
    async def flaky_function():
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise Exception("Temporary failure")
        return "success"
    
    result = await retry_service.retry_async(
        flaky_function,
        service_name="test",
        retryable_exceptions=(Exception,)
    )
    
    assert result == "success"
    assert call_count == 3

@pytest.mark.asyncio
async def test_circuit_breaker_opens_after_failures():
    from app.core.circuit_breaker import CircuitBreaker
    
    breaker = CircuitBreaker("test", failure_threshold=2)
    
    async def failing_function():
        raise Exception("Always fails")
    
    # First failure
    with pytest.raises(Exception):
        await breaker.call(failing_function)
    
    # Second failure - should open circuit
    with pytest.raises(Exception):
        await breaker.call(failing_function)
    
    # Third call should be rejected by circuit breaker
    with pytest.raises(CircuitBreakerException):
        await breaker.call(failing_function)
```

### 2. Frontend Error Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { useErrorHandler } from '../hooks/useErrorHandler';

// Mock component for testing error handler
function TestComponent() {
  const { handleError, error, clearError } = useErrorHandler();

  const triggerError = () => {
    const mockError = {
      response: {
        status: 500,
        data: {
          detail: {
            error_code: 'SERVER_ERROR',
            message: 'Internal server error',
            user_message: 'Something went wrong on our end'
          }
        }
      }
    };
    handleError(mockError);
  };

  return (
    <div>
      <button onClick={triggerError}>Trigger Error</button>
      {error && (
        <div>
          <p data-testid="error-message">{error.userMessage}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
    </div>
  );
}

test('error handler displays user-friendly messages', () => {
  render(<TestComponent />);
  
  fireEvent.click(screen.getByText('Trigger Error'));
  
  expect(screen.getByTestId('error-message')).toHaveTextContent(
    'Something went wrong on our end'
  );
  
  fireEvent.click(screen.getByText('Clear Error'));
  
  expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
});
```

These examples demonstrate how to effectively use the error handling and resilience patterns in both development and production scenarios.