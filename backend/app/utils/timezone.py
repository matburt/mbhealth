"""
Timezone utilities for handling datetime conversions between UTC and user timezones.
"""

from datetime import datetime

import pytz

from app.core.config import settings


def get_timezone(timezone_name: str | None = None) -> pytz.BaseTzInfo:
    """
    Get timezone object from timezone name.

    Args:
        timezone_name: Timezone name (e.g., 'America/New_York').
                      If None, uses default from settings.

    Returns:
        pytz timezone object
    """
    if timezone_name is None:
        timezone_name = settings.DEFAULT_TIMEZONE

    try:
        return pytz.timezone(timezone_name)
    except pytz.UnknownTimeZoneError:
        # Fallback to default timezone if invalid timezone provided
        return pytz.timezone(settings.DEFAULT_TIMEZONE)


def utc_to_user_timezone(utc_dt: datetime, user_timezone: str | None = None) -> datetime:
    """
    Convert UTC datetime to user's timezone.

    Args:
        utc_dt: UTC datetime (naive or timezone-aware)
        user_timezone: User's timezone name

    Returns:
        Datetime in user's timezone
    """
    if utc_dt is None:
        return None

    # Ensure datetime is timezone-aware and in UTC
    if utc_dt.tzinfo is None:
        utc_dt = pytz.utc.localize(utc_dt)
    elif utc_dt.tzinfo != pytz.utc:
        utc_dt = utc_dt.astimezone(pytz.utc)

    # Convert to user timezone
    user_tz = get_timezone(user_timezone)
    return utc_dt.astimezone(user_tz)


def user_timezone_to_utc(local_dt: datetime | str, user_timezone: str | None = None) -> datetime:
    """
    Convert user's local datetime to UTC.

    Args:
        local_dt: Local datetime or ISO string in user's timezone
        user_timezone: User's timezone name

    Returns:
        UTC datetime (timezone-naive for database storage)
    """
    if local_dt is None:
        return None

    # Convert string to datetime if needed
    if isinstance(local_dt, str):
        # Handle different datetime string formats
        try:
            # Try ISO format first
            local_dt = datetime.fromisoformat(local_dt.replace('Z', '+00:00'))
        except ValueError:
            try:
                # Try parsing without timezone info
                local_dt = datetime.fromisoformat(local_dt)
            except ValueError as e:
                raise ValueError(f"Unable to parse datetime string: {local_dt}") from e

    user_tz = get_timezone(user_timezone)

    # If datetime is naive, assume it's in user's timezone
    if local_dt.tzinfo is None:
        local_dt = user_tz.localize(local_dt)

    # Convert to UTC and make naive for database storage
    utc_dt = local_dt.astimezone(pytz.utc)
    return utc_dt.replace(tzinfo=None)


def format_datetime_for_user(utc_dt: datetime, user_timezone: str | None = None,
                           format_str: str = "%Y-%m-%d %H:%M:%S") -> str:
    """
    Format UTC datetime for display in user's timezone.

    Args:
        utc_dt: UTC datetime
        user_timezone: User's timezone name
        format_str: Datetime format string

    Returns:
        Formatted datetime string in user's timezone
    """
    if utc_dt is None:
        return ""

    local_dt = utc_to_user_timezone(utc_dt, user_timezone)
    return local_dt.strftime(format_str)


def get_available_timezones() -> list[str]:
    """
    Get list of common timezones for user selection.

    Returns:
        List of timezone names
    """
    # Common US timezones
    common_timezones = [
        "America/New_York",      # Eastern
        "America/Chicago",       # Central
        "America/Denver",        # Mountain
        "America/Los_Angeles",   # Pacific
        "America/Anchorage",     # Alaska
        "Pacific/Honolulu",      # Hawaii
        "UTC",                   # UTC
    ]

    # Add some international timezones
    international_timezones = [
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Asia/Tokyo",
        "Asia/Shanghai",
        "Asia/Kolkata",
        "Australia/Sydney",
        "Australia/Melbourne",
    ]

    return common_timezones + international_timezones


def validate_timezone(timezone_name: str) -> bool:
    """
    Validate if timezone name is valid.

    Args:
        timezone_name: Timezone name to validate

    Returns:
        True if valid, False otherwise
    """
    try:
        pytz.timezone(timezone_name)
        return True
    except pytz.UnknownTimeZoneError:
        return False


def get_current_time_in_timezone(user_timezone: str | None = None) -> datetime:
    """
    Get current time in user's timezone.

    Args:
        user_timezone: User's timezone name

    Returns:
        Current datetime in user's timezone
    """
    user_tz = get_timezone(user_timezone)
    return datetime.now(user_tz)
