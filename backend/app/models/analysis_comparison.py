import uuid
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class AnalysisComparison(Base):
    """Store analysis comparison sessions and results"""
    __tablename__ = "analysis_comparisons"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)  # User-defined comparison name
    description = Column(Text, nullable=True)

    # Comparison configuration
    analysis_ids = Column(JSON, nullable=False)  # Array of analysis IDs being compared
    comparison_type = Column(String, nullable=False)  # side_by_side, temporal_trend, provider_performance
    comparison_criteria = Column(JSON, nullable=True)  # Comparison parameters and filters

    # Results and insights
    comparison_results = Column(JSON, nullable=True)  # Detailed comparison analysis
    key_differences = Column(JSON, nullable=True)  # Highlighted differences
    statistical_insights = Column(JSON, nullable=True)  # Statistical analysis results
    trend_analysis = Column(JSON, nullable=True)  # Trend detection results

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_shared = Column(Boolean, default=False)

    # Relationships
    user = relationship("User")


class ProviderPerformanceMetrics(Base):
    """Track AI provider performance metrics over time"""
    __tablename__ = "provider_performance_metrics"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    provider_id = Column(String, ForeignKey("ai_providers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Time period for this metric calculation
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    period_type = Column(String, nullable=False)  # daily, weekly, monthly

    # Performance metrics
    total_analyses = Column(Integer, default=0)
    successful_analyses = Column(Integer, default=0)
    failed_analyses = Column(Integer, default=0)
    avg_processing_time = Column(Float, nullable=True)  # Average seconds
    total_cost = Column(Float, nullable=True)  # Total cost for period
    avg_cost_per_analysis = Column(Float, nullable=True)

    # Quality metrics
    avg_response_length = Column(Float, nullable=True)  # Average response character length
    avg_token_usage = Column(Float, nullable=True)  # Average tokens used
    user_satisfaction_score = Column(Float, nullable=True)  # If user provides feedback

    # Analysis type breakdown
    analysis_type_breakdown = Column(JSON, nullable=True)  # Count per analysis type

    # Computed metrics
    success_rate = Column(Float, nullable=True)  # Percentage
    efficiency_score = Column(Float, nullable=True)  # Custom score based on speed/cost/quality
    reliability_score = Column(Float, nullable=True)  # Based on consistency over time

    # Metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    provider = relationship("AIProvider")
    user = relationship("User")


class AnalysisTrend(Base):
    """Store statistical trends and insights about analysis patterns"""
    __tablename__ = "analysis_trends"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Trend identification
    trend_type = Column(String, nullable=False)  # health_improvement, recommendation_effectiveness, pattern_detection
    analysis_type = Column(String, nullable=True)  # Filter by analysis type if applicable
    metric_focus = Column(String, nullable=True)  # blood_pressure, weight, etc.

    # Time period
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    data_points_count = Column(Integer, nullable=False)  # Number of analyses in trend

    # Trend analysis results
    trend_direction = Column(String, nullable=True)  # improving, declining, stable, cyclical
    trend_strength = Column(Float, nullable=True)  # Statistical significance (0-1)
    confidence_level = Column(Float, nullable=True)  # Statistical confidence (0-1)

    # Statistical data
    correlation_coefficient = Column(Float, nullable=True)  # For correlation analysis
    regression_data = Column(JSON, nullable=True)  # Linear/polynomial regression results
    seasonal_patterns = Column(JSON, nullable=True)  # Detected seasonal/cyclical patterns
    outliers = Column(JSON, nullable=True)  # Detected outlier analyses

    # Insights and recommendations
    key_insights = Column(JSON, nullable=True)  # AI-generated insights about the trend
    improvement_suggestions = Column(JSON, nullable=True)  # Specific recommendations
    next_analysis_suggestions = Column(JSON, nullable=True)  # Suggested follow-up analyses

    # Change metrics
    improvement_percentage = Column(Float, nullable=True)  # Quantified improvement if applicable
    rate_of_change = Column(Float, nullable=True)  # Rate of change over time

    # Metadata
    calculated_at = Column(DateTime, default=datetime.utcnow)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_significant = Column(Boolean, default=False)  # Statistically significant trend

    # Relationships
    user = relationship("User")


class AnalysisImprovementSuggestion(Base):
    """Store AI-generated suggestions for improving analysis quality and insights"""
    __tablename__ = "analysis_improvement_suggestions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=True)  # Optional, for specific analysis

    # Suggestion details
    suggestion_type = Column(String, nullable=False)  # data_collection, analysis_frequency, provider_selection, context_improvement
    priority_level = Column(String, nullable=False)  # high, medium, low
    category = Column(String, nullable=False)  # accuracy, completeness, efficiency, health_outcomes

    # Suggestion content
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    detailed_explanation = Column(Text, nullable=True)
    action_steps = Column(JSON, nullable=True)  # Step-by-step implementation guide

    # Impact prediction
    expected_improvement = Column(String, nullable=True)  # Description of expected benefits
    effort_level = Column(String, nullable=True)  # low, medium, high
    implementation_time = Column(String, nullable=True)  # estimated time to implement

    # Context and evidence
    supporting_data = Column(JSON, nullable=True)  # Data that supports this suggestion
    related_analyses = Column(JSON, nullable=True)  # Related analysis IDs
    success_examples = Column(JSON, nullable=True)  # Examples of successful implementation

    # Status tracking
    status = Column(String, default='pending')  # pending, acknowledged, implemented, dismissed
    user_feedback = Column(Text, nullable=True)  # User's feedback on the suggestion
    implementation_notes = Column(Text, nullable=True)  # Notes on implementation

    # Effectiveness tracking
    implemented_at = Column(DateTime, nullable=True)
    effectiveness_score = Column(Float, nullable=True)  # User-provided or calculated
    follow_up_analysis_ids = Column(JSON, nullable=True)  # Analyses after implementation

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)  # When suggestion becomes outdated

    # Relationships
    user = relationship("User")
    analysis = relationship("AIAnalysis")
