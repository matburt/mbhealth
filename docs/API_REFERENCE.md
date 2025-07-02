# API Reference

This document provides a comprehensive reference for the MBHealth API endpoints.

## Base URL

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://your-domain.com/api/v1`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

## Health & Monitoring Endpoints

### GET /health/
Basic health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "message": "Service is running"
}
```

### GET /health/circuit-breakers
Get circuit breaker health status and monitoring information.

**Response:**
```json
{
  "healthy_breakers": 4,
  "total_breakers": 4,
  "overall_health": "healthy",
  "breakers": {
    "openai_analysis": {
      "name": "openai_analysis",
      "state": "closed",
      "failure_count": 0,
      "success_count": 15,
      "last_failure_time": null,
      "recovery_time_remaining": null
    },
    "anthropic_analysis": {
      "name": "anthropic_analysis", 
      "state": "closed",
      "failure_count": 0,
      "success_count": 8,
      "last_failure_time": null,
      "recovery_time_remaining": null
    }
  }
}
```

**Circuit Breaker States:**
- `closed`: Normal operation, requests pass through
- `open`: Too many failures, requests are rejected
- `half_open`: Testing recovery, limited requests allowed

### GET /health/detailed
Comprehensive system health check including all components.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "components": {
    "database": {"status": "healthy"},
    "circuit_breakers": {
      "healthy_breakers": 4,
      "total_breakers": 4,
      "overall_health": "healthy"
    },
    "redis": {"status": "healthy"}
  },
  "version": "1.0.0",
  "uptime": "2d 5h 30m"
}
```

## Error Response Format

All API errors follow a consistent structure:

```json
{
  "detail": {
    "error_code": "VALIDATION_ERROR",
    "message": "Validation error for field 'email': Email is required",
    "user_message": "Please check your email and try again.",
    "details": {
      "field": "email",
      "provided_value": ""
    },
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Common Error Codes

| Error Code | Status | Description |
|------------|--------|-------------|
| `VALIDATION_ERROR` | 422 | Input validation failed |
| `AI_PROVIDER_ERROR` | 503/500 | AI service failure |
| `DATABASE_ERROR` | 503/500 | Database operation failed |
| `SERVICE_UNAVAILABLE` | 503 | Circuit breaker is open |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `PERMISSION_DENIED` | 403 | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

## AI Analysis Endpoints

### POST /ai-analysis/
Create a new AI analysis.

**Request Body:**
```json
{
  "provider_id": "uuid-string",
  "health_data_ids": [1, 2, 3],
  "analysis_type": "trends",
  "additional_context": "Optional context"
}
```

**Response:**
```json
{
  "id": 123,
  "status": "pending",
  "provider_name": "OpenAI",
  "analysis_type": "trends",
  "created_at": "2024-01-01T12:00:00Z"
}
```

### GET /ai-analysis/{analysis_id}
Get analysis results.

**Response:**
```json
{
  "id": 123,
  "status": "completed",
  "response_content": "Analysis results...",
  "model_used": "gpt-3.5-turbo",
  "processing_time": 15.5,
  "cost": 0.02,
  "completed_at": "2024-01-01T12:01:00Z"
}
```

## AI Provider Management

### POST /ai-analysis/providers
Create a new AI provider.

**Request Body:**
```json
{
  "name": "My OpenAI Provider",
  "type": "openai",
  "api_key": "sk-...",
  "endpoint": "https://api.openai.com/v1",
  "models": ["gpt-3.5-turbo", "gpt-4"],
  "default_model": "gpt-3.5-turbo",
  "enabled": true,
  "priority": 10
}
```

### POST /ai-analysis/providers/{provider_id}/test
Test AI provider connection.

**Response:**
```json
{
  "success": true,
  "message": "Connection successful",
  "available_models": ["gpt-3.5-turbo", "gpt-4"],
  "response_time": 0.85
}
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **Authentication endpoints**: 5 requests per minute
- **AI analysis creation**: 10 requests per minute
- **General API endpoints**: 100 requests per minute

When rate limits are exceeded, you'll receive a `429` status code:

```json
{
  "detail": {
    "error_code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit of 10 requests per minute exceeded",
    "user_message": "Too many requests. Please wait 60 seconds before trying again.",
    "details": {
      "limit": 10,
      "window": "minute",
      "retry_after": 60
    }
  }
}
```

## Circuit Breaker Integration

API endpoints that depend on external services (AI providers) are protected by circuit breakers:

- **Automatic Protection**: Calls to AI providers automatically use circuit breakers
- **Graceful Degradation**: When a service is down, requests fail fast
- **Automatic Recovery**: Services are automatically tested for recovery

When a circuit breaker is open, you'll receive:

```json
{
  "detail": {
    "error_code": "SERVICE_UNAVAILABLE",
    "message": "Service 'openai_analysis' temporarily unavailable due to repeated failures",
    "user_message": "This feature is temporarily unavailable due to technical issues. Please try again in 2m 30s.",
    "details": {
      "service": "openai_analysis",
      "failure_count": 5,
      "recovery_time": "2m 30s"
    }
  }
}
```

## WebSocket Endpoints

### /ws/analysis/{analysis_id}
Real-time updates for AI analysis progress.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/analysis/123');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Analysis update:', data);
};
```

**Message Format:**
```json
{
  "type": "status_update",
  "analysis_id": 123,
  "status": "processing",
  "progress": 50,
  "message": "Analyzing health data..."
}
```

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `skip`: Number of records to skip (default: 0)
- `limit`: Maximum number of records to return (default: 50, max: 100)

**Example:**
```
GET /ai-analysis/?skip=0&limit=20
```

**Response includes pagination metadata:**
```json
{
  "items": [...],
  "total": 150,
  "skip": 0,
  "limit": 20,
  "has_more": true
}
```

## OpenAPI Documentation

Complete interactive API documentation is available at:
- **Development**: http://localhost:8000/docs
- **Redoc**: http://localhost:8000/redoc

The OpenAPI specification includes:
- All endpoints with request/response schemas
- Authentication requirements
- Interactive testing interface
- Example requests and responses