"""
Notification Schemas

Pydantic schemas for notification system API requests and responses.
"""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, validator

from app.models.notification import (
    NotificationChannelType,
    NotificationEventType,
    NotificationPriority,
    NotificationStatus,
)


# Base Schemas
class NotificationChannelBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="User-friendly name for the channel")
    channel_type: NotificationChannelType = Field(..., description="Type of notification channel")
    apprise_url: str = Field(..., description="Apprise URL for the notification service")
    is_enabled: bool = Field(True, description="Whether the channel is enabled")

    @validator('apprise_url')
    def validate_apprise_url(cls, v):
        """Basic validation for Apprise URLs"""
        if not v or len(v.strip()) == 0:
            raise ValueError("Apprise URL cannot be empty")

        # Basic format checking - Apprise URLs typically have a protocol prefix
        valid_prefixes = [
            'mailto://', 'mailtos://', 'discord://', 'slack://', 'teams://',
            'telegram://', 'pushover://', 'webhook://', 'webhooks://',
            'sms://', 'email://', 'json://', 'xml://', 'twilio://',
            'smtp://', 'smtps://', 'ses://', 'sendgrid://', 'mailgun://',
            'http://', 'https://',  # Allow generic HTTP URLs for webhooks
            'matrix://', 'rocket://', 'mattermost://', 'ntfy://', 'gotify://',
            'windows://', 'macos://', 'gnome://', 'kde://',  # Desktop notifications
            'msteams://', 'office365://', 'pagerduty://', 'opsgenie://',
            'signal://', 'whatsapp://', 'nexmo://', 'sinch://', 'bulksms://'
        ]

        # Check if it matches any valid prefix or is a valid URL-like pattern
        v_lower = v.lower().strip()
        is_valid = (
            any(v_lower.startswith(prefix) for prefix in valid_prefixes) or
            # Allow basic email format for mailto
            '@' in v and '.' in v.split('@')[-1] or
            # Allow webhook URLs that start with http/https
            (v_lower.startswith(('http://', 'https://')) and '.' in v)
        )

        if not is_valid:
            raise ValueError(f"Invalid Apprise URL format. Must start with one of: {', '.join(sorted(valid_prefixes))} or be a valid email/webhook URL")

        return v


class NotificationChannelCreate(NotificationChannelBase):
    """Schema for creating a new notification channel"""
    pass


class NotificationChannelUpdate(BaseModel):
    """Schema for updating a notification channel"""
    name: str | None = Field(None, min_length=1, max_length=100)
    apprise_url: str | None = None
    is_enabled: bool | None = None

    @validator('apprise_url')
    def validate_apprise_url(cls, v):
        if v is not None:
            return NotificationChannelBase.validate_apprise_url(v)
        return v


class NotificationChannel(BaseModel):
    """Schema for notification channel response - without URL validation"""
    id: str
    user_id: int
    name: str
    channel_type: NotificationChannelType
    apprise_url: str  # No validation on read
    is_enabled: bool
    is_verified: bool
    last_test_at: datetime | None = None
    last_test_success: bool | None = None
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationChannelTest(BaseModel):
    """Schema for channel test response"""
    success: bool
    message: str
    tested_at: str


# Preference Schemas
class NotificationPreferenceBase(BaseModel):
    event_type: NotificationEventType = Field(..., description="Type of event to notify about")
    is_enabled: bool = Field(True, description="Whether notifications are enabled for this event")
    minimum_priority: NotificationPriority = Field(NotificationPriority.NORMAL, description="Minimum priority level to notify")
    quiet_hours_start: str | None = Field(None, description="Start of quiet hours (HH:MM format)")
    quiet_hours_end: str | None = Field(None, description="End of quiet hours (HH:MM format)")
    timezone: str = Field("UTC", description="User's timezone for quiet hours")
    max_per_hour: int | None = Field(None, ge=0, le=100, description="Maximum notifications per hour")
    max_per_day: int | None = Field(None, ge=0, le=1000, description="Maximum notifications per day")
    include_analysis_content: bool = Field(False, description="Include full analysis content in notifications")
    include_summary_stats: bool = Field(True, description="Include summary statistics in notifications")
    include_recommendations: bool = Field(True, description="Include recommendations in notifications")
    filters: dict[str, Any] | None = Field(None, description="Additional filters for notifications")

    @validator('quiet_hours_start', 'quiet_hours_end')
    def validate_time_format(cls, v):
        if v is not None:
            try:
                hour, minute = v.split(':')
                hour_int = int(hour)
                minute_int = int(minute)
                if not (0 <= hour_int <= 23 and 0 <= minute_int <= 59):
                    raise ValueError("Invalid time format")
            except (ValueError, IndexError) as e:
                raise ValueError("Time must be in HH:MM format (24-hour)") from e
        return v


class NotificationPreferenceCreate(NotificationPreferenceBase):
    """Schema for creating a notification preference"""
    channel_id: str = Field(..., description="ID of the notification channel")


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating a notification preference"""
    is_enabled: bool | None = None
    minimum_priority: NotificationPriority | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    timezone: str | None = None
    max_per_hour: int | None = Field(None, ge=0, le=100)
    max_per_day: int | None = Field(None, ge=0, le=1000)
    include_analysis_content: bool | None = None
    include_summary_stats: bool | None = None
    include_recommendations: bool | None = None
    filters: dict[str, Any] | None = None

    @validator('quiet_hours_start', 'quiet_hours_end')
    def validate_time_format(cls, v):
        return NotificationPreferenceBase.validate_time_format(v)


class NotificationPreference(NotificationPreferenceBase):
    """Schema for notification preference response"""
    id: str
    user_id: int
    channel_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Template Schemas
class NotificationTemplateBase(BaseModel):
    event_type: NotificationEventType
    channel_type: NotificationChannelType
    name: str = Field(..., min_length=1, max_length=100)
    subject_template: str | None = Field(None, max_length=200)
    body_template: str = Field(..., min_length=1)
    is_html: bool = Field(False, description="Whether the body template supports HTML")
    available_variables: list[str] | None = Field(None, description="List of available template variables")
    example_data: dict[str, Any] | None = Field(None, description="Example data for template preview")
    is_active: bool = Field(True, description="Whether the template is active")


class NotificationTemplateCreate(NotificationTemplateBase):
    """Schema for creating a notification template"""
    pass


class NotificationTemplateUpdate(BaseModel):
    """Schema for updating a notification template"""
    name: str | None = Field(None, min_length=1, max_length=100)
    subject_template: str | None = Field(None, max_length=200)
    body_template: str | None = Field(None, min_length=1)
    is_html: bool | None = None
    available_variables: list[str] | None = None
    example_data: dict[str, Any] | None = None
    is_active: bool | None = None


class NotificationTemplate(NotificationTemplateBase):
    """Schema for notification template response"""
    id: str
    is_system_template: bool
    created_at: datetime
    updated_at: datetime
    created_by: int | None = None

    class Config:
        from_attributes = True


# History Schemas
class NotificationHistory(BaseModel):
    """Schema for notification history response"""
    id: str
    user_id: int
    channel_id: str | None = None
    event_type: NotificationEventType
    priority: NotificationPriority
    status: NotificationStatus
    subject: str | None = None
    message: str
    sent_at: datetime | None = None
    delivered_at: datetime | None = None
    failed_at: datetime | None = None
    retry_count: int
    error_message: str | None = None
    analysis_id: int | None = None
    schedule_id: str | None = None
    workflow_id: str | None = None
    execution_id: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


# Send Notification Schemas
class SendNotificationRequest(BaseModel):
    """Schema for manually sending a notification"""
    user_id: int
    event_type: NotificationEventType
    data: dict[str, Any]
    priority: NotificationPriority = NotificationPriority.NORMAL
    analysis_id: int | None = None
    schedule_id: str | None = None
    workflow_id: str | None = None
    execution_id: str | None = None


class NotificationResult(BaseModel):
    """Schema for notification send result"""
    channel_id: str
    channel_name: str
    success: bool
    error: str | None = None
    history_id: str
    sent_at: str | None = None


class SendNotificationResponse(BaseModel):
    """Schema for send notification response"""
    results: list[NotificationResult]
    total_sent: int
    total_failed: int
    success_rate: float


# Statistics Schemas
class NotificationStats(BaseModel):
    """Schema for notification statistics"""
    total_sent: int
    total_failed: int
    success_rate: float
    event_stats: dict[str, int]
    active_channels: int


# Bulk Operations
class BulkPreferenceUpdate(BaseModel):
    """Schema for bulk updating preferences"""
    event_types: list[NotificationEventType]
    updates: NotificationPreferenceUpdate


class NotificationPreferenceWithChannel(NotificationPreference):
    """Schema for preference with channel information"""
    channel: NotificationChannel

    class Config:
        from_attributes = True


# Template Preview
class TemplatePreviewRequest(BaseModel):
    """Schema for previewing a notification template"""
    subject_template: str | None = None
    body_template: str
    example_data: dict[str, Any]


class TemplatePreviewResponse(BaseModel):
    """Schema for template preview response"""
    subject: str | None = None
    message: str
    success: bool
    error: str | None = None


# Configuration Schemas
class NotificationConfig(BaseModel):
    """Schema for notification system configuration"""
    available_channel_types: list[str]
    available_event_types: list[str]
    available_priorities: list[str]
    default_templates: dict[str, dict[str, str]]
    rate_limit_defaults: dict[str, int]


# Quick Setup Schemas
class CustomChannelSetup(BaseModel):
    """Schema for custom channel in quick setup"""
    name: str
    channel_type: NotificationChannelType
    apprise_url: str

class QuickSetupRequest(BaseModel):
    """Schema for quick notification setup"""
    email: str | None = None
    discord_webhook: str | None = None
    slack_webhook: str | None = None
    custom_channel: CustomChannelSetup | None = None
    enable_all_events: bool = True
    priority_level: NotificationPriority = NotificationPriority.NORMAL


class QuickSetupResponse(BaseModel):
    """Schema for quick setup response"""
    channels_created: list[str]
    preferences_created: list[str]
    tests_passed: list[str]
    tests_failed: list[str]
    success: bool
    message: str
