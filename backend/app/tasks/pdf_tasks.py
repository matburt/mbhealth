"""
Celery tasks for PDF report generation.
"""

from datetime import datetime

from celery import current_task
from sqlalchemy.orm import Session

from app.core.celery_app import celery_app
from app.core.database import get_db
from app.models.health_data import HealthData
from app.services.pdf_report_service import pdf_report_service


@celery_app.task(bind=True)
def generate_pdf_report(
    self,
    user_id: int,
    start_date_str: str,
    end_date_str: str,
    metric_types: list[str] | None = None,
    include_charts: bool = True,
    include_summary: bool = True,
    include_trends: bool = True,
    user_timezone: str = None
):
    """
    Generate a PDF report asynchronously.
    
    Args:
        self: Celery task instance
        user_id: User ID
        start_date_str: Start date as ISO string
        end_date_str: End date as ISO string
        metric_types: Optional list of metric types to include
        include_charts: Whether to include charts
        include_summary: Whether to include summary
        include_trends: Whether to include trend analysis
        user_timezone: User's timezone for timestamp conversion
        
    Returns:
        bytes: PDF document as bytes
    """
    try:
        # Update task state
        current_task.update_state(
            state='PROGRESS',
            meta={'progress': 10, 'message': 'Starting PDF generation...'}
        )

        # Parse dates
        start_date = datetime.fromisoformat(start_date_str)
        end_date = datetime.fromisoformat(end_date_str)

        # Get database session
        db: Session = next(get_db())

        try:
            # Update progress
            current_task.update_state(
                state='PROGRESS',
                meta={'progress': 30, 'message': 'Querying health data...'}
            )

            # Query health data
            health_data_query = db.query(HealthData).filter(
                HealthData.user_id == user_id,
                HealthData.recorded_at >= start_date,
                HealthData.recorded_at <= end_date
            )

            if metric_types:
                health_data_query = health_data_query.filter(
                    HealthData.metric_type.in_(metric_types)
                )

            health_data = health_data_query.order_by(HealthData.recorded_at).all()

            if not health_data:
                raise ValueError("No health data found for the specified criteria")

            # Update progress
            current_task.update_state(
                state='PROGRESS',
                meta={'progress': 50, 'message': 'Generating charts and analysis...'}
            )

            # Generate PDF report
            import asyncio
            pdf_bytes = asyncio.run(pdf_report_service.generate_health_report(
                user_id=user_id,
                health_data=health_data,
                date_range=(start_date, end_date),
                metric_types=metric_types,
                include_charts=include_charts,
                include_summary=include_summary,
                include_trends=include_trends,
                user_timezone=user_timezone,
                db_session=db
            ))

            # Update progress
            current_task.update_state(
                state='PROGRESS',
                meta={'progress': 90, 'message': 'Finalizing PDF document...'}
            )

            return pdf_bytes

        finally:
            db.close()

    except Exception as e:
        # Update task state to failure
        current_task.update_state(
            state='FAILURE',
            meta={'error': str(e), 'message': f'PDF generation failed: {str(e)}'}
        )
        raise e
