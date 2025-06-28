from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "mbhealth",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.ai_analysis"]
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,  # Results expire after 1 hour
    task_default_queue="analysis",
    task_routes={
        "app.tasks.ai_analysis.*": {"queue": "analysis"},
    },
    worker_prefetch_multiplier=1,  # One task at a time for AI processing
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_default_rate_limit="10/m",  # 10 tasks per minute default
    beat_schedule={
        # Scheduled tasks can be added here
        # "cleanup-old-analyses": {
        #     "task": "app.tasks.ai_analysis.cleanup_old_analyses",
        #     "schedule": crontab(hour=2, minute=0),  # Run at 2 AM daily
        # },
    },
)

# Task priority levels
TASK_PRIORITY_HIGH = 9
TASK_PRIORITY_NORMAL = 5
TASK_PRIORITY_LOW = 1