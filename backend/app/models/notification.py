"""
Notification System Models

Database models for managing user notification preferences, notification history,
and notification templates using Apprise for multi-service delivery.
"""

import enum
import uuid

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class NotificationChannelType(str, enum.Enum):
    """Supported notification channel types via Apprise"""
    EMAIL = "email"
    DISCORD = "discord"
    SLACK = "slack"
    TEAMS = "teams"
    TELEGRAM = "telegram"
    PUSHOVER = "pushover"
    WEBHOOKS = "webhooks"
    SMS = "sms"
    CUSTOM = "custom"


class NotificationEventType(str, enum.Enum):
    """Types of events that can trigger notifications"""
    ANALYSIS_COMPLETED = "analysis_completed"
    ANALYSIS_FAILED = "analysis_failed"
    SCHEDULE_COMPLETED = "schedule_completed"
    SCHEDULE_FAILED = "schedule_failed"
    WORKFLOW_COMPLETED = "workflow_completed"
    WORKFLOW_FAILED = "workflow_failed"
    WORKFLOW_STEP_FAILED = "workflow_step_failed"
    DAILY_SUMMARY = "daily_summary"
    WEEKLY_SUMMARY = "weekly_summary"
    SYSTEM_ALERT = "system_alert"


class NotificationPriority(str, enum.Enum):
    """Notification priority levels"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, enum.Enum):
    """Notification delivery status"""
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    RETRY = "retry"


class NotificationChannel(Base):
    """User's configured notification channels (Apprise URLs)"""
    __tablename__ = "notification_channels"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Channel configuration
    name = Column(String(100), nullable=False)  # User-friendly name
    channel_type = Column(Enum(NotificationChannelType), nullable=False)
    apprise_url = Column(Text, nullable=False)  # Encrypted Apprise URL
    is_enabled = Column(Boolean, default=True, nullable=False)

    # Testing and validation
    is_verified = Column(Boolean, default=False, nullable=False)
    last_test_at = Column(DateTime(timezone=True))
    last_test_success = Column(Boolean)
    last_error = Column(Text)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notification_channels")
    preferences = relationship("NotificationPreference", back_populates="channel", cascade="all, delete-orphan")


class NotificationPreference(Base):
    """User preferences for when and how to receive notifications"""
    __tablename__ = "notification_preferences"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel_id = Column(String, ForeignKey("notification_channels.id"), nullable=False)

    # Event configuration
    event_type = Column(Enum(NotificationEventType), nullable=False)
    is_enabled = Column(Boolean, default=True, nullable=False)
    minimum_priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL, nullable=False)

    # Timing preferences
    quiet_hours_start = Column(String(5))  # HH:MM format, e.g., "22:00"
    quiet_hours_end = Column(String(5))    # HH:MM format, e.g., "08:00"
    timezone = Column(String(50), default="UTC")

    # Frequency limits
    max_per_hour = Column(Integer)  # Rate limiting
    max_per_day = Column(Integer)

    # Content preferences
    include_analysis_content = Column(Boolean, default=False)  # Include full analysis in notification
    include_summary_stats = Column(Boolean, default=True)
    include_recommendations = Column(Boolean, default=True)

    # Filter conditions (JSON for flexibility)
    filters = Column(JSON)  # e.g., {"analysis_types": ["symptom"], "providers": ["openai"]}

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notification_preferences")
    channel = relationship("NotificationChannel", back_populates="preferences")


class NotificationTemplate(Base):
    """Templates for notification content"""
    __tablename__ = "notification_templates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))

    # Template identification
    event_type = Column(Enum(NotificationEventType), nullable=False)
    channel_type = Column(Enum(NotificationChannelType), nullable=False)
    name = Column(String(100), nullable=False)

    # Template content
    subject_template = Column(String(200))  # For email, push notifications
    body_template = Column(Text, nullable=False)
    is_html = Column(Boolean, default=False)  # Whether body supports HTML

    # Template variables documentation
    available_variables = Column(JSON)  # List of available template variables
    example_data = Column(JSON)  # Example data for preview

    # Configuration
    is_system_template = Column(Boolean, default=True)  # System vs user-created
    is_active = Column(Boolean, default=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"))

    # Relationships
    creator = relationship("User", foreign_keys=[created_by])


class NotificationHistory(Base):
    """History of sent notifications"""
    __tablename__ = "notification_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel_id = Column(String, ForeignKey("notification_channels.id"))

    # Notification details
    event_type = Column(Enum(NotificationEventType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)
    status = Column(Enum(NotificationStatus), default=NotificationStatus.PENDING, nullable=False)

    # Content
    subject = Column(String(200))
    message = Column(Text, nullable=False)

    # Delivery tracking
    sent_at = Column(DateTime(timezone=True))
    delivered_at = Column(DateTime(timezone=True))
    failed_at = Column(DateTime(timezone=True))
    retry_count = Column(Integer, default=0)
    error_message = Column(Text)

    # Related entities
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"))
    schedule_id = Column(String, ForeignKey("analysis_schedules.id"))
    workflow_id = Column(String, ForeignKey("analysis_workflows.id"))
    execution_id = Column(String)  # Generic execution ID

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="notification_history")
    channel = relationship("NotificationChannel")
    analysis = relationship("AIAnalysis")
    schedule = relationship("AnalysisSchedule")
    workflow = relationship("AnalysisWorkflow")


class NotificationQueue(Base):
    """Queue for pending notifications"""
    __tablename__ = "notification_queue"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel_id = Column(String, ForeignKey("notification_channels.id"), nullable=False)

    # Notification details
    event_type = Column(Enum(NotificationEventType), nullable=False)
    priority = Column(Enum(NotificationPriority), default=NotificationPriority.NORMAL)

    # Content
    subject = Column(String(200))
    message = Column(Text, nullable=False)
    template_data = Column(JSON)  # Data used to generate the message

    # Scheduling
    scheduled_for = Column(DateTime(timezone=True), default=func.now())
    max_retry_count = Column(Integer, default=3)
    current_retry_count = Column(Integer, default=0)

    # Related entities
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"))
    schedule_id = Column(String, ForeignKey("analysis_schedules.id"))
    workflow_id = Column(String, ForeignKey("analysis_workflows.id"))
    execution_id = Column(String)

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User")
    channel = relationship("NotificationChannel")
    analysis = relationship("AIAnalysis")
    schedule = relationship("AnalysisSchedule")
    workflow = relationship("AnalysisWorkflow")


class NotificationRateLimit(Base):
    """Rate limiting tracking for notifications"""
    __tablename__ = "notification_rate_limits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    channel_id = Column(String, ForeignKey("notification_channels.id"), nullable=False)
    event_type = Column(Enum(NotificationEventType), nullable=False)

    # Rate limiting counters
    hour_window = Column(DateTime(timezone=True), nullable=False)  # Start of current hour
    day_window = Column(DateTime(timezone=True), nullable=False)   # Start of current day
    hour_count = Column(Integer, default=0)
    day_count = Column(Integer, default=0)

    # Last reset times
    last_hour_reset = Column(DateTime(timezone=True), default=func.now())
    last_day_reset = Column(DateTime(timezone=True), default=func.now())

    # Metadata
    created_at = Column(DateTime(timezone=True), default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User")
    channel = relationship("NotificationChannel")
