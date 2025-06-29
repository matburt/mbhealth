from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# Analysis Comparison Schemas
class AnalysisComparisonBase(BaseModel):
    name: str = Field(..., description="User-defined comparison name")
    description: str | None = Field(None, description="Optional comparison description")
    analysis_ids: list[int] = Field(..., description="List of analysis IDs to compare")
    comparison_type: str = Field(..., description="Type of comparison: side_by_side, temporal_trend, provider_performance")
    comparison_criteria: dict[str, Any] | None = Field(None, description="Comparison parameters and filters")


class AnalysisComparisonCreate(AnalysisComparisonBase):
    pass


class AnalysisComparisonUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    comparison_criteria: dict[str, Any] | None = None
    is_shared: bool | None = None


class AnalysisComparison(AnalysisComparisonBase):
    id: str
    user_id: int
    comparison_results: dict[str, Any] | None = None
    key_differences: dict[str, Any] | None = None
    statistical_insights: dict[str, Any] | None = None
    trend_analysis: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime
    is_shared: bool

    class Config:
        from_attributes = True


# Provider Performance Metrics Schemas
class ProviderPerformanceMetricsBase(BaseModel):
    provider_id: str
    period_start: datetime
    period_end: datetime
    period_type: str = Field(..., description="daily, weekly, monthly")


class ProviderPerformanceMetricsCreate(ProviderPerformanceMetricsBase):
    pass


class ProviderPerformanceMetrics(ProviderPerformanceMetricsBase):
    id: str
    user_id: int
    total_analyses: int = 0
    successful_analyses: int = 0
    failed_analyses: int = 0
    avg_processing_time: float | None = None
    total_cost: float | None = None
    avg_cost_per_analysis: float | None = None
    avg_response_length: float | None = None
    avg_token_usage: float | None = None
    user_satisfaction_score: float | None = None
    analysis_type_breakdown: dict[str, int] | None = None
    success_rate: float | None = None
    efficiency_score: float | None = None
    reliability_score: float | None = None
    calculated_at: datetime

    class Config:
        from_attributes = True


# Analysis Trend Schemas
class AnalysisTrendBase(BaseModel):
    trend_type: str = Field(..., description="health_improvement, recommendation_effectiveness, pattern_detection")
    analysis_type: str | None = Field(None, description="Filter by analysis type")
    metric_focus: str | None = Field(None, description="blood_pressure, weight, etc.")
    period_start: datetime
    period_end: datetime


class AnalysisTrendCreate(AnalysisTrendBase):
    pass


class AnalysisTrend(AnalysisTrendBase):
    id: str
    user_id: int
    data_points_count: int
    trend_direction: str | None = None  # improving, declining, stable, cyclical
    trend_strength: float | None = None  # Statistical significance (0-1)
    confidence_level: float | None = None  # Statistical confidence (0-1)
    correlation_coefficient: float | None = None
    regression_data: dict[str, Any] | None = None
    seasonal_patterns: dict[str, Any] | None = None
    outliers: list[dict[str, Any]] | None = None
    key_insights: list[str] | None = None
    improvement_suggestions: list[str] | None = None
    next_analysis_suggestions: list[str] | None = None
    improvement_percentage: float | None = None
    rate_of_change: float | None = None
    calculated_at: datetime
    last_updated: datetime
    is_significant: bool = False

    class Config:
        from_attributes = True


# Analysis Improvement Suggestion Schemas
class AnalysisImprovementSuggestionBase(BaseModel):
    suggestion_type: str = Field(..., description="data_collection, analysis_frequency, provider_selection, context_improvement")
    priority_level: str = Field(..., description="high, medium, low")
    category: str = Field(..., description="accuracy, completeness, efficiency, health_outcomes")
    title: str
    description: str
    detailed_explanation: str | None = None
    action_steps: list[str] | None = None


class AnalysisImprovementSuggestionCreate(AnalysisImprovementSuggestionBase):
    analysis_id: int | None = None


class AnalysisImprovementSuggestionUpdate(BaseModel):
    status: str | None = Field(None, description="pending, acknowledged, implemented, dismissed")
    user_feedback: str | None = None
    implementation_notes: str | None = None
    effectiveness_score: float | None = None


class AnalysisImprovementSuggestion(AnalysisImprovementSuggestionBase):
    id: str
    user_id: int
    analysis_id: int | None = None
    expected_improvement: str | None = None
    effort_level: str | None = None  # low, medium, high
    implementation_time: str | None = None
    supporting_data: dict[str, Any] | None = None
    related_analyses: list[int] | None = None
    success_examples: list[dict[str, Any]] | None = None
    status: str = "pending"
    user_feedback: str | None = None
    implementation_notes: str | None = None
    implemented_at: datetime | None = None
    effectiveness_score: float | None = None
    follow_up_analysis_ids: list[int] | None = None
    created_at: datetime
    updated_at: datetime
    expires_at: datetime | None = None

    class Config:
        from_attributes = True


# Comparison-specific response schemas
class ComparisonResult(BaseModel):
    """Result of comparing two or more analyses"""
    comparison_id: str
    analysis_ids: list[int]
    comparison_type: str
    summary: dict[str, Any]
    differences: list[dict[str, Any]]
    similarities: list[dict[str, Any]]
    statistical_analysis: dict[str, Any] | None = None
    recommendations: list[str]
    confidence_score: float | None = None


class TrendAnalysisResult(BaseModel):
    """Result of trending analysis over time"""
    trend_id: str
    analysis_ids: list[int]
    time_period: dict[str, datetime]
    trend_direction: str
    trend_strength: float
    key_insights: list[str]
    statistical_data: dict[str, Any]
    projections: dict[str, Any] | None = None
    improvement_metrics: dict[str, Any] | None = None


class ProviderComparisonResult(BaseModel):
    """Result comparing AI provider performance"""
    providers: list[dict[str, Any]]
    comparison_period: dict[str, datetime]
    metrics: dict[str, dict[str, float]]  # provider_id -> metric_name -> value
    rankings: dict[str, list[str]]  # metric_name -> ordered list of provider_ids
    recommendations: dict[str, str]  # recommendation_type -> provider_id
    cost_analysis: dict[str, Any]
    efficiency_analysis: dict[str, Any]


# Request schemas for comparison operations
class ComparisonRequest(BaseModel):
    analysis_ids: list[int] = Field(..., min_items=2, description="At least 2 analyses to compare")
    comparison_type: str = Field(..., description="side_by_side, temporal_trend, provider_performance")
    include_statistical_analysis: bool = Field(True, description="Include statistical analysis")
    focus_areas: list[str] | None = Field(None, description="Specific areas to focus comparison on")
    save_comparison: bool = Field(False, description="Save this comparison for future reference")
    comparison_name: str | None = Field(None, description="Name for saved comparison")


class TrendAnalysisRequest(BaseModel):
    analysis_type: str | None = Field(None, description="Filter by specific analysis type")
    metric_focus: str | None = Field(None, description="Focus on specific health metric")
    period_start: datetime
    period_end: datetime
    min_data_points: int = Field(3, description="Minimum number of analyses required")
    include_projections: bool = Field(True, description="Include future projections")
    statistical_tests: list[str] = Field(["correlation", "regression"], description="Statistical tests to perform")


class ProviderPerformanceRequest(BaseModel):
    provider_ids: list[str] | None = Field(None, description="Specific providers to analyze, or all if None")
    period_start: datetime
    period_end: datetime
    metrics: list[str] = Field(["success_rate", "avg_processing_time", "cost_efficiency"], description="Metrics to include")
    include_recommendations: bool = Field(True, description="Include provider recommendations")
    analysis_type_filter: str | None = Field(None, description="Filter by analysis type")
