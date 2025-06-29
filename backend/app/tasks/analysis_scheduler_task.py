"""
Analysis Scheduler Background Tasks

Celery tasks for automatically executing scheduled analyses.
"""

import logging
from datetime import datetime, timedelta
from typing import List

from celery import Celery
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.ai_analysis import AnalysisSchedule
from app.services.analysis_scheduler import get_analysis_scheduler_service

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="scheduler.run_due_schedules")
async def run_due_schedules_task(self):
    """
    Background task to check for and execute due analysis schedules.
    This should be run periodically (e.g., every 5-10 minutes).
    """
    logger.info("Checking for due analysis schedules...")
    
    db = SessionLocal()
    try:
        scheduler_service = get_analysis_scheduler_service(db)
        
        # Get all schedules that are due for execution
        due_schedules = scheduler_service.get_due_schedules()
        
        if not due_schedules:
            logger.info("No schedules are due for execution")
            return {"message": "No schedules due", "executed_count": 0}
        
        logger.info(f"Found {len(due_schedules)} schedules due for execution")
        
        executed_count = 0
        failed_count = 0
        
        for schedule in due_schedules:
            try:
                logger.info(f"Executing schedule {schedule.id}: {schedule.name}")
                
                # Execute the schedule
                execution = await scheduler_service.execute_schedule(
                    schedule_id=schedule.id,
                    execution_type="scheduled"
                )
                
                if execution.status == "completed":
                    executed_count += 1
                    logger.info(f"Successfully executed schedule {schedule.id}")
                else:
                    failed_count += 1
                    logger.error(f"Schedule {schedule.id} execution failed: {execution.error_message}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"Failed to execute schedule {schedule.id}: {str(e)}")
                continue
        
        result = {
            "message": f"Processed {len(due_schedules)} due schedules",
            "executed_count": executed_count,
            "failed_count": failed_count,
            "total_processed": len(due_schedules)
        }
        
        logger.info(f"Schedule execution completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in scheduled task execution: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="scheduler.check_data_thresholds")
async def check_data_threshold_schedules_task(self, user_id: int, metric_type: str, new_data_count: int = 1):
    """
    Background task to check if any data threshold schedules should be triggered.
    This should be called whenever new health data is added.
    
    Args:
        user_id: ID of the user who added data
        metric_type: Type of health metric that was added
        new_data_count: Number of new data points added
    """
    logger.info(f"Checking data threshold schedules for user {user_id}, metric: {metric_type}")
    
    db = SessionLocal()
    try:
        scheduler_service = get_analysis_scheduler_service(db)
        
        # Get schedules that could be triggered by this data
        threshold_schedules = scheduler_service.get_data_threshold_schedules(metric_type, user_id)
        
        if not threshold_schedules:
            logger.info(f"No data threshold schedules found for {metric_type}")
            return {"message": "No threshold schedules found", "triggered_count": 0}
        
        triggered_count = 0
        
        for schedule in threshold_schedules:
            try:
                # Check if threshold is met
                required_count = schedule.data_threshold_count or 1
                
                # Get recent data count for this metric
                from app.models.health_data import HealthData
                from sqlalchemy import and_, desc
                
                recent_data_count = db.query(HealthData).filter(
                    and_(
                        HealthData.user_id == user_id,
                        HealthData.metric_type == metric_type,
                        HealthData.recorded_at >= (schedule.last_run_at or schedule.created_at)
                    )
                ).count()
                
                if recent_data_count >= required_count:
                    logger.info(f"Triggering schedule {schedule.id} - threshold met: {recent_data_count}/{required_count}")
                    
                    # Execute the schedule
                    execution = await scheduler_service.execute_schedule(
                        schedule_id=schedule.id,
                        execution_type="data_triggered",
                        trigger_data={
                            "metric_type": metric_type,
                            "data_count": recent_data_count,
                            "threshold": required_count
                        }
                    )
                    
                    if execution.status == "completed":
                        triggered_count += 1
                        logger.info(f"Successfully triggered schedule {schedule.id}")
                    else:
                        logger.error(f"Schedule {schedule.id} trigger failed: {execution.error_message}")
                else:
                    logger.debug(f"Schedule {schedule.id} threshold not met: {recent_data_count}/{required_count}")
                    
            except Exception as e:
                logger.error(f"Failed to check/trigger schedule {schedule.id}: {str(e)}")
                continue
        
        result = {
            "message": f"Checked {len(threshold_schedules)} threshold schedules",
            "triggered_count": triggered_count,
            "total_checked": len(threshold_schedules)
        }
        
        logger.info(f"Data threshold check completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in data threshold check: {str(e)}")
        raise
    finally:
        db.close()


@celery_app.task(bind=True, name="scheduler.cleanup_old_executions")
def cleanup_old_executions_task(self, days_to_keep: int = 90):
    """
    Background task to clean up old schedule execution records.
    This should be run periodically (e.g., daily).
    
    Args:
        days_to_keep: Number of days of execution history to keep
    """
    logger.info(f"Cleaning up schedule executions older than {days_to_keep} days")
    
    db = SessionLocal()
    try:
        from app.models.ai_analysis import AnalysisScheduleExecution
        from sqlalchemy import and_
        
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        
        # Get old executions
        old_executions = db.query(AnalysisScheduleExecution).filter(
            AnalysisScheduleExecution.started_at < cutoff_date
        ).all()
        
        count = len(old_executions)
        
        # Delete old executions
        for execution in old_executions:
            db.delete(execution)
        
        db.commit()
        
        result = {
            "message": f"Cleaned up {count} old execution records",
            "deleted_count": count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
        logger.info(f"Execution cleanup completed: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Error in execution cleanup: {str(e)}")
        raise
    finally:
        db.close()


# Periodic task configuration
# This would typically be configured in celery beat schedule
SCHEDULER_TASKS = {
    'run-due-schedules': {
        'task': 'scheduler.run_due_schedules',
        'schedule': 300.0,  # Run every 5 minutes
    },
    'cleanup-old-executions': {
        'task': 'scheduler.cleanup_old_executions',
        'schedule': 86400.0,  # Run daily
        'kwargs': {'days_to_keep': 90}
    },
}