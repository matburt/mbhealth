"""
Health data response schemas with timezone-aware datetime fields.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthDataResponse(BaseModel):
    """Health data response with timezone-converted datetime fields."""
    id: int
    user_id: int
    metric_type: str
    value: float
    unit: str
    systolic: float | None = None
    diastolic: float | None = None
    additional_data: dict[str, Any] | None = None
    notes: str | None = None
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime

    # Display fields with timezone conversion
    recorded_at_local: str = Field(..., description="Recorded time in user's timezone")
    created_at_local: str = Field(..., description="Created time in user's timezone")
    updated_at_local: str = Field(..., description="Updated time in user's timezone")

    class Config:
        from_attributes = True


def convert_health_data_to_response(health_data, user_timezone: str | None = None) -> HealthDataResponse:
    """
    Convert HealthData model to HealthDataResponse with timezone conversion.
    
    Args:
        health_data: HealthData model instance
        user_timezone: User's timezone for conversion
        
    Returns:
        HealthDataResponse with timezone-converted fields
    """
    from app.utils.timezone import format_datetime_for_user

    return HealthDataResponse(
        id=health_data.id,
        user_id=health_data.user_id,
        metric_type=health_data.metric_type,
        value=health_data.value,
        unit=health_data.unit,
        systolic=health_data.systolic,
        diastolic=health_data.diastolic,
        additional_data=health_data.additional_data,
        notes=health_data.notes,
        recorded_at=health_data.recorded_at,
        created_at=health_data.created_at,
        updated_at=health_data.updated_at,
        recorded_at_local=format_datetime_for_user(health_data.recorded_at, user_timezone),
        created_at_local=format_datetime_for_user(health_data.created_at, user_timezone),
        updated_at_local=format_datetime_for_user(health_data.updated_at, user_timezone),
    )
