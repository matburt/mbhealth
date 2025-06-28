from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, JSON, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base
import uuid

class AIProvider(Base):
    __tablename__ = "ai_providers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # openai, anthropic, google, custom
    endpoint = Column(Text, nullable=True)  # Custom endpoint URL
    api_key_encrypted = Column(Text, nullable=True)  # Encrypted API key
    models = Column(JSON, nullable=True)  # Available models
    default_model = Column(String, nullable=True)
    parameters = Column(JSON, nullable=True)  # Default parameters (temperature, max_tokens, etc.)
    enabled = Column(Boolean, default=True)
    priority = Column(Integer, default=0)  # Higher priority providers used first
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="ai_providers")
    analyses = relationship("AIAnalysis", back_populates="provider")

class AIAnalysis(Base):
    __tablename__ = "ai_analyses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    provider_id = Column(String, ForeignKey("ai_providers.id"), nullable=True)
    health_data_ids = Column(JSON, nullable=False)  # Array of health data IDs
    analysis_type = Column(String, nullable=False)  # trends, insights, recommendations, anomalies
    provider_name = Column(String, nullable=False)  # For legacy compatibility
    model_used = Column(String, nullable=True)
    request_prompt = Column(Text, nullable=False)
    response_content = Column(Text, nullable=True)
    status = Column(String, default='pending')  # pending, completed, failed
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Analysis metadata
    processing_time = Column(Float, nullable=True)  # Time taken in seconds
    token_usage = Column(JSON, nullable=True)  # Token usage statistics
    cost = Column(Float, nullable=True)  # Estimated cost

    # Relationships
    user = relationship("User", back_populates="ai_analyses")
    provider = relationship("AIProvider", back_populates="analyses")

class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False)
    provider_id = Column(String, ForeignKey("ai_providers.id"), nullable=True)
    job_id = Column(String, nullable=True)  # Celery job ID
    status = Column(String, default='queued')  # queued, processing, completed, failed
    priority = Column(Integer, default=0)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    analysis = relationship("AIAnalysis")
    provider = relationship("AIProvider")

class AnalysisSettings(Base):
    __tablename__ = "analysis_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    auto_analysis_enabled = Column(Boolean, default=False)
    analysis_frequency = Column(String, default='weekly')  # daily, weekly, monthly
    preferred_providers = Column(JSON, nullable=True)  # Array of provider IDs in preference order
    notification_preferences = Column(JSON, nullable=True)
    default_analysis_types = Column(JSON, nullable=True)  # Default analysis types to run
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="analysis_settings")