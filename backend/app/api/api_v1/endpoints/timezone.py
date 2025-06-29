"""
Timezone API endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.schemas.user import User
from app.api.deps import get_current_user_optional
from app.utils.timezone import get_available_timezones, validate_timezone, get_current_time_in_timezone
from pydantic import BaseModel
from datetime import datetime


router = APIRouter()


class TimezoneInfo(BaseModel):
    """Timezone information response."""
    name: str
    current_time: str
    offset: str


class UserTimezoneResponse(BaseModel):
    """User timezone response."""
    current_timezone: str
    available_timezones: List[str]
    current_time: str


@router.get("/available", response_model=List[str])
def get_available_timezones_endpoint() -> List[str]:
    """
    Get list of available timezones.
    """
    return get_available_timezones()


@router.get("/current", response_model=UserTimezoneResponse)
def get_user_timezone(
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> UserTimezoneResponse:
    """
    Get current user's timezone information.
    If user is not authenticated, returns default timezone.
    """
    # Use user's timezone if authenticated, otherwise use default
    user_timezone = current_user.timezone if current_user else "America/New_York"
    current_time = get_current_time_in_timezone(user_timezone)
    
    return UserTimezoneResponse(
        current_timezone=user_timezone,
        available_timezones=get_available_timezones(),
        current_time=current_time.strftime("%Y-%m-%d %H:%M:%S %Z"),
    )


@router.post("/validate")
def validate_timezone_endpoint(timezone_name: str) -> dict:
    """
    Validate a timezone name.
    """
    is_valid = validate_timezone(timezone_name)
    return {
        "timezone": timezone_name,
        "valid": is_valid,
        "current_time": get_current_time_in_timezone(timezone_name).strftime("%Y-%m-%d %H:%M:%S %Z") if is_valid else None
    }