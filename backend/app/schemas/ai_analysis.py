from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

# AI Provider Schemas
class AIProviderBase(BaseModel):
    name: str
    type: str  # openai, anthropic, google, custom
    endpoint: Optional[str] = None
    models: Optional[Dict[str, Any]] = None
    default_model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    enabled: bool = True
    priority: int = 0

class AIProviderCreate(AIProviderBase):
    api_key: Optional[str] = None  # Plain text, will be encrypted

class AIProviderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    endpoint: Optional[str] = None
    models: Optional[Dict[str, Any]] = None
    default_model: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    enabled: Optional[bool] = None
    priority: Optional[int] = None
    api_key: Optional[str] = None

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
    health_data_ids: List[int]
    analysis_type: str  # trends, insights, recommendations, anomalies
    provider: str  # This can be provider name or provider ID
    additional_context: Optional[str] = None

class AIAnalysisCreate(AIAnalysisBase):
    provider_id: Optional[str] = None  # Will be resolved from provider name if needed

class AIAnalysisUpdate(BaseModel):
    status: Optional[str] = None
    response_content: Optional[str] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
    token_usage: Optional[Dict[str, Any]] = None
    cost: Optional[float] = None

class AIAnalysisInDBBase(AIAnalysisBase):
    id: int
    user_id: int
    provider_id: Optional[str] = None
    model_used: Optional[str] = None
    request_prompt: str
    response_content: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    processing_time: Optional[float] = None
    token_usage: Optional[Dict[str, Any]] = None
    cost: Optional[float] = None

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AIAnalysis(AIAnalysisInDBBase):
    pass

class AIAnalysisWithProvider(AIAnalysis):
    provider: Optional[AIProvider] = None

# Analysis Job Schemas
class AnalysisJobBase(BaseModel):
    analysis_id: int
    provider_id: Optional[str] = None
    priority: int = 0

class AnalysisJobCreate(AnalysisJobBase):
    pass

class AnalysisJobUpdate(BaseModel):
    job_id: Optional[str] = None
    status: Optional[str] = None
    retry_count: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class AnalysisJobInDBBase(AnalysisJobBase):
    id: str
    user_id: int
    job_id: Optional[str] = None
    status: str
    retry_count: int
    max_retries: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
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
    preferred_providers: Optional[List[str]] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    default_analysis_types: Optional[List[str]] = None

class AnalysisSettingsCreate(AnalysisSettingsBase):
    pass

class AnalysisSettingsUpdate(AnalysisSettingsBase):
    auto_analysis_enabled: Optional[bool] = None
    analysis_frequency: Optional[str] = None
    preferred_providers: Optional[List[str]] = None
    notification_preferences: Optional[Dict[str, Any]] = None
    default_analysis_types: Optional[List[str]] = None

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
    health_data_ids: List[int]
    analysis_type: str
    provider: str  # Can be provider name or UUID
    additional_context: Optional[str] = None

class AIAnalysisResponse(BaseModel):
    id: int
    user_id: int
    health_data_ids: List[int]
    analysis_type: str
    provider: str
    request_prompt: str
    response_content: Optional[str] = None
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

class ProviderTestRequest(BaseModel):
    type: str
    endpoint: Optional[str] = None
    api_key: str
    model: Optional[str] = None

class ProviderTestResponse(BaseModel):
    success: bool
    message: str
    available_models: Optional[List[str]] = None
    response_time: Optional[float] = None


# Analysis Schedule Schemas
class AnalysisScheduleBase(BaseModel):
    name: str
    description: Optional[str] = None
    schedule_type: str  # recurring, one_time, data_threshold
    frequency: Optional[str] = None  # daily, weekly, monthly, custom
    interval_value: Optional[int] = None
    interval_unit: Optional[str] = None  # days, weeks, months
    time_of_day: Optional[str] = None  # HH:MM format
    days_of_week: Optional[List[str]] = None
    day_of_month: Optional[int] = None
    data_threshold_count: Optional[int] = None
    data_threshold_metric: Optional[str] = None
    analysis_types: List[str]
    data_selection_config: Dict[str, Any]
    provider_id: Optional[str] = None
    additional_context: Optional[str] = None
    enabled: bool = True

class AnalysisScheduleCreate(AnalysisScheduleBase):
    pass

class AnalysisScheduleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[str] = None
    frequency: Optional[str] = None
    interval_value: Optional[int] = None
    interval_unit: Optional[str] = None
    time_of_day: Optional[str] = None
    days_of_week: Optional[List[str]] = None
    day_of_month: Optional[int] = None
    data_threshold_count: Optional[int] = None
    data_threshold_metric: Optional[str] = None
    analysis_types: Optional[List[str]] = None
    data_selection_config: Optional[Dict[str, Any]] = None
    provider_id: Optional[str] = None
    additional_context: Optional[str] = None
    enabled: Optional[bool] = None

class AnalysisScheduleInDBBase(AnalysisScheduleBase):
    id: str
    user_id: int
    next_run_at: Optional[datetime] = None
    last_run_at: Optional[datetime] = None
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
    trigger_data: Optional[Dict[str, Any]] = None

class AnalysisScheduleExecutionCreate(AnalysisScheduleExecutionBase):
    schedule_id: str

class AnalysisScheduleExecutionUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None
    analyses_created: Optional[List[int]] = None
    analyses_count: Optional[int] = None
    success_count: Optional[int] = None
    failure_count: Optional[int] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = None

class AnalysisScheduleExecutionInDBBase(AnalysisScheduleExecutionBase):
    id: str
    schedule_id: str
    user_id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    analyses_created: Optional[List[int]] = None
    analyses_count: int
    success_count: int
    failure_count: int
    error_message: Optional[str] = None
    retry_count: int

    class Config:
        from_attributes = True
        protected_namespaces = ()

class AnalysisScheduleExecution(AnalysisScheduleExecutionInDBBase):
    pass


# Analysis History Schemas
class AnalysisHistoryBase(BaseModel):
    action: str  # created, updated, deleted, viewed, shared
    action_details: Optional[Dict[str, Any]] = None
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None
    session_id: Optional[str] = None
    analysis_snapshot: Optional[Dict[str, Any]] = None

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
    trigger_data: Optional[Dict[str, Any]] = None

class ScheduleListResponse(BaseModel):
    schedules: List[AnalysisSchedule]
    total_count: int
    active_count: int
    next_executions: List[Dict[str, Any]]  # Upcoming executions