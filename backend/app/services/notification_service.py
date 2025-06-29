"""
Notification Service

Comprehensive notification service using Apprise for multi-platform notifications.
Handles notification delivery, templating, rate limiting, and queuing.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any

import apprise
from jinja2 import BaseLoader, Environment, Template
from sqlalchemy import and_, desc, func
from sqlalchemy.orm import Session

from app.core.security import decrypt_data, encrypt_data
from app.models.ai_analysis import AIAnalysis, AnalysisSchedule
from app.models.analysis_workflow import AnalysisWorkflow
from app.models.notification import (
    NotificationChannel,
    NotificationChannelType,
    NotificationEventType,
    NotificationHistory,
    NotificationPreference,
    NotificationPriority,
    NotificationRateLimit,
    NotificationStatus,
    NotificationTemplate,
)

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing notifications using Apprise"""

    def __init__(self, db: Session):
        self.db = db
        self.jinja_env = Environment(loader=BaseLoader())

    # Channel Management
    def create_channel(
        self,
        user_id: int,
        name: str,
        channel_type: NotificationChannelType,
        apprise_url: str
    ) -> NotificationChannel:
        """Create a new notification channel for a user"""

        # Encrypt the Apprise URL for security
        encrypted_url = encrypt_data(apprise_url)

        channel = NotificationChannel(
            user_id=user_id,
            name=name,
            channel_type=channel_type,
            apprise_url=encrypted_url,
            is_enabled=True,
            is_verified=False
        )

        self.db.add(channel)
        self.db.commit()
        self.db.refresh(channel)

        # Test the channel immediately
        asyncio.create_task(self._test_channel(channel))

        return channel

    def test_channel(self, channel_id: str, user_id: int) -> dict[str, Any]:
        """Test a notification channel"""
        channel = self.db.query(NotificationChannel).filter(
            and_(
                NotificationChannel.id == channel_id,
                NotificationChannel.user_id == user_id
            )
        ).first()

        if not channel:
            raise ValueError("Channel not found")

        return asyncio.run(self._test_channel(channel))

    async def _test_channel(self, channel: NotificationChannel) -> dict[str, Any]:
        """Internal method to test a notification channel"""
        try:
            # Decrypt the Apprise URL
            decrypted_url = decrypt_data(channel.apprise_url)

            # Create Apprise instance
            apobj = apprise.Apprise()
            apobj.add(decrypted_url)

            # Send test notification
            title = f"🔔 Test Notification - {channel.name}"
            body = f"This is a test notification from MB Health to verify your {channel.channel_type} channel is working correctly."

            success = await asyncio.to_thread(
                apobj.notify,
                body=body,
                title=title
            )

            # Update channel status
            channel.last_test_at = datetime.utcnow()
            channel.last_test_success = success
            if success:
                channel.is_verified = True
                channel.last_error = None
            else:
                channel.last_error = "Test notification failed to send"

            self.db.commit()

            return {
                "success": success,
                "message": "Test notification sent successfully" if success else "Test notification failed",
                "tested_at": channel.last_test_at.isoformat()
            }

        except Exception as e:
            logger.error(f"Channel test failed for {channel.id}: {str(e)}")

            channel.last_test_at = datetime.utcnow()
            channel.last_test_success = False
            channel.last_error = str(e)
            self.db.commit()

            return {
                "success": False,
                "message": f"Test failed: {str(e)}",
                "tested_at": channel.last_test_at.isoformat()
            }

    def get_user_channels(self, user_id: int) -> list[NotificationChannel]:
        """Get all notification channels for a user"""
        return self.db.query(NotificationChannel).filter(
            NotificationChannel.user_id == user_id
        ).order_by(NotificationChannel.created_at.desc()).all()

    def update_channel(
        self,
        channel_id: str,
        user_id: int,
        **updates
    ) -> NotificationChannel:
        """Update a notification channel"""
        channel = self.db.query(NotificationChannel).filter(
            and_(
                NotificationChannel.id == channel_id,
                NotificationChannel.user_id == user_id
            )
        ).first()

        if not channel:
            raise ValueError("Channel not found")

        # Handle URL encryption if updating apprise_url
        if 'apprise_url' in updates:
            updates['apprise_url'] = encrypt_data(updates['apprise_url'])
            updates['is_verified'] = False  # Re-verification needed

        for key, value in updates.items():
            if hasattr(channel, key):
                setattr(channel, key, value)

        self.db.commit()
        self.db.refresh(channel)

        return channel

    def delete_channel(self, channel_id: str, user_id: int) -> bool:
        """Delete a notification channel"""
        channel = self.db.query(NotificationChannel).filter(
            and_(
                NotificationChannel.id == channel_id,
                NotificationChannel.user_id == user_id
            )
        ).first()

        if not channel:
            return False

        self.db.delete(channel)
        self.db.commit()
        return True

    # Preference Management
    def create_or_update_preference(
        self,
        user_id: int,
        channel_id: str,
        event_type: NotificationEventType,
        **preferences
    ) -> NotificationPreference:
        """Create or update notification preference"""

        # Check if preference already exists
        existing = self.db.query(NotificationPreference).filter(
            and_(
                NotificationPreference.user_id == user_id,
                NotificationPreference.channel_id == channel_id,
                NotificationPreference.event_type == event_type
            )
        ).first()

        if existing:
            # Update existing preference
            for key, value in preferences.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        else:
            # Create new preference
            preference = NotificationPreference(
                user_id=user_id,
                channel_id=channel_id,
                event_type=event_type,
                **preferences
            )
            self.db.add(preference)
            self.db.commit()
            self.db.refresh(preference)
            return preference

    def get_user_preferences(self, user_id: int) -> list[NotificationPreference]:
        """Get all notification preferences for a user"""
        return self.db.query(NotificationPreference).filter(
            NotificationPreference.user_id == user_id
        ).order_by(
            NotificationPreference.event_type,
            NotificationPreference.channel_id
        ).all()

    # Notification Sending
    async def send_notification(
        self,
        user_id: int,
        event_type: NotificationEventType,
        data: dict[str, Any],
        priority: NotificationPriority = NotificationPriority.NORMAL,
        analysis_id: int | None = None,
        schedule_id: str | None = None,
        workflow_id: str | None = None,
        execution_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Send notification for an event to all applicable channels"""

        results = []

        # Get user's notification preferences for this event type
        preferences = self.db.query(NotificationPreference).filter(
            and_(
                NotificationPreference.user_id == user_id,
                NotificationPreference.event_type == event_type,
                NotificationPreference.is_enabled == True
            )
        ).all()

        if not preferences:
            logger.info(f"No notification preferences found for user {user_id} and event {event_type}")
            return results

        for preference in preferences:
            try:
                # Check if we should send this notification
                if not self._should_send_notification(preference, priority, data):
                    continue

                # Check rate limits
                if not self._check_rate_limits(preference):
                    logger.warning(f"Rate limit exceeded for user {user_id}, channel {preference.channel_id}")
                    continue

                # Generate notification content
                subject, message = self._generate_notification_content(
                    preference, event_type, data
                )

                # Send the notification
                result = await self._send_to_channel(
                    preference.channel,
                    subject,
                    message,
                    priority,
                    analysis_id,
                    schedule_id,
                    workflow_id,
                    execution_id
                )

                results.append(result)

                # Update rate limits
                self._update_rate_limits(preference)

            except Exception as e:
                logger.error(f"Failed to send notification to channel {preference.channel_id}: {str(e)}")
                results.append({
                    "channel_id": preference.channel_id,
                    "success": False,
                    "error": str(e)
                })

        return results

    def _should_send_notification(
        self,
        preference: NotificationPreference,
        priority: NotificationPriority,
        data: dict[str, Any]
    ) -> bool:
        """Check if notification should be sent based on preferences"""

        # Check priority level
        priority_levels = {
            NotificationPriority.LOW: 0,
            NotificationPriority.NORMAL: 1,
            NotificationPriority.HIGH: 2,
            NotificationPriority.URGENT: 3
        }

        if priority_levels.get(priority, 1) < priority_levels.get(preference.minimum_priority, 1):
            return False

        # Check quiet hours
        if preference.quiet_hours_start and preference.quiet_hours_end:
            current_time = datetime.now().strftime("%H:%M")
            if preference.quiet_hours_start <= current_time <= preference.quiet_hours_end:
                # Only allow urgent notifications during quiet hours
                if priority != NotificationPriority.URGENT:
                    return False

        # Check filters
        if preference.filters:
            filters = preference.filters

            # Filter by analysis type
            if 'analysis_types' in filters and 'analysis_type' in data:
                if data['analysis_type'] not in filters['analysis_types']:
                    return False

            # Filter by provider
            if 'providers' in filters and 'provider' in data:
                if data['provider'] not in filters['providers']:
                    return False

        return True

    def _check_rate_limits(self, preference: NotificationPreference) -> bool:
        """Check if rate limits allow sending this notification"""
        if not preference.max_per_hour and not preference.max_per_day:
            return True

        now = datetime.utcnow()
        hour_start = now.replace(minute=0, second=0, microsecond=0)
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Get or create rate limit record
        rate_limit = self.db.query(NotificationRateLimit).filter(
            and_(
                NotificationRateLimit.user_id == preference.user_id,
                NotificationRateLimit.channel_id == preference.channel_id,
                NotificationRateLimit.event_type == preference.event_type
            )
        ).first()

        if not rate_limit:
            rate_limit = NotificationRateLimit(
                user_id=preference.user_id,
                channel_id=preference.channel_id,
                event_type=preference.event_type,
                hour_window=hour_start,
                day_window=day_start,
                hour_count=0,
                day_count=0
            )
            self.db.add(rate_limit)

        # Reset counters if needed
        if rate_limit.hour_window < hour_start:
            rate_limit.hour_count = 0
            rate_limit.hour_window = hour_start
            rate_limit.last_hour_reset = now

        if rate_limit.day_window < day_start:
            rate_limit.day_count = 0
            rate_limit.day_window = day_start
            rate_limit.last_day_reset = now

        # Check limits
        if preference.max_per_hour and rate_limit.hour_count >= preference.max_per_hour:
            return False

        if preference.max_per_day and rate_limit.day_count >= preference.max_per_day:
            return False

        return True

    def _update_rate_limits(self, preference: NotificationPreference):
        """Update rate limit counters after sending notification"""
        now = datetime.utcnow()

        rate_limit = self.db.query(NotificationRateLimit).filter(
            and_(
                NotificationRateLimit.user_id == preference.user_id,
                NotificationRateLimit.channel_id == preference.channel_id,
                NotificationRateLimit.event_type == preference.event_type
            )
        ).first()

        if rate_limit:
            rate_limit.hour_count += 1
            rate_limit.day_count += 1
            self.db.commit()

    def _generate_notification_content(
        self,
        preference: NotificationPreference,
        event_type: NotificationEventType,
        data: dict[str, Any]
    ) -> tuple[str, str]:
        """Generate notification subject and message content"""

        # Get template for this event type and channel type
        template = self.db.query(NotificationTemplate).filter(
            and_(
                NotificationTemplate.event_type == event_type,
                NotificationTemplate.channel_type == preference.channel.channel_type,
                NotificationTemplate.is_active == True
            )
        ).first()

        if not template:
            # Use default template
            return self._generate_default_content(event_type, data)

        # Render template with data
        try:
            subject_template = Template(template.subject_template) if template.subject_template else None
            body_template = Template(template.body_template)

            template_data = {
                **data,
                'user_preferences': {
                    'include_analysis_content': preference.include_analysis_content,
                    'include_summary_stats': preference.include_summary_stats,
                    'include_recommendations': preference.include_recommendations
                }
            }

            subject = subject_template.render(**template_data) if subject_template else self._get_default_subject(event_type, data)
            message = body_template.render(**template_data)

            return subject, message

        except Exception as e:
            logger.error(f"Template rendering failed: {str(e)}")
            return self._generate_default_content(event_type, data)

    def _generate_default_content(self, event_type: NotificationEventType, data: dict[str, Any]) -> tuple[str, str]:
        """Generate default notification content"""

        subjects = {
            NotificationEventType.ANALYSIS_COMPLETED: "✅ Analysis Complete",
            NotificationEventType.ANALYSIS_FAILED: "❌ Analysis Failed",
            NotificationEventType.SCHEDULE_COMPLETED: "📅 Schedule Complete",
            NotificationEventType.SCHEDULE_FAILED: "📅 Schedule Failed",
            NotificationEventType.WORKFLOW_COMPLETED: "🔄 Workflow Complete",
            NotificationEventType.WORKFLOW_FAILED: "🔄 Workflow Failed",
            NotificationEventType.WORKFLOW_STEP_FAILED: "⚠️ Workflow Step Failed",
            NotificationEventType.DAILY_SUMMARY: "📊 Daily Summary",
            NotificationEventType.WEEKLY_SUMMARY: "📊 Weekly Summary"
        }

        subject = subjects.get(event_type, "📋 MB Health Notification")

        if event_type == NotificationEventType.ANALYSIS_COMPLETED:
            message = f"Your {data.get('analysis_type', 'analysis')} analysis has completed successfully."
            if data.get('provider'):
                message += f" Provider: {data['provider']}"

        elif event_type == NotificationEventType.ANALYSIS_FAILED:
            message = f"Your {data.get('analysis_type', 'analysis')} analysis failed to complete."
            if data.get('error'):
                message += f" Error: {data['error']}"

        elif event_type == NotificationEventType.SCHEDULE_COMPLETED:
            message = f"Schedule '{data.get('schedule_name', 'Unnamed')}' completed successfully."
            if data.get('analyses_created'):
                message += f" Created {len(data['analyses_created'])} analyses."

        elif event_type == NotificationEventType.WORKFLOW_COMPLETED:
            message = f"Workflow '{data.get('workflow_name', 'Unnamed')}' completed successfully."
            if data.get('total_steps'):
                message += f" Executed {data['total_steps']} steps."

        else:
            message = f"Event: {event_type.value}\nData: {json.dumps(data, indent=2)}"

        return subject, message

    def _get_default_subject(self, event_type: NotificationEventType, data: dict[str, Any]) -> str:
        """Get default subject line"""
        subjects = {
            NotificationEventType.ANALYSIS_COMPLETED: "✅ Analysis Complete",
            NotificationEventType.ANALYSIS_FAILED: "❌ Analysis Failed",
            NotificationEventType.SCHEDULE_COMPLETED: "📅 Schedule Complete",
            NotificationEventType.SCHEDULE_FAILED: "📅 Schedule Failed",
            NotificationEventType.WORKFLOW_COMPLETED: "🔄 Workflow Complete",
            NotificationEventType.WORKFLOW_FAILED: "🔄 Workflow Failed"
        }
        return subjects.get(event_type, "📋 MB Health Notification")

    async def _send_to_channel(
        self,
        channel: NotificationChannel,
        subject: str,
        message: str,
        priority: NotificationPriority,
        analysis_id: int | None = None,
        schedule_id: str | None = None,
        workflow_id: str | None = None,
        execution_id: str | None = None
    ) -> dict[str, Any]:
        """Send notification to a specific channel"""

        # Create history record
        history = NotificationHistory(
            user_id=channel.user_id,
            channel_id=channel.id,
            event_type=NotificationEventType.ANALYSIS_COMPLETED,  # Will be set properly by caller
            priority=priority,
            subject=subject,
            message=message,
            analysis_id=analysis_id,
            schedule_id=schedule_id,
            workflow_id=workflow_id,
            execution_id=execution_id,
            status=NotificationStatus.PENDING
        )

        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)

        try:
            # Decrypt Apprise URL
            decrypted_url = decrypt_data(channel.apprise_url)

            # Create Apprise instance
            apobj = apprise.Apprise()
            apobj.add(decrypted_url)

            # Send notification
            success = await asyncio.to_thread(
                apobj.notify,
                body=message,
                title=subject
            )

            # Update history
            if success:
                history.status = NotificationStatus.SENT
                history.sent_at = datetime.utcnow()
                history.delivered_at = datetime.utcnow()
            else:
                history.status = NotificationStatus.FAILED
                history.failed_at = datetime.utcnow()
                history.error_message = "Apprise notify returned False"

            self.db.commit()

            return {
                "channel_id": channel.id,
                "channel_name": channel.name,
                "success": success,
                "history_id": history.id,
                "sent_at": history.sent_at.isoformat() if history.sent_at else None
            }

        except Exception as e:
            logger.error(f"Failed to send notification via channel {channel.id}: {str(e)}")

            history.status = NotificationStatus.FAILED
            history.failed_at = datetime.utcnow()
            history.error_message = str(e)
            self.db.commit()

            return {
                "channel_id": channel.id,
                "channel_name": channel.name,
                "success": False,
                "error": str(e),
                "history_id": history.id
            }

    # Convenience methods for common notifications
    async def notify_analysis_completed(
        self,
        user_id: int,
        analysis: AIAnalysis
    ) -> list[dict[str, Any]]:
        """Send notification when analysis completes"""
        data = {
            "analysis_id": analysis.id,
            "analysis_type": analysis.analysis_type,
            "provider": analysis.provider_name,
            "created_at": analysis.created_at.isoformat(),
            "processing_time": analysis.processing_time,
            "cost": analysis.cost,
            "response_length": len(analysis.response_content or "")
        }

        return await self.send_notification(
            user_id=user_id,
            event_type=NotificationEventType.ANALYSIS_COMPLETED,
            data=data,
            priority=NotificationPriority.NORMAL,
            analysis_id=analysis.id
        )

    async def notify_analysis_failed(
        self,
        user_id: int,
        analysis_id: int,
        error: str
    ) -> list[dict[str, Any]]:
        """Send notification when analysis fails"""
        data = {
            "analysis_id": analysis_id,
            "error": error,
            "failed_at": datetime.utcnow().isoformat()
        }

        return await self.send_notification(
            user_id=user_id,
            event_type=NotificationEventType.ANALYSIS_FAILED,
            data=data,
            priority=NotificationPriority.HIGH,
            analysis_id=analysis_id
        )

    async def notify_schedule_completed(
        self,
        user_id: int,
        schedule: AnalysisSchedule,
        analyses_created: list[int]
    ) -> list[dict[str, Any]]:
        """Send notification when schedule completes"""
        data = {
            "schedule_id": schedule.id,
            "schedule_name": schedule.name,
            "analyses_created": analyses_created,
            "completed_at": datetime.utcnow().isoformat()
        }

        return await self.send_notification(
            user_id=user_id,
            event_type=NotificationEventType.SCHEDULE_COMPLETED,
            data=data,
            priority=NotificationPriority.NORMAL,
            schedule_id=schedule.id
        )

    async def notify_workflow_completed(
        self,
        user_id: int,
        workflow: AnalysisWorkflow,
        execution_id: str,
        total_steps: int
    ) -> list[dict[str, Any]]:
        """Send notification when workflow completes"""
        data = {
            "workflow_id": workflow.id,
            "workflow_name": workflow.name,
            "execution_id": execution_id,
            "total_steps": total_steps,
            "completed_at": datetime.utcnow().isoformat()
        }

        return await self.send_notification(
            user_id=user_id,
            event_type=NotificationEventType.WORKFLOW_COMPLETED,
            data=data,
            priority=NotificationPriority.NORMAL,
            workflow_id=workflow.id,
            execution_id=execution_id
        )

    # History and Management
    def get_notification_history(
        self,
        user_id: int,
        limit: int = 50,
        event_type: NotificationEventType | None = None,
        status: NotificationStatus | None = None
    ) -> list[NotificationHistory]:
        """Get notification history for a user"""
        query = self.db.query(NotificationHistory).filter(
            NotificationHistory.user_id == user_id
        )

        if event_type:
            query = query.filter(NotificationHistory.event_type == event_type)

        if status:
            query = query.filter(NotificationHistory.status == status)

        return query.order_by(desc(NotificationHistory.created_at)).limit(limit).all()

    def get_notification_stats(self, user_id: int) -> dict[str, Any]:
        """Get notification statistics for a user"""

        # Total notifications sent
        total_sent = self.db.query(func.count(NotificationHistory.id)).filter(
            and_(
                NotificationHistory.user_id == user_id,
                NotificationHistory.status == NotificationStatus.SENT
            )
        ).scalar()

        # Failed notifications
        total_failed = self.db.query(func.count(NotificationHistory.id)).filter(
            and_(
                NotificationHistory.user_id == user_id,
                NotificationHistory.status == NotificationStatus.FAILED
            )
        ).scalar()

        # Notifications by event type (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        event_stats = self.db.query(
            NotificationHistory.event_type,
            func.count(NotificationHistory.id).label('count')
        ).filter(
            and_(
                NotificationHistory.user_id == user_id,
                NotificationHistory.created_at >= thirty_days_ago
            )
        ).group_by(NotificationHistory.event_type).all()

        return {
            "total_sent": total_sent,
            "total_failed": total_failed,
            "success_rate": total_sent / (total_sent + total_failed) if (total_sent + total_failed) > 0 else 0,
            "event_stats": {stat.event_type: stat.count for stat in event_stats},
            "active_channels": len(self.get_user_channels(user_id))
        }
