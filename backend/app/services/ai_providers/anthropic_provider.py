import time
from typing import Any

import httpx

from ...core.circuit_breaker import circuit_breaker
from ..retry_service import retry_on_failure
from .base import AIProviderError, AIProviderResponse, BaseAIProvider


class AnthropicProvider(BaseAIProvider):
    """Anthropic Claude API provider"""

    def __init__(self, api_key: str, endpoint: str | None = None, **kwargs):
        self.base_url = endpoint or "https://api.anthropic.com"
        super().__init__(api_key, endpoint, **kwargs)

    def get_available_models(self) -> list[str]:
        return [
            "claude-3-5-sonnet-20241022",
            "claude-3-5-haiku-20241022",
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307"
        ]

    def get_default_model(self) -> str:
        return "claude-3-5-sonnet-20241022"

    @circuit_breaker("anthropic_test", failure_threshold=3)
    @retry_on_failure("anthropic_test", "ai_provider", max_attempts=2, retryable_exceptions=(httpx.HTTPStatusError, httpx.RequestError))
    async def test_connection(self) -> dict[str, Any]:
        """Test connection to Anthropic API"""
        try:
            headers = {
                "x-api-key": self.api_key,
                "Content-Type": "application/json",
                "anthropic-version": "2023-06-01"
            }

            # Test with a simple message
            payload = {
                "model": self.get_default_model(),
                "max_tokens": 10,
                "messages": [
                    {"role": "user", "content": "Hello"}
                ]
            }

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v1/messages",
                    headers=headers,
                    json=payload,
                    timeout=10.0
                )
                response.raise_for_status()

                return {
                    "success": True,
                    "message": "Connection successful",
                    "available_models": self.get_available_models(),
                    "response_time": response.elapsed.total_seconds()
                }

        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "message": f"HTTP error: {e.response.status_code} - {e.response.text}",
                "available_models": [],
                "response_time": None
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Connection failed: {str(e)}",
                "available_models": [],
                "response_time": None
            }

    @circuit_breaker("anthropic_analysis", failure_threshold=5, recovery_timeout=120)
    @retry_on_failure("anthropic_analysis", "ai_provider", max_attempts=3, retryable_exceptions=(httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException))
    async def generate_analysis(
        self,
        prompt: str,
        health_data: list[dict[str, Any]],
        model: str | None = None,
        **kwargs
    ) -> AIProviderResponse:
        """Generate analysis using Anthropic Claude API"""

        model = model or self.get_default_model()
        health_data_str = self._prepare_health_data(health_data)

        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        }

        # Get parameters with defaults
        temperature = kwargs.get("temperature", self.parameters.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.parameters.get("max_tokens", 2000))

        # Combine system prompt and user data, handling empty health data
        if health_data_str.strip():
            full_prompt = f"{prompt}\n\nPlease analyze this health data:\n\n{health_data_str}"
        else:
            full_prompt = f"{prompt}\n\nPlease provide a helpful response to the question based on the context provided."

        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {"role": "user", "content": full_prompt}
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                start_time = time.time()
                response = await client.post(
                    f"{self.base_url}/v1/messages",
                    json=payload,
                    headers=headers
                )
                end_time = time.time()
                processing_time = end_time - start_time

                response.raise_for_status()
                result = response.json()

                content = result["content"][0]["text"]
                token_usage = {
                    "input_tokens": result.get("usage", {}).get("input_tokens", 0),
                    "output_tokens": result.get("usage", {}).get("output_tokens", 0)
                }

                # Estimate cost
                cost = self._estimate_cost_from_usage(token_usage, model)

                return AIProviderResponse(
                    content=content,
                    model_used=model,
                    token_usage=token_usage,
                    processing_time=processing_time,
                    cost=cost,
                    metadata={"provider": "anthropic", "response_id": result.get("id")}
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"Anthropic API error: {e.response.status_code}"
            try:
                error_detail = e.response.json()
                error_msg += f" - {error_detail.get('error', {}).get('message', 'Unknown error')}"
            except Exception:
                error_msg += f" - {e.response.text}"
            raise AIProviderError(error_msg) from e
        except Exception as e:
            raise AIProviderError(f"Anthropic request failed: {str(e)}") from e

    def estimate_cost(self, prompt: str, health_data: list[dict[str, Any]]) -> float:
        """Estimate cost for Anthropic analysis"""
        health_data_str = self._prepare_health_data(health_data)
        total_chars = len(prompt) + len(health_data_str)
        estimated_input_tokens = total_chars // 4
        estimated_output_tokens = 500

        # Claude pricing (as of 2024)
        input_cost_per_1k = 0.003  # $3 per million tokens
        output_cost_per_1k = 0.015  # $15 per million tokens

        input_cost = (estimated_input_tokens / 1000) * input_cost_per_1k
        output_cost = (estimated_output_tokens / 1000) * output_cost_per_1k

        return input_cost + output_cost

    def _estimate_cost_from_usage(self, token_usage: dict[str, Any], model: str) -> float:
        """Estimate cost from actual token usage"""
        if not token_usage:
            return 0.0

        input_tokens = token_usage.get("input_tokens", 0)
        output_tokens = token_usage.get("output_tokens", 0)

        # Pricing varies by model
        if "opus" in model:
            input_rate = 0.015
            output_rate = 0.075
        elif "sonnet" in model:
            input_rate = 0.003
            output_rate = 0.015
        else:  # haiku
            input_rate = 0.00025
            output_rate = 0.00125

        input_cost = (input_tokens / 1000) * input_rate
        output_cost = (output_tokens / 1000) * output_rate

        return input_cost + output_cost
