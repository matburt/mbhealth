from typing import Dict, Any, Optional
from .base import BaseAIProvider
from .openai_provider import OpenAIProvider
from .anthropic_provider import AnthropicProvider
from .google_provider import GoogleProvider
from .custom_provider import CustomProvider

class ProviderFactory:
    """Factory class for creating AI provider instances"""
    
    @staticmethod
    def create_provider(
        provider_type: str, 
        api_key: str, 
        endpoint: Optional[str] = None,
        models: Optional[list] = None,
        **kwargs
    ) -> BaseAIProvider:
        """Create an AI provider instance based on type"""
        
        provider_type = provider_type.lower()
        
        if provider_type == "openai":
            return OpenAIProvider(api_key, endpoint, **kwargs)
        elif provider_type == "anthropic":
            return AnthropicProvider(api_key, endpoint, **kwargs)
        elif provider_type == "google":
            return GoogleProvider(api_key, endpoint, **kwargs)
        elif provider_type == "custom":
            return CustomProvider(api_key, endpoint, models=models, **kwargs)
        else:
            raise ValueError(f"Unknown provider type: {provider_type}")
    
    @staticmethod
    def get_supported_providers() -> Dict[str, Dict[str, Any]]:
        """Get information about supported provider types"""
        return {
            "openai": {
                "name": "OpenAI",
                "description": "OpenAI GPT models",
                "default_endpoint": "https://api.openai.com/v1",
                "requires_api_key": True,
                "supports_models": ["gpt-4-turbo-preview", "gpt-4", "gpt-3.5-turbo"],
                "cost_estimation": True
            },
            "anthropic": {
                "name": "Anthropic Claude",
                "description": "Anthropic Claude models", 
                "default_endpoint": "https://api.anthropic.com",
                "requires_api_key": True,
                "supports_models": ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
                "cost_estimation": True
            },
            "google": {
                "name": "Google AI",
                "description": "Google Generative AI models",
                "default_endpoint": "https://generativelanguage.googleapis.com",
                "requires_api_key": True,
                "supports_models": ["gemini-1.5-pro", "gemini-1.5-flash"],
                "cost_estimation": True
            },
            "custom": {
                "name": "Custom Provider",
                "description": "OpenAI-compatible custom endpoint (Ollama, LocalAI, etc.)",
                "default_endpoint": None,
                "requires_api_key": False,
                "supports_models": ["configurable"],
                "cost_estimation": False
            }
        }
    
    @staticmethod
    def validate_provider_config(provider_type: str, config: Dict[str, Any]) -> Dict[str, str]:
        """Validate provider configuration and return any errors"""
        errors = {}
        provider_type = provider_type.lower()
        
        supported_providers = ProviderFactory.get_supported_providers()
        if provider_type not in supported_providers:
            errors["provider_type"] = f"Unsupported provider type: {provider_type}"
            return errors
        
        provider_info = supported_providers[provider_type]
        
        # Check API key requirement
        if provider_info["requires_api_key"] and not config.get("api_key"):
            errors["api_key"] = "API key is required for this provider"
        
        # Check endpoint for custom providers
        if provider_type == "custom" and not config.get("endpoint"):
            errors["endpoint"] = "Endpoint URL is required for custom providers"
        
        # Validate endpoint format if provided
        if config.get("endpoint"):
            endpoint = config["endpoint"]
            if not endpoint.startswith(("http://", "https://")):
                errors["endpoint"] = "Endpoint must be a valid HTTP/HTTPS URL"
        
        return errors