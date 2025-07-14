"""
Circuit Breaker Pattern Implementation

Provides fault tolerance for external service calls by temporarily failing fast
when a service is experiencing issues, then gradually allowing requests through
to test if the service has recovered.

This prevents cascading failures and improves overall system resilience.
"""

import asyncio
import logging
import threading
from collections.abc import Callable
from datetime import datetime, timedelta
from enum import Enum
from functools import wraps
from typing import Any

from .exceptions import CircuitBreakerException, log_exception_context


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"        # Normal operation - all requests pass through
    OPEN = "open"           # Failing state - all requests are rejected
    HALF_OPEN = "half_open" # Testing state - limited requests allowed


class CircuitBreaker:
    """
    Circuit breaker implementation for protecting against cascading failures.

    The circuit breaker monitors failures and transitions between states:
    - CLOSED: Normal operation, requests pass through
    - OPEN: Too many failures, reject requests immediately
    - HALF_OPEN: Testing if service recovered, allow limited requests
    """

    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 3,
        expected_exception: type[Exception] = Exception,
        timeout: float = 30.0
    ):
        """
        Initialize circuit breaker.

        Args:
            name: Identifier for this circuit breaker
            failure_threshold: Number of failures before opening circuit
            recovery_timeout: Seconds to wait before testing recovery
            success_threshold: Consecutive successes needed to close circuit
            expected_exception: Exception type that triggers the circuit
            timeout: Request timeout in seconds
        """
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        self.expected_exception = expected_exception
        self.timeout = timeout

        # State tracking
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: datetime | None = None
        self.state = CircuitState.CLOSED

        # Thread safety
        self._lock = threading.Lock()

        # Logging
        self.logger = logging.getLogger(f"{__name__}.{name}")

        self.logger.info(f"Circuit breaker '{name}' initialized", extra={
            "failure_threshold": failure_threshold,
            "recovery_timeout": recovery_timeout,
            "success_threshold": success_threshold
        })

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute a function with circuit breaker protection.

        Args:
            func: Function to execute (can be sync or async)
            *args: Function arguments
            **kwargs: Function keyword arguments

        Returns:
            Function result

        Raises:
            CircuitBreakerException: When circuit is open
            TimeoutError: When request times out
            Original exception: When function fails
        """
        with self._lock:
            current_state = self.state

            # Check if we should reject the request
            if current_state == CircuitState.OPEN:
                if self._should_attempt_reset():
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    self.logger.info(f"Circuit breaker '{self.name}' transitioning to HALF_OPEN")
                else:
                    recovery_time = self._get_recovery_time_remaining()
                    self.logger.warning(f"Circuit breaker '{self.name}' rejecting request - OPEN state")
                    raise CircuitBreakerException(
                        service=self.name,
                        failure_count=self.failure_count,
                        recovery_time=recovery_time
                    )

        # Execute the function with timeout
        try:
            if asyncio.iscoroutinefunction(func):
                result = await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=self.timeout
                )
            else:
                result = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None, lambda: func(*args, **kwargs)
                    ),
                    timeout=self.timeout
                )

            # Success - update state
            self._on_success()
            return result

        except TimeoutError:
            self.logger.error(f"Circuit breaker '{self.name}' - request timeout")
            self._on_failure()
            raise TimeoutError(f"Request to {self.name} timed out after {self.timeout} seconds") from None

        except self.expected_exception as e:
            self.logger.warning(f"Circuit breaker '{self.name}' - expected failure: {str(e)}")
            self._on_failure()
            raise

        except Exception as e:
            # Unexpected exception - log but don't trigger circuit breaker
            log_exception_context(
                e,
                {
                    "circuit_breaker": self.name,
                    "function": func.__name__,
                    "state": self.state.value
                }
            )
            raise

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt recovery"""
        if not self.last_failure_time:
            return True

        time_since_failure = datetime.utcnow() - self.last_failure_time
        return time_since_failure >= timedelta(seconds=self.recovery_timeout)

    def _get_recovery_time_remaining(self) -> str:
        """Get human-readable recovery time remaining"""
        if not self.last_failure_time:
            return "unknown"

        recovery_time = self.last_failure_time + timedelta(seconds=self.recovery_timeout)
        remaining = recovery_time - datetime.utcnow()

        if remaining.total_seconds() <= 0:
            return "now"

        minutes = int(remaining.total_seconds() // 60)
        seconds = int(remaining.total_seconds() % 60)

        if minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"

    def _on_success(self):
        """Handle successful request"""
        with self._lock:
            self.success_count += 1

            if self.state == CircuitState.HALF_OPEN:
                if self.success_count >= self.success_threshold:
                    self.state = CircuitState.CLOSED
                    self.failure_count = 0
                    self.success_count = 0
                    self.logger.info(f"Circuit breaker '{self.name}' CLOSED - service recovered")
            elif self.state == CircuitState.CLOSED:
                # Reset failure count on any success while closed
                self.failure_count = 0

    def _on_failure(self):
        """Handle failed request"""
        with self._lock:
            self.failure_count += 1
            self.success_count = 0  # Reset success count
            self.last_failure_time = datetime.utcnow()

            if self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                self.logger.error(f"Circuit breaker '{self.name}' OPENED - too many failures ({self.failure_count})")
            elif self.state == CircuitState.HALF_OPEN:
                # Any failure in half-open state immediately opens the circuit
                self.state = CircuitState.OPEN
                self.logger.warning(f"Circuit breaker '{self.name}' OPENED - failure during recovery test")

    @property
    def stats(self) -> dict[str, Any]:
        """Get circuit breaker statistics"""
        with self._lock:
            return {
                "name": self.name,
                "state": self.state.value,
                "failure_count": self.failure_count,
                "success_count": self.success_count,
                "last_failure_time": self.last_failure_time.isoformat() if self.last_failure_time else None,
                "recovery_time_remaining": self._get_recovery_time_remaining() if self.state == CircuitState.OPEN else None
            }

    def reset(self):
        """Manually reset the circuit breaker to CLOSED state"""
        with self._lock:
            self.state = CircuitState.CLOSED
            self.failure_count = 0
            self.success_count = 0
            self.last_failure_time = None
            self.logger.info(f"Circuit breaker '{self.name}' manually reset to CLOSED")


class CircuitBreakerRegistry:
    """Registry for managing multiple circuit breakers"""

    def __init__(self):
        self._breakers: dict[str, CircuitBreaker] = {}
        self._lock = threading.Lock()

    def get_or_create(
        self,
        name: str,
        **kwargs
    ) -> CircuitBreaker:
        """Get existing circuit breaker or create a new one"""
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name=name, **kwargs)
            return self._breakers[name]

    def get(self, name: str) -> CircuitBreaker | None:
        """Get circuit breaker by name"""
        return self._breakers.get(name)

    def get_all_stats(self) -> dict[str, dict[str, Any]]:
        """Get statistics for all circuit breakers"""
        return {name: breaker.stats for name, breaker in self._breakers.items()}

    def reset_all(self):
        """Reset all circuit breakers"""
        for breaker in self._breakers.values():
            breaker.reset()


# Global registry instance
circuit_registry = CircuitBreakerRegistry()


def circuit_breaker(
    name: str,
    failure_threshold: int = 5,
    recovery_timeout: int = 60,
    success_threshold: int = 3,
    expected_exception: type[Exception] = Exception,
    timeout: float = 30.0
):
    """
    Decorator for applying circuit breaker pattern to functions.

    Usage:
        @circuit_breaker("external_api", failure_threshold=3)
        async def call_external_api():
            # API call code
    """
    def decorator(func: Callable):
        breaker = circuit_registry.get_or_create(
            name=name,
            failure_threshold=failure_threshold,
            recovery_timeout=recovery_timeout,
            success_threshold=success_threshold,
            expected_exception=expected_exception,
            timeout=timeout
        )

        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await breaker.call(func, *args, **kwargs)

        return wrapper
    return decorator


async def get_circuit_breaker_health() -> dict[str, Any]:
    """
    Get health status of all circuit breakers.

    Returns:
        Dictionary with overall health and individual breaker stats
    """
    all_stats = circuit_registry.get_all_stats()

    healthy_count = sum(1 for stats in all_stats.values() if stats["state"] == "closed")
    total_count = len(all_stats)

    return {
        "healthy_breakers": healthy_count,
        "total_breakers": total_count,
        "overall_health": "healthy" if healthy_count == total_count else "degraded",
        "breakers": all_stats
    }
