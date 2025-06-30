"""
Notifications API endpoints

Provides endpoints for managing notification channels, preferences, and history.
"""

from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.notification import (
    NotificationChannelType,
    NotificationEventType,
    NotificationPriority,
    NotificationStatus,
)
from app.schemas.notification import (
    BulkPreferenceUpdate,
    NotificationChannel,
    NotificationChannelCreate,
    NotificationChannelTest,
    NotificationChannelUpdate,
    NotificationConfig,
    NotificationHistory,
    NotificationPreference,
    NotificationPreferenceCreate,
    NotificationPreferenceUpdate,
    NotificationPreferenceWithChannel,
    NotificationStats,
    NotificationTemplate,
    QuickSetupRequest,
    QuickSetupResponse,
    SendNotificationRequest,
    SendNotificationResponse,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
)
from app.schemas.user import User
from app.services.notification_service import NotificationService

router = APIRouter()


# Channel Management
@router.post("/channels/", response_model=NotificationChannel)
async def create_notification_channel(
    *,
    db: Session = Depends(get_db),
    channel_in: NotificationChannelCreate,
    current_user: User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Create a new notification channel.
    The channel will be automatically tested after creation.
    """
    service = NotificationService(db)

    try:
        channel = service.create_channel(
            user_id=current_user.id,
            name=channel_in.name,
            channel_type=channel_in.channel_type,
            apprise_url=channel_in.apprise_url
        )

        # Test channel in background
        background_tasks.add_task(service.test_channel, channel.id, current_user.id)

        return channel
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create channel: {str(e)}"
        )


@router.get("/channels/", response_model=list[NotificationChannel])
def get_notification_channels(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get all notification channels for the current user.
    """
    service = NotificationService(db)
    return service.get_user_channels(current_user.id)


@router.get("/channels/{channel_id}", response_model=NotificationChannel)
def get_notification_channel(
    *,
    db: Session = Depends(get_db),
    channel_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get a specific notification channel.
    """
    from app.core.security import decrypt_data
    from app.models.notification import NotificationChannel as ChannelModel

    channel = db.query(ChannelModel).filter(
        ChannelModel.id == channel_id,
        ChannelModel.user_id == current_user.id
    ).first()

    if not channel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )

    # Decrypt URL before returning
    try:
        channel.apprise_url = decrypt_data(channel.apprise_url)
    except Exception as e:
        # Log but don't fail the request if decryption fails
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to decrypt URL for channel {channel.id}: {str(e)}")

    return channel


@router.put("/channels/{channel_id}", response_model=NotificationChannel)
async def update_notification_channel(
    *,
    db: Session = Depends(get_db),
    channel_id: str,
    channel_in: NotificationChannelUpdate,
    current_user: User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Update a notification channel.
    """
    service = NotificationService(db)

    try:
        channel = service.update_channel(
            channel_id=channel_id,
            user_id=current_user.id,
            **channel_in.dict(exclude_unset=True)
        )

        # Re-test channel if URL was updated
        if channel_in.apprise_url is not None:
            background_tasks.add_task(service.test_channel, channel_id, current_user.id)

        return channel
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update channel: {str(e)}"
        )


@router.delete("/channels/{channel_id}")
def delete_notification_channel(
    *,
    db: Session = Depends(get_db),
    channel_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a notification channel.
    """
    service = NotificationService(db)

    success = service.delete_channel(channel_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Channel not found"
        )

    return {"message": "Channel deleted successfully"}


@router.post("/channels/{channel_id}/test", response_model=NotificationChannelTest)
async def test_notification_channel(
    *,
    db: Session = Depends(get_db),
    channel_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Test a notification channel by sending a test message.
    """
    service = NotificationService(db)

    try:
        result = await service.test_channel(channel_id, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to test channel: {str(e)}"
        )


# Preference Management
@router.post("/preferences/", response_model=NotificationPreference)
async def create_notification_preference(
    *,
    db: Session = Depends(get_db),
    preference_in: NotificationPreferenceCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create or update a notification preference.
    """
    service = NotificationService(db)

    try:
        preference = service.create_or_update_preference(
            user_id=current_user.id,
            channel_id=preference_in.channel_id,
            event_type=preference_in.event_type,
            **preference_in.dict(exclude={'channel_id', 'event_type'})
        )
        return preference
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create preference: {str(e)}"
        )


@router.get("/preferences/", response_model=list[NotificationPreferenceWithChannel])
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    event_type: NotificationEventType | None = Query(None, description="Filter by event type"),
    channel_id: str | None = Query(None, description="Filter by channel ID"),
) -> Any:
    """
    Get notification preferences for the current user.
    """
    from app.models.notification import NotificationChannel as ChannelModel
    from app.models.notification import NotificationPreference as PreferenceModel

    query = db.query(PreferenceModel).join(ChannelModel).filter(
        PreferenceModel.user_id == current_user.id
    )

    if event_type:
        query = query.filter(PreferenceModel.event_type == event_type)

    if channel_id:
        query = query.filter(PreferenceModel.channel_id == channel_id)

    preferences = query.order_by(
        PreferenceModel.event_type,
        ChannelModel.name
    ).all()

    return preferences


@router.put("/preferences/{preference_id}", response_model=NotificationPreference)
async def update_notification_preference(
    *,
    db: Session = Depends(get_db),
    preference_id: str,
    preference_in: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update a notification preference.
    """
    from app.models.notification import NotificationPreference as PreferenceModel

    preference = db.query(PreferenceModel).filter(
        PreferenceModel.id == preference_id,
        PreferenceModel.user_id == current_user.id
    ).first()

    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preference not found"
        )

    try:
        update_data = preference_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preference, field, value)

        db.commit()
        db.refresh(preference)
        return preference
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update preference: {str(e)}"
        )


@router.delete("/preferences/{preference_id}")
def delete_notification_preference(
    *,
    db: Session = Depends(get_db),
    preference_id: str,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete a notification preference.
    """
    from app.models.notification import NotificationPreference as PreferenceModel

    preference = db.query(PreferenceModel).filter(
        PreferenceModel.id == preference_id,
        PreferenceModel.user_id == current_user.id
    ).first()

    if not preference:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preference not found"
        )

    db.delete(preference)
    db.commit()
    return {"message": "Preference deleted successfully"}


@router.post("/preferences/bulk", response_model=list[NotificationPreference])
async def bulk_update_preferences(
    *,
    db: Session = Depends(get_db),
    bulk_update: BulkPreferenceUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Bulk update preferences for multiple event types.
    """
    from app.models.notification import NotificationPreference as PreferenceModel

    updated_preferences = []

    try:
        for event_type in bulk_update.event_types:
            preferences = db.query(PreferenceModel).filter(
                PreferenceModel.user_id == current_user.id,
                PreferenceModel.event_type == event_type
            ).all()

            for preference in preferences:
                update_data = bulk_update.updates.dict(exclude_unset=True)
                for field, value in update_data.items():
                    setattr(preference, field, value)
                updated_preferences.append(preference)

        db.commit()
        for preference in updated_preferences:
            db.refresh(preference)

        return updated_preferences
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update preferences: {str(e)}"
        )


# Manual Notification Sending
@router.post("/send", response_model=SendNotificationResponse)
async def send_notification(
    *,
    db: Session = Depends(get_db),
    notification_request: SendNotificationRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Manually send a notification (admin/testing purposes).
    """
    # Only allow users to send notifications to themselves unless they're superuser
    if notification_request.user_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot send notifications to other users"
        )

    service = NotificationService(db)

    try:
        results = await service.send_notification(
            user_id=notification_request.user_id,
            event_type=notification_request.event_type,
            data=notification_request.data,
            priority=notification_request.priority,
            analysis_id=notification_request.analysis_id,
            schedule_id=notification_request.schedule_id,
            workflow_id=notification_request.workflow_id,
            execution_id=notification_request.execution_id
        )

        total_sent = sum(1 for r in results if r["success"])
        total_failed = len(results) - total_sent
        success_rate = total_sent / len(results) if results else 0

        return SendNotificationResponse(
            results=results,
            total_sent=total_sent,
            total_failed=total_failed,
            success_rate=success_rate
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send notification: {str(e)}"
        )


# History and Statistics
@router.get("/history/", response_model=list[NotificationHistory])
def get_notification_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    limit: int = Query(50, description="Maximum number of records to return"),
    event_type: NotificationEventType | None = Query(None, description="Filter by event type"),
    status: NotificationStatus | None = Query(None, description="Filter by status"),
) -> Any:
    """
    Get notification history for the current user.
    """
    service = NotificationService(db)
    return service.get_notification_history(
        user_id=current_user.id,
        limit=limit,
        event_type=event_type,
        status=status
    )


@router.get("/stats/", response_model=NotificationStats)
def get_notification_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get notification statistics for the current user.
    """
    service = NotificationService(db)
    return service.get_notification_stats(current_user.id)


# Templates (Admin/System)
@router.get("/templates/", response_model=list[NotificationTemplate])
def get_notification_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    event_type: NotificationEventType | None = Query(None, description="Filter by event type"),
    channel_type: NotificationChannelType | None = Query(None, description="Filter by channel type"),
) -> Any:
    """
    Get notification templates.
    """
    from app.models.notification import NotificationTemplate as TemplateModel

    query = db.query(TemplateModel).filter(
        TemplateModel.is_active == True
    )

    if event_type:
        query = query.filter(TemplateModel.event_type == event_type)

    if channel_type:
        query = query.filter(TemplateModel.channel_type == channel_type)

    return query.order_by(
        TemplateModel.event_type,
        TemplateModel.channel_type
    ).all()


@router.post("/templates/preview", response_model=TemplatePreviewResponse)
async def preview_notification_template(
    *,
    db: Session = Depends(get_db),
    preview_request: TemplatePreviewRequest,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Preview a notification template with example data.
    """
    from jinja2 import Template, TemplateError

    try:
        subject = None
        if preview_request.subject_template:
            subject_template = Template(preview_request.subject_template)
            subject = subject_template.render(**preview_request.example_data)

        body_template = Template(preview_request.body_template)
        message = body_template.render(**preview_request.example_data)

        return TemplatePreviewResponse(
            subject=subject,
            message=message,
            success=True
        )
    except TemplateError as e:
        return TemplatePreviewResponse(
            subject=None,
            message="",
            success=False,
            error=f"Template error: {str(e)}"
        )
    except Exception as e:
        return TemplatePreviewResponse(
            subject=None,
            message="",
            success=False,
            error=f"Preview failed: {str(e)}"
        )


# Configuration and Setup
@router.get("/config/", response_model=NotificationConfig)
def get_notification_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get notification system configuration and available options.
    """
    return NotificationConfig(
        available_channel_types=[t.value for t in NotificationChannelType],
        available_event_types=[t.value for t in NotificationEventType],
        available_priorities=[p.value for p in NotificationPriority],
        default_templates={
            "analysis_completed": {
                "subject": "✅ Analysis Complete - {{analysis_type}}",
                "body": "Your {{analysis_type}} analysis has completed successfully.\n\nProvider: {{provider}}\nProcessing Time: {{processing_time}}s\nCost: ${{cost}}"
            },
            "schedule_completed": {
                "subject": "📅 Schedule Complete - {{schedule_name}}",
                "body": "Schedule '{{schedule_name}}' completed successfully.\n\nAnalyses Created: {{analyses_created|length}}\nCompleted At: {{completed_at}}"
            }
        },
        rate_limit_defaults={
            "max_per_hour": 10,
            "max_per_day": 100
        }
    )


@router.post("/quick-setup", response_model=QuickSetupResponse)
async def quick_notification_setup(
    *,
    db: Session = Depends(get_db),
    setup_request: QuickSetupRequest,
    current_user: User = Depends(get_current_active_user),
    background_tasks: BackgroundTasks
) -> Any:
    """
    Quick setup for common notification channels.
    """
    service = NotificationService(db)

    channels_created = []
    preferences_created = []
    tests_passed = []
    tests_failed = []

    try:
        # Create email channel if provided
        if setup_request.email:
            email_channel = service.create_channel(
                user_id=current_user.id,
                name="Email Notifications",
                channel_type=NotificationChannelType.EMAIL,
                apprise_url=f"mailto://{setup_request.email}"
            )
            channels_created.append(email_channel.id)

            # Test channel
            test_result = await service._test_channel(email_channel)
            if test_result["success"]:
                tests_passed.append(email_channel.id)
            else:
                tests_failed.append(email_channel.id)

        # Create Discord channel if provided
        if setup_request.discord_webhook:
            discord_channel = service.create_channel(
                user_id=current_user.id,
                name="Discord Notifications",
                channel_type=NotificationChannelType.DISCORD,
                apprise_url=setup_request.discord_webhook
            )
            channels_created.append(discord_channel.id)

            # Test channel
            test_result = await service._test_channel(discord_channel)
            if test_result["success"]:
                tests_passed.append(discord_channel.id)
            else:
                tests_failed.append(discord_channel.id)

        # Create Slack channel if provided
        if setup_request.slack_webhook:
            slack_channel = service.create_channel(
                user_id=current_user.id,
                name="Slack Notifications",
                channel_type=NotificationChannelType.SLACK,
                apprise_url=setup_request.slack_webhook
            )
            channels_created.append(slack_channel.id)

            # Test channel
            test_result = await service._test_channel(slack_channel)
            if test_result["success"]:
                tests_passed.append(slack_channel.id)
            else:
                tests_failed.append(slack_channel.id)

        # Create custom channel if provided
        if setup_request.custom_channel:
            custom_channel = service.create_channel(
                user_id=current_user.id,
                name=setup_request.custom_channel.name,
                channel_type=setup_request.custom_channel.channel_type,
                apprise_url=setup_request.custom_channel.apprise_url
            )
            channels_created.append(custom_channel.id)

            # Test channel
            test_result = await service._test_channel(custom_channel)
            if test_result["success"]:
                tests_passed.append(custom_channel.id)
            else:
                tests_failed.append(custom_channel.id)

        # Create default preferences if requested
        if setup_request.enable_all_events:
            default_events = [
                NotificationEventType.ANALYSIS_COMPLETED,
                NotificationEventType.ANALYSIS_FAILED,
                NotificationEventType.SCHEDULE_COMPLETED,
                NotificationEventType.WORKFLOW_COMPLETED
            ]

            for channel_id in channels_created:
                for event_type in default_events:
                    preference = service.create_or_update_preference(
                        user_id=current_user.id,
                        channel_id=channel_id,
                        event_type=event_type,
                        is_enabled=True,
                        minimum_priority=setup_request.priority_level
                    )
                    preferences_created.append(preference.id)

        success = len(channels_created) > 0 and len(tests_failed) == 0
        message = f"Created {len(channels_created)} channels, {len(preferences_created)} preferences. {len(tests_passed)} tests passed, {len(tests_failed)} failed."

        return QuickSetupResponse(
            channels_created=channels_created,
            preferences_created=preferences_created,
            tests_passed=tests_passed,
            tests_failed=tests_failed,
            success=success,
            message=message
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Quick setup failed: {str(e)}"
        )
