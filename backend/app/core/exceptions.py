"""
Standardized Exception Handling for MBHealth Application

This module provides structured exception handling with consistent error responses,
proper logging, and user-friendly messages for different error scenarios.
"""

import logging
import traceback
from datetime import datetime
from typing import Any

from fastapi import HTTPException


class AppException(HTTPException):
    """
    Base application exception with structured error response.

    Provides consistent error format across all API endpoints with:
    - Structured error codes for client-side handling
    - User-friendly messages separate from technical details
    - Automatic logging with context
    - Optional additional details for debugging
    """

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        details: dict[str, Any] | None = None,
        user_message: str | None = None,
        log_level: str = "error"
    ):
        self.error_code = error_code
        self.details = details or {}
        self.user_message = user_message or message
        self.log_level = log_level

        # Structure the error response
        detail = {
            "error_code": error_code,
            "message": message,
            "user_message": self.user_message,
            "details": self.details,
            "timestamp": datetime.utcnow().isoformat()
        }

        super().__init__(status_code=status_code, detail=detail)

        # Log the error with appropriate level
        logger = logging.getLogger(__name__)
        log_method = getattr(logger, log_level.lower(), logger.error)

        log_method(
            f"AppException [{error_code}]: {message}",
            extra={
                "error_code": error_code,
                "status_code": status_code,
                "details": self.details,
                "user_message": self.user_message
            }
        )


class ValidationException(AppException):
    """Raised when input validation fails"""

    def __init__(
        self,
        field: str,
        message: str,
        value: Any = None,
        details: dict[str, Any] | None = None
    ):
        field_display = field.replace('_', ' ').title()
        user_msg = f"Please check your {field_display.lower()} and try again."

        combined_details = {"field": field, **(details or {})}
        if value is not None:
            combined_details["provided_value"] = str(value)

        super().__init__(
            status_code=422,
            error_code="VALIDATION_ERROR",
            message=f"Validation error for field '{field}': {message}",
            user_message=user_msg,
            details=combined_details,
            log_level="warning"
        )


class AIProviderException(AppException):
    """Raised when AI provider operations fail"""

    def __init__(
        self,
        provider: str,
        message: str,
        details: dict[str, Any] | None = None,
        is_transient: bool = True
    ):
        user_msg = (
            "AI analysis is temporarily unavailable. Please try again later."
            if is_transient
            else "AI analysis is currently unavailable. Please contact support if this persists."
        )

        combined_details = {
            "provider": provider,
            "is_transient": is_transient,
            **(details or {})
        }

        super().__init__(
            status_code=503 if is_transient else 500,
            error_code="AI_PROVIDER_ERROR",
            message=f"AI provider '{provider}' error: {message}",
            user_message=user_msg,
            details=combined_details
        )


class DatabaseException(AppException):
    """Raised when database operations fail"""

    def __init__(
        self,
        operation: str,
        message: str,
        details: dict[str, Any] | None = None,
        is_transient: bool = True
    ):
        user_msg = (
            "We're experiencing technical difficulties. Please try again in a few minutes."
            if is_transient
            else "A system error occurred. Please contact support."
        )

        combined_details = {
            "operation": operation,
            "is_transient": is_transient,
            **(details or {})
        }

        super().__init__(
            status_code=503 if is_transient else 500,
            error_code="DATABASE_ERROR",
            message=f"Database {operation} failed: {message}",
            user_message=user_msg,
            details=combined_details
        )


class ExternalServiceException(AppException):
    """Raised when external service calls fail"""

    def __init__(
        self,
        service: str,
        message: str,
        details: dict[str, Any] | None = None,
        is_transient: bool = True
    ):
        user_msg = (
            f"The {service} service is temporarily unavailable. Please try again later."
            if is_transient
            else f"The {service} service is currently unavailable. Please contact support."
        )

        combined_details = {
            "service": service,
            "is_transient": is_transient,
            **(details or {})
        }

        super().__init__(
            status_code=503 if is_transient else 500,
            error_code="EXTERNAL_SERVICE_ERROR",
            message=f"External service '{service}' error: {message}",
            user_message=user_msg,
            details=combined_details
        )


class CircuitBreakerException(AppException):
    """Raised when circuit breaker is open"""

    def __init__(self, service: str, failure_count: int, recovery_time: str):
        super().__init__(
            status_code=503,
            error_code="SERVICE_UNAVAILABLE",
            message=f"Service '{service}' temporarily unavailable due to repeated failures",
            user_message=f"This feature is temporarily unavailable due to technical issues. Please try again in {recovery_time}.",
            details={
                "service": service,
                "failure_count": failure_count,
                "recovery_time": recovery_time
            }
        )


class NotFoundError(AppException):
    """Raised when a requested resource is not found"""

    def __init__(self, resource: str, identifier: str | int):
        super().__init__(
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            message=f"{resource} with identifier '{identifier}' not found",
            user_message=f"The requested {resource.lower()} could not be found.",
            details={
                "resource": resource,
                "identifier": str(identifier)
            },
            log_level="warning"
        )


class PermissionDeniedError(AppException):
    """Raised when user lacks permission for an operation"""

    def __init__(self, operation: str, resource: str = "resource"):
        super().__init__(
            status_code=403,
            error_code="PERMISSION_DENIED",
            message=f"Permission denied for operation '{operation}' on {resource}",
            user_message="You don't have permission to perform this action.",
            details={
                "operation": operation,
                "resource": resource
            },
            log_level="warning"
        )


class RateLimitException(AppException):
    """Raised when rate limits are exceeded"""

    def __init__(self, limit: int, window: str, retry_after: int = 60):
        super().__init__(
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            message=f"Rate limit of {limit} requests per {window} exceeded",
            user_message=f"Too many requests. Please wait {retry_after} seconds before trying again.",
            details={
                "limit": limit,
                "window": window,
                "retry_after": retry_after
            },
            log_level="warning"
        )


def log_exception_context(
    exc: Exception,
    context: dict[str, Any],
    level: str = "error"
) -> None:
    """
    Log an exception with additional context information.

    Args:
        exc: The exception to log
        context: Additional context information
        level: Log level ('error', 'warning', 'info')
    """
    logger = logging.getLogger(__name__)
    log_method = getattr(logger, level.lower(), logger.error)

    log_method(
        f"Exception occurred: {type(exc).__name__}: {str(exc)}",
        extra={
            "exception_type": type(exc).__name__,
            "exception_message": str(exc),
            "traceback": traceback.format_exc(),
            "context": context
        }
    )


def safe_database_operation(operation_name: str):
    """
    Decorator for safe database operations with proper error handling.

    Usage:
        @safe_database_operation("user creation")
        def create_user(self, user_data):
            # database operations
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Determine if this is a transient error
                is_transient = _is_transient_db_error(e)

                log_exception_context(
                    e,
                    {
                        "operation": operation_name,
                        "function": func.__name__,
                        "args": str(args)[:200],  # Truncate for logging
                        "kwargs": str(kwargs)[:200]
                    }
                )

                raise DatabaseException(
                    operation=operation_name,
                    message=str(e),
                    is_transient=is_transient
                ) from e
        return wrapper
    return decorator


def _is_transient_db_error(error: Exception) -> bool:
    """
    Determine if a database error is likely transient (can be retried).

    Returns True for connection issues, timeouts, deadlocks, etc.
    Returns False for constraint violations, syntax errors, etc.
    """
    error_msg = str(error).lower()

    # Transient error patterns
    transient_patterns = [
        'connection', 'timeout', 'deadlock', 'lock', 'busy',
        'temporary', 'service unavailable', 'network'
    ]

    # Non-transient error patterns
    permanent_patterns = [
        'constraint', 'syntax', 'column', 'table', 'foreign key',
        'unique', 'not null', 'invalid'
    ]

    # Check for permanent errors first
    if any(pattern in error_msg for pattern in permanent_patterns):
        return False

    # Check for transient errors
    if any(pattern in error_msg for pattern in transient_patterns):
        return True

    # Default to transient for unknown errors (safer for retries)
    return True
