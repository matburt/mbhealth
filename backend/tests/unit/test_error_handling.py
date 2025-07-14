"""
Test error handling improvements for issue #28
"""

from unittest.mock import Mock, patch

import pytest

from app.core.circuit_breaker import CircuitBreaker, CircuitState
from app.core.exceptions import (
    AIProviderException,
    AppException,
    CircuitBreakerException,
    ValidationException,
    log_exception_context,
)
from app.services.retry_service import RetryConfig, RetryService


class TestAppException:
    """Test structured exception handling"""

    def test_app_exception_structure(self):
        """Test that AppException creates proper structured response"""
        exc = AppException(
            status_code=500,
            error_code="TEST_ERROR",
            message="Test error message",
            user_message="User-friendly message",
            details={"extra": "info"}
        )

        assert exc.status_code == 500
        assert exc.error_code == "TEST_ERROR"
        assert exc.user_message == "User-friendly message"
        assert exc.details["extra"] == "info"
        assert "error_code" in exc.detail
        assert exc.detail["error_code"] == "TEST_ERROR"
        assert exc.detail["user_message"] == "User-friendly message"

    def test_validation_exception(self):
        """Test validation exception formatting"""
        exc = ValidationException(
            field="email_address",
            message="Invalid format",
            value="invalid-email"
        )

        assert exc.status_code == 422
        assert exc.error_code == "VALIDATION_ERROR"
        assert "email address" in exc.user_message.lower()
        assert exc.details["field"] == "email_address"
        assert exc.details["provided_value"] == "invalid-email"

    def test_ai_provider_exception(self):
        """Test AI provider exception handling"""
        exc = AIProviderException(
            provider="openai",
            message="Rate limit exceeded",
            is_transient=True
        )

        assert exc.status_code == 503
        assert exc.error_code == "AI_PROVIDER_ERROR"
        assert "temporarily unavailable" in exc.user_message
        assert exc.details["provider"] == "openai"
        assert exc.details["is_transient"] is True


class TestCircuitBreaker:
    """Test circuit breaker functionality"""

    def test_circuit_breaker_initialization(self):
        """Test circuit breaker initializes correctly"""
        breaker = CircuitBreaker(
            name="test-service",
            failure_threshold=3,
            recovery_timeout=30
        )

        assert breaker.name == "test-service"
        assert breaker.failure_threshold == 3
        assert breaker.recovery_timeout == 30
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_success(self):
        """Test circuit breaker with successful function"""
        breaker = CircuitBreaker("test-service")

        async def successful_function():
            return "success"

        result = await breaker.call(successful_function)
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_failure_threshold(self):
        """Test circuit breaker opens after failure threshold"""
        breaker = CircuitBreaker("test-service", failure_threshold=2)

        async def failing_function():
            raise Exception("Test error")

        # First failure
        with pytest.raises((Exception, ValueError)):
            await breaker.call(failing_function)
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 1

        # Second failure - should open circuit
        with pytest.raises((Exception, ValueError)):
            await breaker.call(failing_function)
        assert breaker.state == CircuitState.OPEN
        assert breaker.failure_count == 2

        # Third call should be rejected by circuit breaker
        with pytest.raises(CircuitBreakerException):
            await breaker.call(failing_function)


class TestRetryService:
    """Test retry service functionality"""

    def test_retry_config(self):
        """Test retry configuration"""
        config = RetryConfig(
            max_attempts=3,
            base_delay=1.0,
            exponential_base=2.0,
            jitter=False  # Disable jitter for predictable testing
        )

        # Test delay calculation
        assert config.calculate_delay(0) == 1.0  # Base delay
        assert config.calculate_delay(1) == 2.0  # 2^1 * base_delay
        assert config.calculate_delay(2) == 4.0  # 2^2 * base_delay

    @pytest.mark.asyncio
    async def test_retry_service_success_after_failures(self):
        """Test retry service succeeds after initial failures"""
        retry_service = RetryService()
        call_count = 0

        async def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Temporary failure")
            return "success"

        config = RetryConfig(max_attempts=3, base_delay=0.01)  # Fast for testing

        result = await retry_service.retry_async(
            flaky_function,
            config=config,
            service_name="test-service",
            retryable_exceptions=(Exception,)
        )

        assert result == "success"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_retry_service_final_failure(self):
        """Test retry service fails after max attempts"""
        retry_service = RetryService()

        async def always_failing_function():
            raise Exception("Always fails")

        config = RetryConfig(max_attempts=2, base_delay=0.01)

        with pytest.raises((Exception, ValueError)):  # Should raise the structured exception
            await retry_service.retry_async(
                always_failing_function,
                config=config,
                service_name="test-service",
                service_type="external_api",
                retryable_exceptions=(Exception,)
            )


class TestErrorLogging:
    """Test error logging functionality"""

    @patch('app.core.exceptions.logging.getLogger')
    def test_log_exception_context(self, mock_get_logger):
        """Test exception logging with context"""
        mock_logger = Mock()
        mock_get_logger.return_value = mock_logger

        test_exception = ValueError("Test error")
        context = {"operation": "test", "user_id": 123}

        log_exception_context(test_exception, context, level="warning")

        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args

        # Check that the error message contains exception info
        assert "ValueError" in call_args[0][0]
        assert "Test error" in call_args[0][0]

        # Check that context is included in extra
        extra = call_args[1]["extra"]
        assert extra["exception_type"] == "ValueError"
        assert extra["context"]["operation"] == "test"
        assert extra["context"]["user_id"] == 123
