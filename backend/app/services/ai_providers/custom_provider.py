import time
from typing import Any

import httpx

from .base import AIProviderError, AIProviderResponse, BaseAIProvider


class CustomProvider(BaseAIProvider):
    """Custom OpenAI-compatible provider (for self-hosted solutions like Ollama, LocalAI, etc.)"""

    def __init__(self, api_key: str, endpoint: str, models: list[str] | None = None, **kwargs):
        if not endpoint:
            raise ValueError("Custom provider requires an endpoint URL")
        super().__init__(api_key, endpoint, **kwargs)
        self._available_models = models or ["custom-model"]

    def get_available_models(self) -> list[str]:
        return self._available_models

    def get_default_model(self) -> str:
        return self._available_models[0] if self._available_models else "custom-model"

    async def test_connection(self) -> dict[str, Any]:
        """Test connection to custom OpenAI-compatible API"""
        try:
            headers = {}
            if self.api_key and self.api_key != "not-required":
                headers["Authorization"] = f"Bearer {self.api_key}"
            headers["Content-Type"] = "application/json"

            # Try to get models list first
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        f"{self.endpoint}/models",
                        headers=headers,
                        timeout=10.0
                    )
                    if response.status_code == 200:
                        models_data = response.json()
                        available_models = [model["id"] for model in models_data.get("data", [])]
                        if available_models:
                            self._available_models = available_models

                        return {
                            "success": True,
                            "message": "Connection successful",
                            "available_models": available_models,
                            "response_time": response.elapsed.total_seconds()
                        }
                except Exception as e:
                    # Log the error but continue with test completion fallback
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.debug(f"Failed to fetch models list from {self.endpoint}/models: {str(e)}")
                    # Fall back to test completion

                # Fallback: test with a simple completion
                payload = {
                    "model": self.get_default_model(),
                    "messages": [
                        {"role": "user", "content": "Hello"}
                    ],
                    "max_tokens": 10
                }

                response = await client.post(
                    f"{self.endpoint}/chat/completions",
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

    async def generate_analysis(
        self,
        prompt: str,
        health_data: list[dict[str, Any]],
        model: str | None = None,
        **kwargs
    ) -> AIProviderResponse:
        """Generate analysis using custom OpenAI-compatible API"""

        model = model or self.get_default_model()
        health_data_str = self._prepare_health_data(health_data)

        headers = {}
        if self.api_key and self.api_key != "not-required":
            headers["Authorization"] = f"Bearer {self.api_key}"
        headers["Content-Type"] = "application/json"

        # Get parameters with defaults
        temperature = kwargs.get("temperature", self.parameters.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.parameters.get("max_tokens", 2000))

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": f"Please analyze this health data:\n\n{health_data_str}"}
            ],
            "temperature": temperature,
            "max_tokens": max_tokens
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                start_time = time.time()
                response = await client.post(
                    f"{self.endpoint}/chat/completions",
                    json=payload,
                    headers=headers
                )
                end_time = time.time()
                processing_time = end_time - start_time

                response.raise_for_status()
                result = response.json()

                content = result["choices"][0]["message"]["content"]
                token_usage = result.get("usage", {})

                # Custom providers may not support cost estimation
                cost = 0.0

                return AIProviderResponse(
                    content=content,
                    model_used=model,
                    token_usage=token_usage,
                    processing_time=processing_time,
                    cost=cost,
                    metadata={"provider": "custom", "endpoint": self.endpoint}
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"Custom API error: {e.response.status_code}"
            try:
                error_detail = e.response.json()
                error_msg += f" - {error_detail.get('error', {}).get('message', 'Unknown error')}"
            except Exception:
                error_msg += f" - {e.response.text}"
            raise AIProviderError(error_msg)
        except Exception as e:
            raise AIProviderError(f"Custom API request failed: {str(e)}")

    def estimate_cost(self, prompt: str, health_data: list[dict[str, Any]]) -> float:
        """Custom providers typically don't have cost estimation"""
        return 0.0
