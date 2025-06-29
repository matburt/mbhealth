"""
Analysis Comparison API endpoints

Provides endpoints for comparing analyses, tracking trends, and monitoring provider performance.
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.schemas.analysis_comparison import (
    AnalysisComparison,
    AnalysisComparisonCreate,
    AnalysisComparisonUpdate,
    AnalysisImprovementSuggestion,
    AnalysisImprovementSuggestionCreate,
    AnalysisImprovementSuggestionUpdate,
    AnalysisTrend,
    ComparisonRequest,
    ComparisonResult,
    ProviderComparisonResult,
    ProviderPerformanceMetrics,
    ProviderPerformanceRequest,
    TrendAnalysisRequest,
    TrendAnalysisResult,
)
from app.schemas.user import User
from app.services.analysis_comparison_service import AnalysisComparisonService

router = APIRouter()


@router.post("/compare", response_model=ComparisonResult)
async def compare_analyses(
    *,
    db: Session = Depends(get_db),
    request: ComparisonRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Compare multiple analyses with detailed insights and recommendations.
    
    Supports different comparison types:
    - side_by_side: Direct comparison of analysis content and metadata
    - temporal_trend: Analysis of changes over time
    - provider_performance: Comparison of AI provider effectiveness
    """
    service = AnalysisComparisonService(db)
    try:
        result = service.compare_analyses(current_user.id, request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to perform comparison: {str(e)}"
        )


@router.post("/trends/analyze", response_model=TrendAnalysisResult)
async def analyze_trends(
    *,
    db: Session = Depends(get_db),
    request: TrendAnalysisRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Analyze trends in analyses over a specified time period.
    
    Provides statistical analysis including:
    - Trend direction and strength
    - Correlation analysis
    - Improvement metrics
    - Future projections
    """
    service = AnalysisComparisonService(db)
    try:
        result = service.analyze_trends(current_user.id, request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze trends: {str(e)}"
        )


@router.post("/providers/performance", response_model=ProviderComparisonResult)
async def analyze_provider_performance(
    *,
    db: Session = Depends(get_db),
    request: ProviderPerformanceRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Analyze and compare AI provider performance metrics.
    
    Includes analysis of:
    - Success rates and reliability
    - Processing speed and efficiency
    - Cost effectiveness
    - Quality metrics
    """
    service = AnalysisComparisonService(db)
    try:
        result = service.calculate_provider_performance(current_user.id, request)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze provider performance: {str(e)}"
        )


# Saved Comparisons Management
@router.post("/", response_model=AnalysisComparison)
async def create_comparison(
    *,
    db: Session = Depends(get_db),
    comparison_in: AnalysisComparisonCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create and save a new analysis comparison for future reference.
    """
    service = AnalysisComparisonService(db)
    try:
        comparison = service.create_comparison(current_user.id, comparison_in)
        return comparison
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create comparison: {str(e)}"
        )


@router.get("/", response_model=list[AnalysisComparison])
def get_comparisons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, description="Maximum number of comparisons to return"),
) -> Any:
    """
    Get all saved analysis comparisons for the current user.
    """
    service = AnalysisComparisonService(db)
    comparisons = service.get_comparisons(current_user.id, limit=limit)
    return comparisons


@router.get("/{comparison_id}", response_model=AnalysisComparison)
def get_comparison(
    *,
    db: Session = Depends(get_db),
    comparison_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific saved analysis comparison.
    """
    service = AnalysisComparisonService(db)
    comparison = service.get_comparison(current_user.id, comparison_id)

    if not comparison:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comparison not found"
        )

    return comparison


@router.put("/{comparison_id}", response_model=AnalysisComparison)
async def update_comparison(
    *,
    db: Session = Depends(get_db),
    comparison_id: str,
    comparison_in: AnalysisComparisonUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a saved analysis comparison.
    """
    service = AnalysisComparisonService(db)
    comparison = service.get_comparison(current_user.id, comparison_id)

    if not comparison:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comparison not found"
        )

    try:
        # Update comparison fields
        update_data = comparison_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(comparison, field, value)

        db.commit()
        db.refresh(comparison)
        return comparison
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update comparison: {str(e)}"
        )


@router.delete("/{comparison_id}")
def delete_comparison(
    *,
    db: Session = Depends(get_db),
    comparison_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a saved analysis comparison.
    """
    service = AnalysisComparisonService(db)
    comparison = service.get_comparison(current_user.id, comparison_id)

    if not comparison:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comparison not found"
        )

    try:
        db.delete(comparison)
        db.commit()
        return {"message": "Comparison deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete comparison: {str(e)}"
        )


# Provider Performance Metrics
@router.get("/providers/metrics", response_model=list[ProviderPerformanceMetrics])
def get_provider_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    provider_id: str = Query(None, description="Filter by specific provider"),
    period_type: str = Query("monthly", description="daily, weekly, monthly"),
    limit: int = Query(12, description="Number of periods to return"),
) -> Any:
    """
    Get historical provider performance metrics.
    """
    from app.models.analysis_comparison import ProviderPerformanceMetrics as ProviderMetricsModel

    query = db.query(ProviderMetricsModel).filter(
        ProviderMetricsModel.user_id == current_user.id,
        ProviderMetricsModel.period_type == period_type
    )

    if provider_id:
        query = query.filter(ProviderMetricsModel.provider_id == provider_id)

    metrics = query.order_by(ProviderMetricsModel.period_end.desc()).limit(limit).all()
    return metrics


# Analysis Trends
@router.get("/trends/", response_model=list[AnalysisTrend])
def get_analysis_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    trend_type: str = Query(None, description="Filter by trend type"),
    analysis_type: str = Query(None, description="Filter by analysis type"),
    significant_only: bool = Query(False, description="Only return statistically significant trends"),
    limit: int = Query(20, description="Maximum number of trends to return"),
) -> Any:
    """
    Get analysis trends for the current user.
    """
    from app.models.analysis_comparison import AnalysisTrend as AnalysisTrendModel

    query = db.query(AnalysisTrendModel).filter(
        AnalysisTrendModel.user_id == current_user.id
    )

    if trend_type:
        query = query.filter(AnalysisTrendModel.trend_type == trend_type)

    if analysis_type:
        query = query.filter(AnalysisTrendModel.analysis_type == analysis_type)

    if significant_only:
        query = query.filter(AnalysisTrendModel.is_significant == True)

    trends = query.order_by(AnalysisTrendModel.calculated_at.desc()).limit(limit).all()
    return trends


# Improvement Suggestions
@router.post("/suggestions/", response_model=AnalysisImprovementSuggestion)
async def create_improvement_suggestion(
    *,
    db: Session = Depends(get_db),
    suggestion_in: AnalysisImprovementSuggestionCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create a new analysis improvement suggestion.
    """
    from app.models.analysis_comparison import AnalysisImprovementSuggestion as SuggestionModel

    suggestion = SuggestionModel(
        user_id=current_user.id,
        **suggestion_in.dict()
    )

    try:
        db.add(suggestion)
        db.commit()
        db.refresh(suggestion)
        return suggestion
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create suggestion: {str(e)}"
        )


@router.get("/suggestions/", response_model=list[AnalysisImprovementSuggestion])
def get_improvement_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    status_filter: str = Query(None, description="Filter by status: pending, acknowledged, implemented, dismissed"),
    priority_filter: str = Query(None, description="Filter by priority: high, medium, low"),
    category_filter: str = Query(None, description="Filter by category"),
    limit: int = Query(50, description="Maximum number of suggestions to return"),
) -> Any:
    """
    Get analysis improvement suggestions for the current user.
    """
    from app.models.analysis_comparison import AnalysisImprovementSuggestion as SuggestionModel

    query = db.query(SuggestionModel).filter(
        SuggestionModel.user_id == current_user.id
    )

    if status_filter:
        query = query.filter(SuggestionModel.status == status_filter)

    if priority_filter:
        query = query.filter(SuggestionModel.priority_level == priority_filter)

    if category_filter:
        query = query.filter(SuggestionModel.category == category_filter)

    suggestions = query.order_by(SuggestionModel.created_at.desc()).limit(limit).all()
    return suggestions


@router.put("/suggestions/{suggestion_id}", response_model=AnalysisImprovementSuggestion)
async def update_improvement_suggestion(
    *,
    db: Session = Depends(get_db),
    suggestion_id: str,
    suggestion_in: AnalysisImprovementSuggestionUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update an analysis improvement suggestion (e.g., mark as implemented).
    """
    from app.models.analysis_comparison import AnalysisImprovementSuggestion as SuggestionModel

    suggestion = db.query(SuggestionModel).filter(
        SuggestionModel.id == suggestion_id,
        SuggestionModel.user_id == current_user.id
    ).first()

    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Suggestion not found"
        )

    try:
        update_data = suggestion_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(suggestion, field, value)

        # Set implementation timestamp if status is being set to implemented
        if suggestion_in.status == "implemented" and not suggestion.implemented_at:
            from datetime import datetime
            suggestion.implemented_at = datetime.utcnow()

        db.commit()
        db.refresh(suggestion)
        return suggestion
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update suggestion: {str(e)}"
        )


# Analytics Endpoints
@router.get("/analytics/summary")
def get_comparison_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a summary of comparison analytics for the dashboard.
    """
    from app.models.analysis_comparison import AnalysisComparison as ComparisonModel
    from app.models.analysis_comparison import AnalysisImprovementSuggestion as SuggestionModel
    from app.models.analysis_comparison import AnalysisTrend as TrendModel
    from app.models.analysis_comparison import ProviderPerformanceMetrics as MetricsModel

    # Count saved comparisons
    total_comparisons = db.query(ComparisonModel).filter(
        ComparisonModel.user_id == current_user.id
    ).count()

    # Count significant trends
    significant_trends = db.query(TrendModel).filter(
        TrendModel.user_id == current_user.id,
        TrendModel.is_significant == True
    ).count()

    # Count pending suggestions
    pending_suggestions = db.query(SuggestionModel).filter(
        SuggestionModel.user_id == current_user.id,
        SuggestionModel.status == "pending"
    ).count()

    # Get recent provider performance
    recent_metrics = db.query(MetricsModel).filter(
        MetricsModel.user_id == current_user.id
    ).order_by(MetricsModel.calculated_at.desc()).limit(5).all()

    return {
        "total_comparisons": total_comparisons,
        "significant_trends": significant_trends,
        "pending_suggestions": pending_suggestions,
        "recent_provider_metrics": len(recent_metrics),
        "has_comparison_data": total_comparisons > 0 or len(recent_metrics) > 0
    }
