"""
Retry Service with Exponential Backoff

Provides configurable retry logic for external service calls with exponential 
backoff, jitter, and circuit breaker integration.
"""

import asyncio
import logging
import random
from collections.abc import Callable
from functools import wraps
from typing import Any

from app.core.circuit_breaker import circuit_registry
from app.core.exceptions import AIProviderException, ExternalServiceException, log_exception_context


class RetryConfig:
    """Configuration for retry behavior"""

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
        jitter_factor: float = 0.1
    ):
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter
        self.jitter_factor = jitter_factor

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number (0-indexed)"""
        delay = self.base_delay * (self.exponential_base ** attempt)
        delay = min(delay, self.max_delay)

        if self.jitter:
            jitter_amount = delay * self.jitter_factor
            delay += random.uniform(-jitter_amount, jitter_amount)

        return max(0, delay)


class RetryService:
    """Service for handling retries with exponential backoff"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Default configurations for different service types
        self.default_configs = {
            "ai_provider": RetryConfig(max_attempts=3, base_delay=2.0, max_delay=30.0),
            "database": RetryConfig(max_attempts=2, base_delay=0.5, max_delay=5.0),
            "external_api": RetryConfig(max_attempts=3, base_delay=1.0, max_delay=60.0),
            "notification": RetryConfig(max_attempts=2, base_delay=1.0, max_delay=10.0)
        }

    async def retry_async(
        self,
        func: Callable,
        *args,
        config: RetryConfig | None = None,
        service_name: str = "unknown",
        service_type: str = "external_api",
        retryable_exceptions: tuple = (Exception,),
        circuit_breaker_name: str | None = None,
        **kwargs
    ) -> Any:
        """
        Retry an async function with exponential backoff.
        
        Args:
            func: Async function to retry
            *args: Arguments for the function
            config: Retry configuration (uses default if None)
            service_name: Name of the service for logging
            service_type: Type of service (ai_provider, database, etc.)
            retryable_exceptions: Tuple of exceptions that should trigger retry
            circuit_breaker_name: Name of circuit breaker to use
            **kwargs: Keyword arguments for the function
        
        Returns:
            Function result
        
        Raises:
            Last exception if all retries fail
        """
        if config is None:
            config = self.default_configs.get(service_type, self.default_configs["external_api"])

        # Use circuit breaker if specified
        if circuit_breaker_name:
            breaker = circuit_registry.get_or_create(
                circuit_breaker_name,
                expected_exception=retryable_exceptions[0] if retryable_exceptions else Exception
            )
            return await breaker.call(self._retry_with_backoff, func, *args,
                                     config=config, service_name=service_name,
                                     service_type=service_type,
                                     retryable_exceptions=retryable_exceptions, **kwargs)
        else:
            return await self._retry_with_backoff(
                func, *args, config=config, service_name=service_name,
                service_type=service_type, retryable_exceptions=retryable_exceptions, **kwargs
            )

    async def _retry_with_backoff(
        self,
        func: Callable,
        *args,
        config: RetryConfig,
        service_name: str,
        service_type: str,
        retryable_exceptions: tuple,
        **kwargs
    ) -> Any:
        """Internal retry implementation with backoff logic"""
        last_exception = None

        for attempt in range(config.max_attempts):
            try:
                self.logger.debug(f"Attempt {attempt + 1}/{config.max_attempts} for {service_name}")

                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: func(*args, **kwargs)
                    )

                if attempt > 0:
                    self.logger.info(f"Retry successful for {service_name} after {attempt + 1} attempts")

                return result

            except retryable_exceptions as e:
                last_exception = e
                is_final_attempt = attempt == config.max_attempts - 1

                # Log the retry attempt
                log_level = "error" if is_final_attempt else "warning"
                log_exception_context(
                    e,
                    {
                        "service_name": service_name,
                        "service_type": service_type,
                        "attempt": attempt + 1,
                        "max_attempts": config.max_attempts,
                        "is_final_attempt": is_final_attempt
                    },
                    level=log_level
                )

                if is_final_attempt:
                    # Final attempt failed, raise appropriate exception
                    if service_type == "ai_provider":
                        raise AIProviderException(
                            provider=service_name,
                            message=f"Failed after {config.max_attempts} attempts: {str(e)}",
                            details={"attempts": config.max_attempts, "last_error": str(e)},
                            is_transient=self._is_transient_error(e)
                        )
                    elif service_type == "database":
                        from app.core.exceptions import DatabaseException
                        raise DatabaseException(
                            operation=service_name,
                            message=f"Failed after {config.max_attempts} attempts: {str(e)}",
                            details={"attempts": config.max_attempts, "last_error": str(e)},
                            is_transient=self._is_transient_error(e)
                        )
                    else:
                        raise ExternalServiceException(
                            service=service_name,
                            message=f"Failed after {config.max_attempts} attempts: {str(e)}",
                            details={"attempts": config.max_attempts, "last_error": str(e)},
                            is_transient=self._is_transient_error(e)
                        )

                # Calculate and apply delay before next attempt
                delay = config.calculate_delay(attempt)
                self.logger.info(f"Retrying {service_name} in {delay:.2f} seconds...")
                await asyncio.sleep(delay)

            except Exception as e:
                # Non-retryable exception
                log_exception_context(
                    e,
                    {
                        "service_name": service_name,
                        "service_type": service_type,
                        "attempt": attempt + 1,
                        "non_retryable": True
                    },
                    level="error"
                )
                raise

        # Should never reach here, but just in case
        if last_exception:
            raise last_exception
        else:
            raise Exception(f"Retry logic error for {service_name}")

    def _is_transient_error(self, error: Exception) -> bool:
        """Determine if an error is likely transient and worth retrying"""
        error_msg = str(error).lower()

        # Network/connection errors are usually transient
        transient_patterns = [
            'timeout', 'connection', 'network', 'socket', 'dns',
            'temporary', 'service unavailable', 'rate limit',
            'too many requests', '429', '503', '502', '504'
        ]

        # These errors are typically permanent
        permanent_patterns = [
            '400', '401', '403', '404', '422', 'unauthorized',
            'forbidden', 'not found', 'invalid', 'syntax'
        ]

        # Check for permanent errors first
        if any(pattern in error_msg for pattern in permanent_patterns):
            return False

        # Check for transient errors
        if any(pattern in error_msg for pattern in transient_patterns):
            return True

        # Default to transient for unknown errors
        return True


# Global instance
retry_service = RetryService()


def retry_on_failure(
    service_name: str,
    service_type: str = "external_api",
    max_attempts: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 60.0,
    retryable_exceptions: tuple = (Exception,),
    circuit_breaker: str | None = None
):
    """
    Decorator for automatic retry with exponential backoff.
    
    Usage:
        @retry_on_failure("openai_api", "ai_provider", max_attempts=3)
        async def call_openai_api():
            # API call code
    """
    def decorator(func: Callable):
        config = RetryConfig(
            max_attempts=max_attempts,
            base_delay=base_delay,
            max_delay=max_delay
        )

        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await retry_service.retry_async(
                func, *args,
                config=config,
                service_name=service_name,
                service_type=service_type,
                retryable_exceptions=retryable_exceptions,
                circuit_breaker_name=circuit_breaker,
                **kwargs
            )

        return wrapper
    return decorator
