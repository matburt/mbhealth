
import os
from typing import List, Optional

from pydantic import Field, validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MBHealth"

    # Environment
    ENVIRONMENT: str = Field(default="development", env="ENVIRONMENT")
    DEBUG: bool = Field(default=False, env="DEBUG")
    LOG_LEVEL: str = Field(default="INFO", env="LOG_LEVEL")

    # Security
    SECRET_KEY: str = Field(..., min_length=32, env="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Database
    DATABASE_URL: str = Field(..., env="DATABASE_URL")

    # AI API Keys (all optional)
    OPENAI_API_KEY: Optional[str] = Field(default=None, env="OPENAI_API_KEY")
    OPENROUTER_API_KEY: Optional[str] = Field(default=None, env="OPENROUTER_API_KEY")
    GOOGLE_AI_API_KEY: Optional[str] = Field(default=None, env="GOOGLE_AI_API_KEY")
    ANTHROPIC_API_KEY: Optional[str] = Field(default=None, env="ANTHROPIC_API_KEY")

    # Encryption
    ENCRYPTION_KEY: Optional[str] = Field(default=None, env="ENCRYPTION_KEY")

    # Redis/Celery
    REDIS_URL: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")

    # WebSocket
    WEBSOCKET_URL: str = Field(default="ws://localhost:8000/ws", env="WEBSOCKET_URL")

    # CORS Origins
    BACKEND_CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        env="BACKEND_CORS_ORIGINS"
    )

    # Feature Flags
    ENABLE_AI_ANALYSIS: bool = Field(default=True, env="ENABLE_AI_ANALYSIS")
    ENABLE_NOTIFICATIONS: bool = Field(default=True, env="ENABLE_NOTIFICATIONS")  
    ENABLE_WORKFLOWS: bool = Field(default=True, env="ENABLE_WORKFLOWS")

    # Timezone Configuration
    DEFAULT_TIMEZONE: str = Field(default="America/New_York", env="DEFAULT_TIMEZONE")

    @validator('BACKEND_CORS_ORIGINS', pre=True)
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',')]
        return v

    @validator('LOG_LEVEL')
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Invalid log level. Must be one of: {valid_levels}')
        return v.upper()

    @validator('SECRET_KEY')
    def validate_secret_key(cls, v):
        if v == "your-secret-key-change-in-production":
            if os.getenv("ENVIRONMENT", "development") == "production":
                raise ValueError("SECRET_KEY must be changed from default value in production")
        return v

    @validator('ENVIRONMENT')
    def validate_environment(cls, v):
        valid_envs = ['development', 'staging', 'production']
        if v not in valid_envs:
            raise ValueError(f'Invalid environment. Must be one of: {valid_envs}')
        return v

    def get_configured_ai_providers(self) -> List[str]:
        """Return list of configured AI providers"""
        providers = []
        if self.OPENAI_API_KEY:
            providers.append('openai')
        if self.OPENROUTER_API_KEY:
            providers.append('openrouter')
        if self.GOOGLE_AI_API_KEY:
            providers.append('google')
        if self.ANTHROPIC_API_KEY:
            providers.append('anthropic')
        return providers

    @property
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.ENVIRONMENT == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return self.ENVIRONMENT == "production"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
