import logging
from datetime import datetime, timedelta

from celery import current_task
from sqlalchemy.orm import Session

from app.core.celery_app import (
    TASK_PRIORITY_NORMAL,
    celery_app,
)
from app.core.database import SessionLocal
from app.models.ai_analysis import AIAnalysis, AnalysisJob
from app.services.ai_analysis_service import AIAnalysisService
from app.services.ai_providers import AIProviderError

logger = logging.getLogger(__name__)

def get_db_session() -> Session:
    """Get database session for tasks"""
    return SessionLocal()

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def process_ai_analysis(self, analysis_id: int, user_id: int):
    """
    Process AI analysis in the background
    """
    db = get_db_session()

    try:
        # Get the analysis
        analysis = db.query(AIAnalysis).filter(
            AIAnalysis.id == analysis_id,
            AIAnalysis.user_id == user_id
        ).first()

        if not analysis:
            logger.error(f"Analysis {analysis_id} not found for user {user_id}")
            return {"error": "Analysis not found"}

        # Update analysis status
        analysis.status = "processing"
        db.commit()

        # Update task progress
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 10, "total": 100, "status": "Starting analysis..."}
        )

        # Initialize service
        service = AIAnalysisService(db)

        # Update progress
        current_task.update_state(
            state="PROGRESS",
            meta={"current": 30, "total": 100, "status": "Preparing health data..."}
        )

        # Execute the analysis using the existing service method
        import asyncio
        import traceback

        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                loop.run_until_complete(service._execute_analysis(analysis, None))
            finally:
                loop.close()

            # Refresh analysis from database to get updated status
            db.refresh(analysis)

            # Update progress based on actual analysis status
            if analysis.status == "completed":
                current_task.update_state(
                    state="SUCCESS",
                    meta={"current": 100, "total": 100, "status": "Analysis completed successfully"}
                )
                logger.info(f"Analysis {analysis_id} completed successfully")
            elif analysis.status == "failed":
                current_task.update_state(
                    state="FAILURE",
                    meta={"error": analysis.error_message or "Analysis failed"}
                )
                logger.error(f"Analysis {analysis_id} failed: {analysis.error_message}")
            else:
                # Analysis is still in progress somehow
                current_task.update_state(
                    state="PROGRESS",
                    meta={"current": 90, "total": 100, "status": f"Analysis status: {analysis.status}"}
                )
                logger.warning(f"Analysis {analysis_id} in unexpected status: {analysis.status}")

            return {
                "analysis_id": analysis_id,
                "status": analysis.status,
                "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
                "processing_time": analysis.processing_time,
                "cost": analysis.cost,
                "error_message": analysis.error_message
            }

        except Exception as exec_error:
            logger.error(f"Error during analysis execution: {str(exec_error)}")
            logger.error(f"Execution traceback: {traceback.format_exc()}")

            # Update analysis status in database
            analysis.status = "failed"
            analysis.error_message = f"Execution error: {str(exec_error)}"
            analysis.completed_at = datetime.utcnow()
            db.commit()

            current_task.update_state(
                state="FAILURE",
                meta={"error": f"Execution error: {str(exec_error)}"}
            )

            raise

    except AIProviderError as e:
        logger.error(f"AI Provider error in analysis {analysis_id}: {str(e)}")

        # Update analysis status
        analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
        if analysis:
            analysis.status = "failed"
            analysis.error_message = f"AI Provider Error: {str(e)}"
            analysis.completed_at = datetime.utcnow()
            db.commit()

        current_task.update_state(
            state="FAILURE",
            meta={"error": f"AI Provider Error: {str(e)}"}
        )

        raise

    except Exception as exc:
        logger.error(f"Error processing analysis {analysis_id}: {str(exc)}")
        logger.error(traceback.format_exc())

        # Update analysis status
        analysis = db.query(AIAnalysis).filter(AIAnalysis.id == analysis_id).first()
        if analysis:
            analysis.status = "failed"
            analysis.error_message = f"Processing error: {str(exc)}"
            analysis.completed_at = datetime.utcnow()
            db.commit()

        # Retry logic
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying analysis {analysis_id} (attempt {self.request.retries + 1})")
            current_task.update_state(
                state="RETRY",
                meta={"error": str(exc), "retry": self.request.retries + 1}
            )
            raise self.retry(countdown=60 * (2 ** self.request.retries)) from exc  # Exponential backoff

        current_task.update_state(
            state="FAILURE",
            meta={"error": str(exc)}
        )

        raise

    finally:
        db.close()

@celery_app.task
def create_analysis_job(analysis_id: int, user_id: int, provider_id: str = None, priority: int = TASK_PRIORITY_NORMAL):
    """
    Create a new analysis job and queue it for processing
    """
    db = get_db_session()

    try:
        # Create job record
        job = AnalysisJob(
            analysis_id=analysis_id,
            user_id=user_id,
            provider_id=provider_id,
            priority=priority,
            status="queued"
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        # Queue the actual analysis task with priority
        task = process_ai_analysis.apply_async(
            args=[analysis_id, user_id],
            priority=priority,
            task_id=str(job.id)
        )

        # Update job with Celery task ID
        job.job_id = task.id
        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()

        logger.info(f"Created analysis job {job.id} for analysis {analysis_id}")

        return {
            "job_id": str(job.id),
            "task_id": task.id,
            "status": "queued"
        }

    except Exception as e:
        logger.error(f"Error creating analysis job: {str(e)}")
        db.rollback()
        raise

    finally:
        db.close()

@celery_app.task
def cleanup_old_analyses():
    """
    Clean up old completed analyses and jobs (optional maintenance task)
    """
    db = get_db_session()

    try:
        # Delete completed analyses older than 30 days
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        old_analyses = db.query(AIAnalysis).filter(
            AIAnalysis.status.in_(["completed", "failed"]),
            AIAnalysis.completed_at < cutoff_date
        ).all()

        # Delete associated jobs first
        for analysis in old_analyses:
            db.query(AnalysisJob).filter(
                AnalysisJob.analysis_id == analysis.id
            ).delete()

        # Delete analyses
        count = len(old_analyses)
        for analysis in old_analyses:
            db.delete(analysis)

        db.commit()

        logger.info(f"Cleaned up {count} old analyses")

        return {"cleaned_up": count}

    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        db.rollback()
        raise

    finally:
        db.close()

@celery_app.task
def get_analysis_status(analysis_id: int, user_id: int):
    """
    Get the current status of an analysis
    """
    db = get_db_session()

    try:
        analysis = db.query(AIAnalysis).filter(
            AIAnalysis.id == analysis_id,
            AIAnalysis.user_id == user_id
        ).first()

        if not analysis:
            return {"error": "Analysis not found"}

        # Get associated job if exists
        job = db.query(AnalysisJob).filter(
            AnalysisJob.analysis_id == analysis_id
        ).first()

        return {
            "analysis_id": analysis_id,
            "status": analysis.status,
            "created_at": analysis.created_at.isoformat(),
            "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
            "error_message": analysis.error_message,
            "processing_time": analysis.processing_time,
            "cost": analysis.cost,
            "job_id": str(job.id) if job else None,
            "task_id": job.job_id if job else None
        }

    except Exception as e:
        logger.error(f"Error getting analysis status: {str(e)}")
        return {"error": str(e)}

    finally:
        db.close()

@celery_app.task
def schedule_automatic_analysis(user_id: int, analysis_types: list = None):
    """
    Schedule automatic analysis for a user based on their settings
    """
    db = get_db_session()

    try:
        from app.models.ai_analysis import AnalysisSettings
        from app.models.health_data import HealthData

        # Get user's analysis settings
        settings = db.query(AnalysisSettings).filter(
            AnalysisSettings.user_id == user_id
        ).first()

        if not settings or not settings.auto_analysis_enabled:
            return {"message": "Auto-analysis not enabled for user"}

        # Get recent health data (last 30 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=30)
        recent_data = db.query(HealthData).filter(
            HealthData.user_id == user_id,
            HealthData.recorded_at >= recent_cutoff
        ).limit(50).all()  # Limit to recent 50 entries

        if not recent_data:
            return {"message": "No recent health data for analysis"}

        # Use provided analysis types or default from settings
        types_to_run = analysis_types or settings.default_analysis_types or ["insights"]
        health_data_ids = [data.id for data in recent_data]

        # Get preferred providers
        preferred_providers = settings.preferred_providers or []

        analyses_created = []

        for analysis_type in types_to_run:
            try:
                # Create analysis using the service
                service = AIAnalysisService(db)

                from app.schemas.ai_analysis import AIAnalysisCreate
                analysis_data = AIAnalysisCreate(
                    health_data_ids=health_data_ids,
                    analysis_type=analysis_type,
                    provider_name="auto-selected",
                    provider_id=preferred_providers[0] if preferred_providers else None
                )

                # Create analysis synchronously for tasks
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    analysis = loop.run_until_complete(service.create_analysis(user_id, analysis_data, background=False))
                finally:
                    loop.close()
                analyses_created.append({
                    "analysis_id": analysis.id,
                    "type": analysis_type
                })

            except Exception as e:
                logger.error(f"Error creating auto-analysis {analysis_type} for user {user_id}: {str(e)}")
                continue

        logger.info(f"Created {len(analyses_created)} automatic analyses for user {user_id}")

        return {
            "user_id": user_id,
            "analyses_created": len(analyses_created),
            "analyses": analyses_created
        }

    except Exception as e:
        logger.error(f"Error in automatic analysis for user {user_id}: {str(e)}")
        return {"error": str(e)}

    finally:
        db.close()
