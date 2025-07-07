from datetime import datetime
from typing import Any

from pydantic import BaseModel


# AI Provider Schemas
class AIProviderBase(BaseModel):
    name: str
    type: str  # openai, anthropic, google, custom
    endpoint: str | None = None
    models: dict[str, Any] | None = None
    default_model: str | None = None
    parameters: dict[str, Any] | None = None
    enabled: bool = True
    priority: int = 0

class AIProviderCreate(AIProviderBase):
    api_key: str | None = None  # Plain text, will be encrypted

class AIProviderUpdate(BaseModel):
    name: str | None = None
    type: str | None = None
    endpoint: str | None = None
    models: dict[str, Any] | None = None
    default_model: str | None = None
    parameters: dict[str, Any] | None = None
    enabled: bool | None = None
    priority: int | None = None
    api_key: str | None = None

class AIProviderInDBBase(AIProviderBase):
    id: str
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AIProvider(AIProviderInDBBase):
    pass

class AIProviderWithoutKey(AIProviderInDBBase):
    """Provider model without sensitive API key data"""
    pass

# AI Analysis Schemas
class AIAnalysisBase(BaseModel):
    health_data_ids: list[int] = []  # Allow empty list for general questions
    analysis_type: str  # trends, insights, recommendations, anomalies
    provider: str  # This can be provider name or provider ID
    additional_context: str | None = None

class AIAnalysisCreate(AIAnalysisBase):
    provider_id: str | None = None  # Will be resolved from provider name if needed

class AIAnalysisUpdate(BaseModel):
    status: str | None = None
    response_content: str | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    processing_time: float | None = None
    token_usage: dict[str, Any] | None = None
    cost: float | None = None

class AIAnalysisInDBBase(AIAnalysisBase):
    id: int
    user_id: int
    provider_id: str | None = None
    model_used: str | None = None
    request_prompt: str
    response_content: str | None = None
    status: str
    created_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None
    processing_time: float | None = None
    token_usage: dict[str, Any] | None = None
    cost: float | None = None

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AIAnalysis(AIAnalysisInDBBase):
    pass

class AIAnalysisWithProvider(AIAnalysis):
    provider: AIProvider | None = None

# Analysis Job Schemas
class AnalysisJobBase(BaseModel):
    analysis_id: int
    provider_id: str | None = None
    priority: int = 0

class AnalysisJobCreate(AnalysisJobBase):
    pass

class AnalysisJobUpdate(BaseModel):
    job_id: str | None = None
    status: str | None = None
    retry_count: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None

class AnalysisJobInDBBase(AnalysisJobBase):
    id: str
    user_id: int
    job_id: str | None = None
    status: str
    retry_count: int
    max_retries: int
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error_message: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AnalysisJob(AnalysisJobInDBBase):
    pass

# Analysis Settings Schemas
class AnalysisSettingsBase(BaseModel):
    auto_analysis_enabled: bool = False
    analysis_frequency: str = 'weekly'
    preferred_providers: list[str] | None = None
    notification_preferences: dict[str, Any] | None = None
    default_analysis_types: list[str] | None = None

class AnalysisSettingsCreate(AnalysisSettingsBase):
    pass

class AnalysisSettingsUpdate(AnalysisSettingsBase):
    auto_analysis_enabled: bool | None = None
    analysis_frequency: str | None = None
    preferred_providers: list[str] | None = None
    notification_preferences: dict[str, Any] | None = None
    default_analysis_types: list[str] | None = None

class AnalysisSettingsInDBBase(AnalysisSettingsBase):
    id: str
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AnalysisSettings(AnalysisSettingsInDBBase):
    pass

# Request/Response Schemas for API endpoints
class AIAnalysisRequest(BaseModel):
    health_data_ids: list[int]
    analysis_type: str
    provider: str  # Can be provider name or UUID
    additional_context: str | None = None

class AIAnalysisResponse(BaseModel):
    id: int
    user_id: int
    health_data_ids: list[int]
    analysis_type: str
    provider: str
    request_prompt: str
    response_content: str | None = None
    status: str
    created_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None

class ProviderTestRequest(BaseModel):
    type: str
    endpoint: str | None = None
    api_key: str
    model: str | None = None

class ProviderTestResponse(BaseModel):
    success: bool
    message: str
    available_models: list[str] | None = None
    response_time: float | None = None


# Analysis Schedule Schemas
class AnalysisScheduleBase(BaseModel):
    name: str
    description: str | None = None
    schedule_type: str  # recurring, one_time, data_threshold
    frequency: str | None = None  # daily, weekly, monthly, custom
    interval_value: int | None = None
    interval_unit: str | None = None  # days, weeks, months
    time_of_day: str | None = None  # HH:MM format
    days_of_week: list[str] | None = None
    day_of_month: int | None = None
    data_threshold_count: int | None = None
    data_threshold_metric: str | None = None
    analysis_types: list[str]
    data_selection_config: dict[str, Any]
    provider_id: str | None = None
    additional_context: str | None = None
    enabled: bool = True

class AnalysisScheduleCreate(AnalysisScheduleBase):
    pass

class AnalysisScheduleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    schedule_type: str | None = None
    frequency: str | None = None
    interval_value: int | None = None
    interval_unit: str | None = None
    time_of_day: str | None = None
    days_of_week: list[str] | None = None
    day_of_month: int | None = None
    data_threshold_count: int | None = None
    data_threshold_metric: str | None = None
    analysis_types: list[str] | None = None
    data_selection_config: dict[str, Any] | None = None
    provider_id: str | None = None
    additional_context: str | None = None
    enabled: bool | None = None

class AnalysisScheduleInDBBase(AnalysisScheduleBase):
    id: str
    user_id: int
    next_run_at: datetime | None = None
    last_run_at: datetime | None = None
    run_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AnalysisSchedule(AnalysisScheduleInDBBase):
    pass


# Analysis Schedule Execution Schemas
class AnalysisScheduleExecutionBase(BaseModel):
    execution_type: str  # scheduled, manual, data_triggered
    trigger_data: dict[str, Any] | None = None

class AnalysisScheduleExecutionCreate(AnalysisScheduleExecutionBase):
    schedule_id: str

class AnalysisScheduleExecutionUpdate(BaseModel):
    status: str | None = None
    completed_at: datetime | None = None
    analyses_created: list[int] | None = None
    analyses_count: int | None = None
    success_count: int | None = None
    failure_count: int | None = None
    error_message: str | None = None
    retry_count: int | None = None

class AnalysisScheduleExecutionInDBBase(AnalysisScheduleExecutionBase):
    id: str
    schedule_id: str
    user_id: int
    started_at: datetime
    completed_at: datetime | None = None
    status: str
    analyses_created: list[int] | None = None
    analyses_count: int
    success_count: int
    failure_count: int
    error_message: str | None = None
    retry_count: int

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AnalysisScheduleExecution(AnalysisScheduleExecutionInDBBase):
    pass


# Analysis History Schemas
class AnalysisHistoryBase(BaseModel):
    action: str  # created, updated, deleted, viewed, shared
    action_details: dict[str, Any] | None = None
    user_agent: str | None = None
    ip_address: str | None = None
    session_id: str | None = None
    analysis_snapshot: dict[str, Any] | None = None

class AnalysisHistoryCreate(AnalysisHistoryBase):
    analysis_id: int

class AnalysisHistoryInDBBase(AnalysisHistoryBase):
    id: str
    analysis_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AnalysisHistory(AnalysisHistoryInDBBase):
    pass


# Schedule Management Request/Response Schemas
class ScheduleExecutionRequest(BaseModel):
    schedule_id: str
    execution_type: str = "manual"
    trigger_data: dict[str, Any] | None = None

class ScheduleListResponse(BaseModel):
    schedules: list[AnalysisSchedule]
    total_count: int
    active_count: int
    next_executions: list[dict[str, Any]]  # Upcoming executions
