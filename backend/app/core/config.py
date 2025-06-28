from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "MBHealth"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database
    DATABASE_URL: str = "sqlite:///./health_data.db"
    
    # AI API Keys
    OPENAI_API_KEY: Optional[str] = None
    OPENROUTER_API_KEY: Optional[str] = None
    GOOGLE_AI_API_KEY: Optional[str] = None
    
    # Encryption
    ENCRYPTION_KEY: Optional[str] = None
    
    # Redis/Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # WebSocket
    WEBSOCKET_URL: str = "ws://localhost:8000/ws"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings() 