import time
from typing import Any

import httpx

from ...core.circuit_breaker import circuit_breaker
from ..retry_service import retry_on_failure
from .base import AIProviderError, AIProviderResponse, BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    """OpenAI API provider"""

    def __init__(self, api_key: str, endpoint: str | None = None, **kwargs):
        self.base_url = endpoint or "https://api.openai.com/v1"
        super().__init__(api_key, endpoint, **kwargs)

    def get_available_models(self) -> list[str]:
        return [
            "gpt-4-turbo-preview",
            "gpt-4",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k"
        ]

    def get_default_model(self) -> str:
        return "gpt-3.5-turbo"

    @circuit_breaker("openai_test", failure_threshold=3)
    @retry_on_failure("openai_test", "ai_provider", max_attempts=2, retryable_exceptions=(httpx.HTTPStatusError, httpx.RequestError))
    async def test_connection(self) -> dict[str, Any]:
        """Test connection to OpenAI API"""
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=headers,
                    timeout=10.0
                )
                response.raise_for_status()

                models_data = response.json()
                available_models = [model["id"] for model in models_data.get("data", [])
                                  if model["id"].startswith("gpt")]

                return {
                    "success": True,
                    "message": "Connection successful",
                    "available_models": available_models,
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

    @circuit_breaker("openai_analysis", failure_threshold=5, recovery_timeout=120)
    @retry_on_failure("openai_analysis", "ai_provider", max_attempts=3, retryable_exceptions=(httpx.HTTPStatusError, httpx.RequestError, httpx.TimeoutException))
    async def generate_analysis(
        self,
        prompt: str,
        health_data: list[dict[str, Any]],
        model: str | None = None,
        **kwargs
    ) -> AIProviderResponse:
        """Generate analysis using OpenAI API"""

        model = model or self.get_default_model()
        health_data_str = self._prepare_health_data(health_data)

        # Prepare the request
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Get parameters with defaults
        temperature = kwargs.get("temperature", self.parameters.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.parameters.get("max_tokens", 2000))

        # Handle the case where there's no specific health data (for general questions)
        if health_data_str.strip():
            user_message = f"Please analyze this health data:\n\n{health_data_str}"
        else:
            user_message = "Please provide a helpful response to my question based on the context provided."

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": user_message}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                start_time = time.time()
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    json=payload,
                    headers=headers
                )
                end_time = time.time()
                processing_time = end_time - start_time

                response.raise_for_status()
                result = response.json()

                content = result["choices"][0]["message"]["content"]
                token_usage = result.get("usage", {})

                # Estimate cost (rough estimates)
                cost = self._estimate_cost_from_usage(token_usage, model)

                return AIProviderResponse(
                    content=content,
                    model_used=model,
                    token_usage=token_usage,
                    processing_time=processing_time,
                    cost=cost,
                    metadata={"provider": "openai", "response_id": result.get("id")}
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"OpenAI API error: {e.response.status_code}"
            try:
                error_detail = e.response.json()
                error_msg += f" - {error_detail.get('error', {}).get('message', 'Unknown error')}"
            except Exception:
                error_msg += f" - {e.response.text}"
            raise AIProviderError(error_msg) from e
        except Exception as e:
            raise AIProviderError(f"OpenAI request failed: {str(e)}") from e

    def estimate_cost(self, prompt: str, health_data: list[dict[str, Any]]) -> float:
        """Estimate cost for OpenAI analysis"""
        # Rough token estimation (4 chars = 1 token)
        health_data_str = self._prepare_health_data(health_data)
        total_chars = len(prompt) + len(health_data_str)
        estimated_input_tokens = total_chars // 4
        estimated_output_tokens = 500  # Assume ~500 tokens output

        # GPT-3.5-turbo pricing (as of 2024)
        input_cost_per_1k = 0.0010
        output_cost_per_1k = 0.0020

        input_cost = (estimated_input_tokens / 1000) * input_cost_per_1k
        output_cost = (estimated_output_tokens / 1000) * output_cost_per_1k

        return input_cost + output_cost

    def _estimate_cost_from_usage(self, token_usage: dict[str, Any], model: str) -> float:
        """Estimate cost from actual token usage"""
        if not token_usage:
            return 0.0

        prompt_tokens = token_usage.get("prompt_tokens", 0)
        completion_tokens = token_usage.get("completion_tokens", 0)

        # Pricing per 1K tokens (approximate)
        if "gpt-4" in model:
            input_rate = 0.03
            output_rate = 0.06
        else:  # GPT-3.5-turbo
            input_rate = 0.0010
            output_rate = 0.0020

        input_cost = (prompt_tokens / 1000) * input_rate
        output_cost = (completion_tokens / 1000) * output_rate

        return input_cost + output_cost
