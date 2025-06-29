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


class AnalysisSchedule(Base):
    __tablename__ = "analysis_schedules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # User-friendly name for the schedule
    description = Column(Text, nullable=True)  # Optional description
    
    # Schedule configuration
    schedule_type = Column(String, nullable=False)  # recurring, one_time, data_threshold
    frequency = Column(String, nullable=True)  # daily, weekly, monthly, custom
    interval_value = Column(Integer, nullable=True)  # For custom intervals (e.g., every 3 days)
    interval_unit = Column(String, nullable=True)  # days, weeks, months
    time_of_day = Column(String, nullable=True)  # HH:MM format for when to run
    days_of_week = Column(JSON, nullable=True)  # Array of day names for weekly schedules
    day_of_month = Column(Integer, nullable=True)  # Day of month for monthly schedules
    
    # Trigger configuration
    data_threshold_count = Column(Integer, nullable=True)  # Number of new data points to trigger
    data_threshold_metric = Column(String, nullable=True)  # Specific metric type to watch
    
    # Analysis configuration
    analysis_types = Column(JSON, nullable=False)  # Array of analysis types to run
    data_selection_config = Column(JSON, nullable=False)  # How to select data for analysis
    provider_id = Column(String, ForeignKey("ai_providers.id"), nullable=True)
    additional_context = Column(Text, nullable=True)
    
    # Schedule management
    enabled = Column(Boolean, default=True)
    next_run_at = Column(DateTime, nullable=True)  # When the next execution is scheduled
    last_run_at = Column(DateTime, nullable=True)  # When it was last executed
    run_count = Column(Integer, default=0)  # Number of times it has been executed
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="analysis_schedules")
    provider = relationship("AIProvider")
    executions = relationship("AnalysisScheduleExecution", back_populates="schedule")


class AnalysisScheduleExecution(Base):
    __tablename__ = "analysis_schedule_executions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    schedule_id = Column(String, ForeignKey("analysis_schedules.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Execution details
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    status = Column(String, default='pending')  # pending, running, completed, failed
    
    # Analysis results
    analyses_created = Column(JSON, nullable=True)  # Array of analysis IDs created
    analyses_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    
    # Error handling
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    
    # Execution metadata
    execution_type = Column(String, nullable=False)  # scheduled, manual, data_triggered
    trigger_data = Column(JSON, nullable=True)  # Data that triggered this execution

    # Relationships
    schedule = relationship("AnalysisSchedule", back_populates="executions")
    user = relationship("User")


class AnalysisHistory(Base):
    __tablename__ = "analysis_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # History metadata
    action = Column(String, nullable=False)  # created, updated, deleted, viewed, shared
    action_details = Column(JSON, nullable=True)  # Additional details about the action
    
    # User context
    user_agent = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    session_id = Column(String, nullable=True)
    
    # Analysis context at time of action
    analysis_snapshot = Column(JSON, nullable=True)  # Snapshot of analysis state
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    analysis = relationship("AIAnalysis")
    user = relationship("User")