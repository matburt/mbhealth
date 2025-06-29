import time
from typing import Any

import httpx

from .base import AIProviderError, AIProviderResponse, BaseAIProvider


class GoogleProvider(BaseAIProvider):
    """Google Generative AI provider"""

    def __init__(self, api_key: str, endpoint: str | None = None, **kwargs):
        self.base_url = endpoint or "https://generativelanguage.googleapis.com"
        super().__init__(api_key, endpoint, **kwargs)

    def get_available_models(self) -> list[str]:
        return [
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-pro",
            "chat-bison-001"
        ]

    def get_default_model(self) -> str:
        return "gemini-1.5-flash"

    async def test_connection(self) -> dict[str, Any]:
        """Test connection to Google AI API"""
        try:
            # Test with models list endpoint
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/v1/models?key={self.api_key}",
                    timeout=10.0
                )
                response.raise_for_status()

                models_data = response.json()
                available_models = [model["name"].split("/")[-1] for model in models_data.get("models", [])]

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

    async def generate_analysis(
        self,
        prompt: str,
        health_data: list[dict[str, Any]],
        model: str | None = None,
        **kwargs
    ) -> AIProviderResponse:
        """Generate analysis using Google Generative AI"""

        model = model or self.get_default_model()
        health_data_str = self._prepare_health_data(health_data)

        # Get parameters with defaults
        temperature = kwargs.get("temperature", self.parameters.get("temperature", 0.7))
        max_tokens = kwargs.get("max_tokens", self.parameters.get("max_tokens", 8192))  # Increased from 2000

        # Combine prompt and data
        full_content = f"{prompt}\n\nPlease analyze this health data:\n\n{health_data_str}"

        # Different API structure for different models
        if model.startswith("gemini"):
            payload = {
                "contents": [{
                    "parts": [{"text": full_content}]
                }],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens
                }
            }
            endpoint = f"{self.base_url}/v1beta/models/{model}:generateContent"
        else:
            # Legacy chat-bison format
            payload = {
                "prompt": {"messages": [{"content": full_content}]},
                "temperature": temperature,
                "candidateCount": 1
            }
            endpoint = f"{self.base_url}/v1beta2/models/{model}:generateMessage"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                start_time = time.time()
                response = await client.post(
                    f"{endpoint}?key={self.api_key}",
                    json=payload
                )
                end_time = time.time()
                processing_time = end_time - start_time

                response.raise_for_status()
                result = response.json()

                # Extract content based on model type
                if model.startswith("gemini"):
                    candidate = result["candidates"][0]
                    content = candidate["content"]["parts"][0]["text"]

                    # Check for truncation
                    finish_reason = candidate.get("finishReason", "")
                    if finish_reason == "MAX_TOKENS":
                        # Response was truncated, try to add a note
                        content += "\n\n[Note: Response was truncated due to length limits. Consider asking for a shorter analysis or breaking this into multiple smaller analyses.]"
                    elif finish_reason == "SAFETY":
                        content += "\n\n[Note: Response was filtered for safety reasons.]"
                    elif finish_reason not in ["STOP", ""]:
                        content += f"\n\n[Note: Response ended due to: {finish_reason}]"

                    token_usage = {
                        "prompt_tokens": result.get("usageMetadata", {}).get("promptTokenCount", 0),
                        "completion_tokens": result.get("usageMetadata", {}).get("candidatesTokenCount", 0),
                        "total_tokens": result.get("usageMetadata", {}).get("totalTokenCount", 0)
                    }

                    # Add finish reason to metadata
                    metadata = {"provider": "google", "finish_reason": finish_reason}
                else:
                    # Legacy chat-bison format
                    candidate = result["candidates"][0]
                    content = candidate["content"]
                    token_usage = {}  # Legacy model doesn't provide usage stats
                    metadata = {"provider": "google", "model_type": "legacy"}

                # Estimate cost
                cost = self._estimate_cost_from_usage(token_usage, model)

                return AIProviderResponse(
                    content=content,
                    model_used=model,
                    token_usage=token_usage,
                    processing_time=processing_time,
                    cost=cost,
                    metadata=metadata
                )

        except httpx.HTTPStatusError as e:
            error_msg = f"Google AI API error: {e.response.status_code}"
            try:
                error_detail = e.response.json()
                error_msg += f" - {error_detail.get('error', {}).get('message', 'Unknown error')}"
            except:
                error_msg += f" - {e.response.text}"
            raise AIProviderError(error_msg)
        except Exception as e:
            raise AIProviderError(f"Google AI request failed: {str(e)}")

    def estimate_cost(self, prompt: str, health_data: list[dict[str, Any]]) -> float:
        """Estimate cost for Google AI analysis"""
        health_data_str = self._prepare_health_data(health_data)
        total_chars = len(prompt) + len(health_data_str)
        estimated_input_tokens = total_chars // 4
        estimated_output_tokens = 500

        # Gemini pricing (as of 2024)
        input_cost_per_1k = 0.00125  # $1.25 per million tokens
        output_cost_per_1k = 0.00375  # $3.75 per million tokens

        input_cost = (estimated_input_tokens / 1000) * input_cost_per_1k
        output_cost = (estimated_output_tokens / 1000) * output_cost_per_1k

        return input_cost + output_cost

    def _estimate_cost_from_usage(self, token_usage: dict[str, Any], model: str) -> float:
        """Estimate cost from actual token usage"""
        if not token_usage:
            return 0.0

        input_tokens = token_usage.get("prompt_tokens", 0)
        output_tokens = token_usage.get("completion_tokens", 0)

        # Gemini pricing
        if model.startswith("gemini-1.5-pro"):
            input_rate = 0.00125
            output_rate = 0.00375
        else:  # gemini-1.5-flash and others
            input_rate = 0.000075
            output_rate = 0.0003

        input_cost = (input_tokens / 1000) * input_rate
        output_cost = (output_tokens / 1000) * output_rate

        return input_cost + output_cost
