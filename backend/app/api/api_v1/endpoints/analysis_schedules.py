"""
Analysis Schedule API endpoints

Provides REST API for managing analysis schedules, executions, and history.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.schemas.ai_analysis import (
    AnalysisHistory,
    AnalysisSchedule,
    AnalysisScheduleCreate,
    AnalysisScheduleExecution,
    AnalysisScheduleUpdate,
    ScheduleExecutionRequest,
    ScheduleListResponse,
)
from app.schemas.user import User
from app.services.analysis_history import get_analysis_history_service
from app.services.analysis_scheduler import get_analysis_scheduler_service

router = APIRouter()


@router.post("/", response_model=AnalysisSchedule)
async def create_schedule(
    *,
    db: Session = Depends(get_db),
    schedule_in: AnalysisScheduleCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create a new analysis schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    try:
        schedule = await scheduler_service.create_schedule(current_user.id, schedule_in)
        return schedule
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create schedule: {str(e)}"
        )


@router.get("/", response_model=ScheduleListResponse)
def get_schedules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    enabled_only: bool = Query(False, description="Only return enabled schedules"),
) -> Any:
    """
    Get all analysis schedules for the current user.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    schedules = scheduler_service.get_schedules(current_user.id, enabled_only=enabled_only)

    # Calculate statistics
    total_count = len(schedules)
    active_count = len([s for s in schedules if s.enabled])

    # Get next executions
    next_executions = []
    for schedule in schedules:
        if schedule.enabled and schedule.next_run_at:
            next_executions.append({
                "schedule_id": schedule.id,
                "schedule_name": schedule.name,
                "next_run_at": schedule.next_run_at,
                "analysis_types": schedule.analysis_types
            })

    # Sort by next run time
    next_executions.sort(key=lambda x: x["next_run_at"])

    return ScheduleListResponse(
        schedules=schedules,
        total_count=total_count,
        active_count=active_count,
        next_executions=next_executions[:10]  # Next 10 executions
    )


@router.get("/{schedule_id}", response_model=AnalysisSchedule)
def get_schedule(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific analysis schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    schedule = scheduler_service.get_schedule(current_user.id, schedule_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    return schedule


@router.put("/{schedule_id}", response_model=AnalysisSchedule)
async def update_schedule(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    schedule_in: AnalysisScheduleUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update an analysis schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    schedule = await scheduler_service.update_schedule(current_user.id, schedule_id, schedule_in)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    return schedule


@router.delete("/{schedule_id}")
def delete_schedule(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete an analysis schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    success = scheduler_service.delete_schedule(current_user.id, schedule_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    return {"message": "Schedule deleted successfully"}


@router.post("/{schedule_id}/enable")
def enable_schedule(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Enable an analysis schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    success = scheduler_service.enable_schedule(current_user.id, schedule_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    return {"message": "Schedule enabled successfully"}


@router.post("/{schedule_id}/disable")
def disable_schedule(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Disable an analysis schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    success = scheduler_service.disable_schedule(current_user.id, schedule_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    return {"message": "Schedule disabled successfully"}


@router.post("/{schedule_id}/execute", response_model=AnalysisScheduleExecution)
async def execute_schedule_now(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    execution_request: ScheduleExecutionRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Execute an analysis schedule immediately.
    """
    scheduler_service = get_analysis_scheduler_service(db)

    # Verify schedule belongs to user
    schedule = scheduler_service.get_schedule(current_user.id, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    try:
        execution = await scheduler_service.execute_schedule(
            schedule_id=schedule_id,
            execution_type=execution_request.execution_type,
            trigger_data=execution_request.trigger_data
        )
        return execution
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to execute schedule: {str(e)}"
        )


@router.get("/{schedule_id}/executions", response_model=list[AnalysisScheduleExecution])
def get_schedule_executions(
    *,
    db: Session = Depends(get_db),
    schedule_id: str,
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, description="Maximum number of executions to return"),
) -> Any:
    """
    Get execution history for a specific schedule.
    """
    scheduler_service = get_analysis_scheduler_service(db)

    # Verify schedule belongs to user
    schedule = scheduler_service.get_schedule(current_user.id, schedule_id)
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )

    executions = scheduler_service.get_executions(
        user_id=current_user.id,
        schedule_id=schedule_id,
        limit=limit
    )

    return executions


@router.get("/executions/all", response_model=list[AnalysisScheduleExecution])
def get_all_executions(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(100, description="Maximum number of executions to return"),
) -> Any:
    """
    Get execution history for all schedules of the current user.
    """
    scheduler_service = get_analysis_scheduler_service(db)
    executions = scheduler_service.get_executions(
        user_id=current_user.id,
        limit=limit
    )

    return executions


# Schedule Templates and Quick Setup
@router.get("/templates/", response_model=list[dict])
def get_schedule_templates() -> Any:
    """
    Get predefined schedule templates for quick setup.
    """
    templates = [
        {
            "id": "daily_morning_insights",
            "name": "Daily Morning Health Insights",
            "description": "Get daily health insights every morning at 8 AM",
            "schedule_type": "recurring",
            "frequency": "daily",
            "time_of_day": "08:00",
            "analysis_types": ["insights"],
            "data_selection_config": {
                "date_range": {"type": "last_n_days", "days": 7},
                "limit": 50
            },
            "parameters": {
                "time_of_day": {
                    "type": "time",
                    "description": "Time to run analysis",
                    "default": "08:00"
                },
                "metric_types": {
                    "type": "array",
                    "description": "Health metrics to include",
                    "default": [],
                    "options": ["blood_sugar", "blood_pressure", "weight", "heart_rate", "exercise", "sleep"]
                },
                "lookback_days": {
                    "type": "number",
                    "description": "Days of data to analyze",
                    "default": 7,
                    "min": 1,
                    "max": 90
                },
                "provider_preference": {
                    "type": "select",
                    "description": "AI provider to use for analysis",
                    "default": "auto",
                    "options": ["auto", "openai", "anthropic", "google", "custom"]
                }
            }
        },
        {
            "id": "weekly_health_summary",
            "name": "Weekly Health Summary",
            "description": "Comprehensive weekly health analysis every Sunday evening",
            "schedule_type": "recurring",
            "frequency": "weekly",
            "days_of_week": ["sunday"],
            "time_of_day": "18:00",
            "analysis_types": ["insights", "trends", "recommendations"],
            "data_selection_config": {
                "date_range": {"type": "last_n_days", "days": 14},
                "limit": 100
            },
            "parameters": {
                "day_of_week": {
                    "type": "select",
                    "description": "Day of week to run analysis",
                    "default": "sunday",
                    "options": ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
                },
                "time_of_day": {
                    "type": "time",
                    "description": "Time to run analysis",
                    "default": "18:00"
                },
                "metric_types": {
                    "type": "array",
                    "description": "Health metrics to include",
                    "default": [],
                    "options": ["blood_sugar", "blood_pressure", "weight", "heart_rate", "exercise", "sleep"]
                },
                "analysis_scope": {
                    "type": "select",
                    "description": "Scope of analysis",
                    "default": "comprehensive",
                    "options": ["basic", "standard", "comprehensive"]
                },
                "provider_preference": {
                    "type": "select",
                    "description": "AI provider to use for analysis",
                    "default": "auto",
                    "options": ["auto", "openai", "anthropic", "google", "custom"]
                }
            }
        },
        {
            "id": "blood_pressure_monitoring",
            "name": "Blood Pressure Monitoring",
            "description": "Daily blood pressure trend analysis",
            "schedule_type": "recurring",
            "frequency": "daily",
            "time_of_day": "20:00",
            "analysis_types": ["trends", "anomalies"],
            "data_selection_config": {
                "metric_types": ["blood_pressure"],
                "date_range": {"type": "last_n_days", "days": 30},
                "limit": 50
            },
            "parameters": {
                "frequency": {
                    "type": "select",
                    "description": "How often to run analysis",
                    "default": "daily",
                    "options": ["daily", "weekly", "monthly"]
                },
                "time_of_day": {
                    "type": "time",
                    "description": "Time to run analysis",
                    "default": "20:00"
                },
                "metric_types": {
                    "type": "array",
                    "description": "Health metrics to monitor",
                    "default": ["blood_pressure"],
                    "options": ["blood_sugar", "blood_pressure", "weight", "heart_rate", "exercise", "sleep"]
                },
                "monitoring_period": {
                    "type": "number",
                    "description": "Days of historical data to analyze",
                    "default": 30,
                    "min": 7,
                    "max": 90
                },
                "provider_preference": {
                    "type": "select",
                    "description": "AI provider to use for analysis",
                    "default": "auto",
                    "options": ["auto", "openai", "anthropic", "google", "custom"]
                }
            }
        },
        {
            "id": "monthly_comprehensive",
            "name": "Monthly Comprehensive Review",
            "description": "Complete monthly health analysis and recommendations",
            "schedule_type": "recurring",
            "frequency": "monthly",
            "day_of_month": 1,
            "time_of_day": "09:00",
            "analysis_types": ["trends", "insights", "recommendations", "anomalies"],
            "data_selection_config": {
                "date_range": {"type": "last_n_days", "days": 60},
                "limit": 200
            },
            "parameters": {
                "day_of_month": {
                    "type": "number",
                    "description": "Day of month to run analysis",
                    "default": 1,
                    "min": 1,
                    "max": 28
                },
                "time_of_day": {
                    "type": "time",
                    "description": "Time to run analysis",
                    "default": "09:00"
                },
                "metric_types": {
                    "type": "array",
                    "description": "Health metrics to include",
                    "default": [],
                    "options": ["blood_sugar", "blood_pressure", "weight", "heart_rate", "exercise", "sleep"]
                },
                "analysis_period": {
                    "type": "number",
                    "description": "Days of data to analyze",
                    "default": 60,
                    "min": 30,
                    "max": 365
                },
                "detail_level": {
                    "type": "select",
                    "description": "Analysis detail level",
                    "default": "comprehensive",
                    "options": ["overview", "detailed", "comprehensive", "deep_dive"]
                },
                "provider_preference": {
                    "type": "select",
                    "description": "AI provider to use for analysis",
                    "default": "auto",
                    "options": ["auto", "openai", "anthropic", "google", "custom"]
                }
            }
        },
        {
            "id": "weekly_blood_sugar_review",
            "name": "Weekly Blood Sugar Review",
            "description": "Weekly blood sugar analysis every Sunday morning",
            "schedule_type": "recurring",
            "frequency": "weekly",
            "days_of_week": ["sunday"],
            "time_of_day": "09:00",
            "analysis_types": ["trends", "anomalies", "insights"],
            "data_selection_config": {
                "metric_types": ["blood_sugar"],
                "date_range": {"type": "last_n_days", "days": 14},
                "limit": 50
            },
            "parameters": {
                "metric_types": {
                    "type": "array",
                    "description": "Health metrics to analyze",
                    "default": ["blood_sugar"],
                    "options": ["blood_sugar", "blood_pressure", "weight", "heart_rate", "exercise", "sleep"]
                },
                "frequency": {
                    "type": "select",
                    "description": "How often to run analysis",
                    "default": "weekly",
                    "options": ["daily", "weekly", "monthly"]
                },
                "analysis_depth": {
                    "type": "select", 
                    "description": "Analysis detail level",
                    "default": "standard",
                    "options": ["basic", "standard", "comprehensive"]
                },
                "provider_preference": {
                    "type": "select",
                    "description": "AI provider to use for analysis",
                    "default": "auto",
                    "options": ["auto", "openai", "anthropic", "google", "custom"]
                }
            }
        },
        {
            "id": "high_frequency_blood_sugar",
            "name": "High-Frequency Blood Sugar Monitoring",
            "description": "Analyze blood sugar after every 20 new readings for intensive monitoring",
            "schedule_type": "data_threshold",
            "data_threshold_count": 20,
            "data_threshold_metric": "blood_sugar",
            "analysis_types": ["trends", "anomalies"],
            "data_selection_config": {
                "metric_types": ["blood_sugar"],
                "date_range": {"type": "last_n_days", "days": 7},
                "limit": 40
            },
            "parameters": {
                "data_threshold_count": {
                    "type": "number",
                    "description": "Number of new readings to trigger analysis",
                    "default": 20,
                    "min": 5,
                    "max": 100
                },
                "metric_type": {
                    "type": "select",
                    "description": "Metric to monitor",
                    "default": "blood_sugar",
                    "options": ["blood_sugar", "blood_pressure", "weight", "heart_rate"]
                },
                "sensitivity": {
                    "type": "select",
                    "description": "Analysis sensitivity",
                    "default": "normal",
                    "options": ["low", "normal", "high"]
                },
                "provider_preference": {
                    "type": "select",
                    "description": "AI provider to use for analysis",
                    "default": "auto",
                    "options": ["auto", "openai", "anthropic", "google", "custom"]
                }
            }
        }
    ]

    return templates


@router.post("/templates/{template_id}", response_model=AnalysisSchedule)
async def create_from_template(
    *,
    db: Session = Depends(get_db),
    template_id: str,
    current_user: User = Depends(get_current_active_user),
    customizations: dict | None = None,
) -> Any:
    """
    Create a schedule from a predefined template.
    """
    # Get templates
    templates = get_schedule_templates()
    template = next((t for t in templates if t["id"] == template_id), None)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Apply customizations if provided
    if customizations:
        template.update(customizations)

    # Convert template to schedule create data
    schedule_data = AnalysisScheduleCreate(**{
        k: v for k, v in template.items()
        if k not in ["id"]  # Remove template-specific fields
    })

    scheduler_service = get_analysis_scheduler_service(db)
    try:
        schedule = await scheduler_service.create_schedule(current_user.id, schedule_data)
        return schedule
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create schedule from template: {str(e)}"
        )


# Analysis History Endpoints
@router.get("/history/user", response_model=list[AnalysisHistory])
def get_user_analysis_history(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(100, description="Maximum number of history entries to return"),
    action_filter: str | None = Query(None, description="Filter by action type (created, viewed, shared, deleted)")
) -> Any:
    """
    Get analysis history for the current user.
    """
    history_service = get_analysis_history_service(db)
    history = history_service.get_user_history(
        user_id=current_user.id,
        limit=limit,
        action_filter=action_filter
    )
    return history


@router.get("/history/analysis/{analysis_id}", response_model=list[AnalysisHistory])
def get_analysis_history(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """
    Get history for a specific analysis.
    """
    # Verify the analysis belongs to the user by checking if they can access it
    from app.services.ai_analysis_service import AIAnalysisService
    ai_service = AIAnalysisService(db)
    analysis = ai_service.get_analysis(current_user.id, analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    history_service = get_analysis_history_service(db)
    history = history_service.get_analysis_history(
        analysis_id=analysis_id,
        user_id=current_user.id
    )
    return history


@router.get("/history/recent", response_model=list[AnalysisHistory])
def get_recent_analysis_activity(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    days: int = Query(7, description="Number of days to look back for recent activity")
) -> Any:
    """
    Get recent analysis activity for the current user.
    """
    history_service = get_analysis_history_service(db)
    history = history_service.get_recent_activity(
        user_id=current_user.id,
        days=days
    )
    return history


@router.get("/history/stats", response_model=Dict[str, Any])
def get_user_activity_stats(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    days: int = Query(30, description="Number of days to calculate stats for")
) -> Any:
    """
    Get activity statistics for the current user.
    """
    history_service = get_analysis_history_service(db)
    stats = history_service.get_activity_stats(
        user_id=current_user.id,
        days=days
    )
    return stats


@router.get("/history/analysis/{analysis_id}/summary", response_model=Dict[str, Any])
def get_analysis_interaction_summary(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """
    Get interaction summary for a specific analysis.
    """
    # Verify the analysis belongs to the user
    from app.services.ai_analysis_service import AIAnalysisService
    ai_service = AIAnalysisService(db)
    analysis = ai_service.get_analysis(current_user.id, analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    history_service = get_analysis_history_service(db)
    summary = history_service.get_analysis_interaction_summary(analysis_id)
    return summary
