"""
Analysis Scheduler Service

Handles scheduling, execution, and management of automated analysis schedules.
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import and_, desc, or_
from sqlalchemy.orm import Session

from app.models.ai_analysis import AnalysisSchedule, AnalysisScheduleExecution
from app.models.health_data import HealthData
from app.schemas.ai_analysis import AnalysisScheduleCreate, AnalysisScheduleUpdate
from app.services.ai_analysis_service import AIAnalysisService

logger = logging.getLogger(__name__)


class AnalysisSchedulerService:
    """Service for managing analysis schedules and their execution"""

    def __init__(self, db: Session):
        self.db = db
        self.ai_analysis_service = AIAnalysisService(db)

    # Schedule Management
    async def create_schedule(self, user_id: int, schedule_data: AnalysisScheduleCreate) -> AnalysisSchedule:
        """Create a new analysis schedule"""
        logger.info(f"Creating analysis schedule for user {user_id}: {schedule_data.name}")

        # Calculate next run time
        next_run_at = self._calculate_next_run_time(schedule_data)

        db_schedule = AnalysisSchedule(
            user_id=user_id,
            name=schedule_data.name,
            description=schedule_data.description,
            schedule_type=schedule_data.schedule_type,
            frequency=schedule_data.frequency,
            interval_value=schedule_data.interval_value,
            interval_unit=schedule_data.interval_unit,
            time_of_day=schedule_data.time_of_day,
            days_of_week=schedule_data.days_of_week,
            day_of_month=schedule_data.day_of_month,
            data_threshold_count=schedule_data.data_threshold_count,
            data_threshold_metric=schedule_data.data_threshold_metric,
            analysis_types=schedule_data.analysis_types,
            data_selection_config=schedule_data.data_selection_config,
            provider_id=schedule_data.provider_id,
            additional_context=schedule_data.additional_context,
            enabled=schedule_data.enabled,
            next_run_at=next_run_at
        )

        self.db.add(db_schedule)
        self.db.commit()
        self.db.refresh(db_schedule)

        logger.info(f"Created schedule {db_schedule.id} with next run at {next_run_at}")
        return db_schedule

    def get_schedules(self, user_id: int, enabled_only: bool = False) -> list[AnalysisSchedule]:
        """Get all schedules for a user"""
        query = self.db.query(AnalysisSchedule).filter(AnalysisSchedule.user_id == user_id)
        if enabled_only:
            query = query.filter(AnalysisSchedule.enabled == True)
        return query.order_by(desc(AnalysisSchedule.created_at)).all()

    def get_schedule(self, user_id: int, schedule_id: str) -> AnalysisSchedule | None:
        """Get a specific schedule"""
        return self.db.query(AnalysisSchedule).filter(
            and_(AnalysisSchedule.id == schedule_id, AnalysisSchedule.user_id == user_id)
        ).first()

    async def update_schedule(self, user_id: int, schedule_id: str, schedule_data: AnalysisScheduleUpdate) -> AnalysisSchedule | None:
        """Update an analysis schedule"""
        schedule = self.get_schedule(user_id, schedule_id)
        if not schedule:
            return None

        update_data = schedule_data.dict(exclude_unset=True)

        # If schedule timing changed, recalculate next run time
        timing_fields = ['schedule_type', 'frequency', 'interval_value', 'interval_unit',
                        'time_of_day', 'days_of_week', 'day_of_month']
        if any(field in update_data for field in timing_fields):
            # Update the schedule object temporarily to calculate next run time
            for field, value in update_data.items():
                if field in timing_fields:
                    setattr(schedule, field, value)
            update_data['next_run_at'] = self._calculate_next_run_time(schedule)

        # Apply all updates
        for field, value in update_data.items():
            setattr(schedule, field, value)

        self.db.commit()
        self.db.refresh(schedule)
        return schedule

    def delete_schedule(self, user_id: int, schedule_id: str) -> bool:
        """Delete an analysis schedule"""
        schedule = self.get_schedule(user_id, schedule_id)
        if not schedule:
            return False

        self.db.delete(schedule)
        self.db.commit()
        return True

    def enable_schedule(self, user_id: int, schedule_id: str) -> bool:
        """Enable a schedule"""
        schedule = self.get_schedule(user_id, schedule_id)
        if not schedule:
            return False

        schedule.enabled = True
        schedule.next_run_at = self._calculate_next_run_time(schedule)
        self.db.commit()
        return True

    def disable_schedule(self, user_id: int, schedule_id: str) -> bool:
        """Disable a schedule"""
        schedule = self.get_schedule(user_id, schedule_id)
        if not schedule:
            return False

        schedule.enabled = False
        schedule.next_run_at = None
        self.db.commit()
        return True

    # Schedule Execution
    async def execute_schedule(self, schedule_id: str, execution_type: str = "scheduled",
                             trigger_data: dict[str, Any] | None = None) -> AnalysisScheduleExecution:
        """Execute a schedule and create analyses"""
        schedule = self.db.query(AnalysisSchedule).filter(AnalysisSchedule.id == schedule_id).first()
        if not schedule:
            raise ValueError(f"Schedule {schedule_id} not found")

        logger.info(f"Executing schedule {schedule_id} ({execution_type})")

        # Create execution record
        execution = AnalysisScheduleExecution(
            schedule_id=schedule_id,
            user_id=schedule.user_id,
            execution_type=execution_type,
            trigger_data=trigger_data,
            status="running"
        )
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)

        try:
            # Get health data based on schedule configuration
            health_data = self._get_health_data_for_schedule(schedule)

            if not health_data:
                logger.warning(f"No health data found for schedule {schedule_id}")
                execution.status = "completed"
                execution.completed_at = datetime.utcnow()
                execution.analyses_count = 0
                execution.success_count = 0
                execution.failure_count = 0
                self.db.commit()
                return execution

            # Create analyses for each analysis type
            analyses_created = []
            success_count = 0
            failure_count = 0

            for analysis_type in schedule.analysis_types:
                try:
                    from app.schemas.ai_analysis import AIAnalysisCreate
                    analysis_data = AIAnalysisCreate(
                        health_data_ids=[d.id for d in health_data],
                        analysis_type=analysis_type,
                        provider=schedule.provider_id or "auto-selected",
                        additional_context=schedule.additional_context
                    )

                    # Create analysis
                    analysis = await self.ai_analysis_service.create_analysis(
                        schedule.user_id, analysis_data, background=True
                    )
                    analyses_created.append(analysis.id)
                    success_count += 1

                except Exception as e:
                    logger.error(f"Failed to create analysis {analysis_type} for schedule {schedule_id}: {str(e)}")
                    failure_count += 1

            # Update execution record
            execution.status = "completed"
            execution.completed_at = datetime.utcnow()
            execution.analyses_created = analyses_created
            execution.analyses_count = len(analyses_created)
            execution.success_count = success_count
            execution.failure_count = failure_count

            # Update schedule run info
            schedule.last_run_at = datetime.utcnow()
            schedule.run_count = (schedule.run_count or 0) + 1

            # Calculate next run time for recurring schedules
            if schedule.schedule_type == "recurring" and schedule.enabled:
                schedule.next_run_at = self._calculate_next_run_time(schedule)
            elif schedule.schedule_type == "one_time":
                schedule.enabled = False
                schedule.next_run_at = None

            self.db.commit()
            logger.info(f"Schedule {schedule_id} executed successfully: {success_count} analyses created")

            # Send notification for completed schedule
            await self._send_schedule_notification(schedule, execution, success=True)

        except Exception as e:
            logger.error(f"Error executing schedule {schedule_id}: {str(e)}")
            execution.status = "failed"
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            self.db.commit()

            # Send notification for failed schedule
            await self._send_schedule_notification(schedule, execution, success=False, error=str(e))

        return execution

    def get_due_schedules(self) -> list[AnalysisSchedule]:
        """Get all schedules that are due for execution"""
        now = datetime.utcnow()
        return self.db.query(AnalysisSchedule).filter(
            and_(
                AnalysisSchedule.enabled == True,
                AnalysisSchedule.next_run_at <= now
            )
        ).all()

    def get_data_threshold_schedules(self, metric_type: str, user_id: int) -> list[AnalysisSchedule]:
        """Get schedules that should be triggered by new data"""
        return self.db.query(AnalysisSchedule).filter(
            and_(
                AnalysisSchedule.enabled == True,
                AnalysisSchedule.schedule_type == "data_threshold",
                AnalysisSchedule.user_id == user_id,
                or_(
                    AnalysisSchedule.data_threshold_metric == metric_type,
                    AnalysisSchedule.data_threshold_metric == None  # Any metric type
                )
            )
        ).all()

    def get_executions(self, user_id: int, schedule_id: str | None = None,
                      limit: int = 50) -> list[AnalysisScheduleExecution]:
        """Get execution history"""
        query = self.db.query(AnalysisScheduleExecution).filter(
            AnalysisScheduleExecution.user_id == user_id
        )
        if schedule_id:
            query = query.filter(AnalysisScheduleExecution.schedule_id == schedule_id)

        return query.order_by(desc(AnalysisScheduleExecution.started_at)).limit(limit).all()

    # Helper Methods
    def _calculate_next_run_time(self, schedule: AnalysisSchedule) -> datetime | None:
        """Calculate the next run time for a schedule"""
        if not schedule.enabled or schedule.schedule_type == "data_threshold":
            return None

        now = datetime.utcnow()

        if schedule.schedule_type == "one_time":
            # For one-time schedules, set to run immediately if not already run
            return now if schedule.run_count == 0 else None

        elif schedule.schedule_type == "recurring":
            if schedule.frequency == "daily":
                return self._calculate_daily_next_run(now, schedule.time_of_day)
            elif schedule.frequency == "weekly":
                return self._calculate_weekly_next_run(now, schedule.time_of_day, schedule.days_of_week)
            elif schedule.frequency == "monthly":
                return self._calculate_monthly_next_run(now, schedule.time_of_day, schedule.day_of_month)
            elif schedule.frequency == "custom":
                return self._calculate_custom_next_run(now, schedule.interval_value,
                                                     schedule.interval_unit, schedule.time_of_day)

        return None

    def _calculate_daily_next_run(self, now: datetime, time_of_day: str | None) -> datetime:
        """Calculate next daily run time"""
        if not time_of_day:
            time_of_day = "09:00"  # Default to 9 AM

        hour, minute = map(int, time_of_day.split(':'))
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0)

        # If time has passed today, schedule for tomorrow
        if next_run <= now:
            next_run += timedelta(days=1)

        return next_run

    def _calculate_weekly_next_run(self, now: datetime, time_of_day: str | None,
                                 days_of_week: list[str] | None) -> datetime:
        """Calculate next weekly run time"""
        if not time_of_day:
            time_of_day = "09:00"
        if not days_of_week:
            days_of_week = ["monday"]  # Default to Monday

        hour, minute = map(int, time_of_day.split(':'))
        weekday_mapping = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }

        target_weekdays = [weekday_mapping[day.lower()] for day in days_of_week]
        current_weekday = now.weekday()

        # Find the next occurrence
        days_ahead = []
        for target_day in target_weekdays:
            if target_day > current_weekday:
                days_ahead.append(target_day - current_weekday)
            elif target_day == current_weekday:
                # Check if time has passed today
                today_run_time = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
                if today_run_time > now:
                    days_ahead.append(0)
                else:
                    days_ahead.append(7)  # Next week
            else:
                days_ahead.append(7 - (current_weekday - target_day))

        next_days = min(days_ahead) if days_ahead else 7
        next_run = now.replace(hour=hour, minute=minute, second=0, microsecond=0) + timedelta(days=next_days)
        return next_run

    def _calculate_monthly_next_run(self, now: datetime, time_of_day: str | None,
                                  day_of_month: int | None) -> datetime:
        """Calculate next monthly run time"""
        if not time_of_day:
            time_of_day = "09:00"
        if not day_of_month:
            day_of_month = 1  # Default to 1st of month

        hour, minute = map(int, time_of_day.split(':'))

        # Try current month first
        try:
            next_run = now.replace(day=day_of_month, hour=hour, minute=minute, second=0, microsecond=0)
            if next_run > now:
                return next_run
        except ValueError:
            pass  # Day doesn't exist in current month

        # Move to next month
        if now.month == 12:
            next_month = now.replace(year=now.year + 1, month=1, day=1)
        else:
            next_month = now.replace(month=now.month + 1, day=1)

        # Find valid day in next month
        import calendar
        max_day = calendar.monthrange(next_month.year, next_month.month)[1]
        valid_day = min(day_of_month, max_day)

        return next_month.replace(day=valid_day, hour=hour, minute=minute, second=0, microsecond=0)

    def _calculate_custom_next_run(self, now: datetime, interval_value: int,
                                 interval_unit: str, time_of_day: str | None) -> datetime:
        """Calculate next custom interval run time"""
        if not time_of_day:
            time_of_day = "09:00"

        hour, minute = map(int, time_of_day.split(':'))

        if interval_unit == "days":
            next_run = now + timedelta(days=interval_value)
        elif interval_unit == "weeks":
            next_run = now + timedelta(weeks=interval_value)
        elif interval_unit == "months":
            # Approximate months as 30 days
            next_run = now + timedelta(days=interval_value * 30)
        else:
            next_run = now + timedelta(days=interval_value)  # Default to days

        return next_run.replace(hour=hour, minute=minute, second=0, microsecond=0)

    def _get_health_data_for_schedule(self, schedule: AnalysisSchedule) -> list[HealthData]:
        """Get health data based on schedule configuration"""
        config = schedule.data_selection_config

        # Build base query
        query = self.db.query(HealthData).filter(HealthData.user_id == schedule.user_id)

        # Apply metric type filter
        if config.get('metric_types'):
            query = query.filter(HealthData.metric_type.in_(config['metric_types']))

        # Apply date range filter
        if config.get('date_range'):
            date_config = config['date_range']
            if date_config.get('type') == 'last_n_days':
                days = date_config.get('days', 30)
                start_date = datetime.utcnow() - timedelta(days=days)
                query = query.filter(HealthData.recorded_at >= start_date)
            elif date_config.get('type') == 'custom':
                if date_config.get('start_date'):
                    query = query.filter(HealthData.recorded_at >= date_config['start_date'])
                if date_config.get('end_date'):
                    query = query.filter(HealthData.recorded_at <= date_config['end_date'])

        # Apply limit
        limit = config.get('limit', 100)
        query = query.order_by(desc(HealthData.recorded_at)).limit(limit)

        return query.all()

    async def _send_schedule_notification(self, schedule: AnalysisSchedule, execution: AnalysisScheduleExecution,
                                        success: bool, error: str | None = None):
        """Send notification for schedule execution completion or failure"""
        try:
            from app.services.notification_service import NotificationService

            notification_service = NotificationService(self.db)

            if success:
                await notification_service.notify_schedule_completed(
                    schedule.user_id,
                    schedule,
                    execution.analyses_created or []
                )
            else:
                # For failed schedules, we don't have a direct method in notification service yet
                # So we'll use the generic send_notification method
                from app.models.notification import NotificationEventType, NotificationPriority

                data = {
                    "schedule_id": schedule.id,
                    "schedule_name": schedule.name,
                    "error": error,
                    "failed_at": execution.completed_at.isoformat() if execution.completed_at else datetime.utcnow().isoformat()
                }

                await notification_service.send_notification(
                    user_id=schedule.user_id,
                    event_type=NotificationEventType.SCHEDULE_FAILED,
                    data=data,
                    priority=NotificationPriority.HIGH,
                    schedule_id=schedule.id
                )

        except Exception as e:
            logger.error(f"Failed to send notification for schedule {schedule.id}: {str(e)}")
            # Don't raise - notification failure shouldn't fail the schedule execution


# Service instance
analysis_scheduler_service = None

def get_analysis_scheduler_service(db: Session) -> AnalysisSchedulerService:
    """Get or create analysis scheduler service instance"""
    return AnalysisSchedulerService(db)
