from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user
from app.core.celery_app import celery_app
from app.core.database import get_db
from app.schemas.ai_analysis import (
    AIAnalysisCreate,
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIProviderCreate,
    AIProviderUpdate,
    AIProviderWithoutKey,
    ProviderTestRequest,
    ProviderTestResponse,
)
from app.schemas.user import User
from app.services.ai_analysis_service import AIAnalysisService
from app.services.ai_providers import AIProviderError, ProviderFactory
from app.services.analysis_history import get_analysis_history_service

router = APIRouter()

# AI Provider Management Endpoints

@router.post("/providers", response_model=AIProviderWithoutKey)
async def create_ai_provider(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    provider_data: AIProviderCreate
) -> Any:
    """Create a new AI provider"""
    service = AIAnalysisService(db)

    # Validate provider configuration
    config = {
        "api_key": provider_data.api_key,
        "endpoint": provider_data.endpoint
    }
    errors = ProviderFactory.validate_provider_config(provider_data.type, config)
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid provider configuration: {errors}"
        )

    try:
        provider = await service.create_provider(current_user.id, provider_data)
        return provider
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create provider: {str(e)}"
        ) from e

@router.get("/providers", response_model=list[AIProviderWithoutKey])
def get_ai_providers(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    enabled_only: bool = False
) -> Any:
    """Get all AI providers for the current user"""
    service = AIAnalysisService(db)
    return service.get_providers(current_user.id, enabled_only=enabled_only)

@router.get("/providers/{provider_id}", response_model=AIProviderWithoutKey)
def get_ai_provider(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    provider_id: str
) -> Any:
    """Get a specific AI provider"""
    service = AIAnalysisService(db)
    provider = service.get_provider(current_user.id, provider_id)
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    return provider

@router.put("/providers/{provider_id}", response_model=AIProviderWithoutKey)
async def update_ai_provider(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    provider_id: str,
    provider_data: AIProviderUpdate
) -> Any:
    """Update an AI provider"""
    service = AIAnalysisService(db)

    # Validate configuration if provided
    if provider_data.type or provider_data.api_key or provider_data.endpoint:
        existing_provider = service.get_provider(current_user.id, provider_id)
        if not existing_provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )

        config = {
            "api_key": provider_data.api_key or "existing",  # Don't validate existing key
            "endpoint": provider_data.endpoint or existing_provider.endpoint
        }
        provider_type = provider_data.type or existing_provider.type
        errors = ProviderFactory.validate_provider_config(provider_type, config)
        if errors and "api_key" not in errors:  # Ignore API key validation for updates
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid provider configuration: {errors}"
            )

    try:
        provider = await service.update_provider(current_user.id, provider_id, provider_data)
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        return provider
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update provider: {str(e)}"
        ) from e

@router.delete("/providers/{provider_id}")
def delete_ai_provider(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    provider_id: str
) -> Any:
    """Delete an AI provider"""
    service = AIAnalysisService(db)
    success = service.delete_provider(current_user.id, provider_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    return {"message": "Provider deleted successfully"}

@router.post("/providers/{provider_id}/test", response_model=ProviderTestResponse)
async def test_ai_provider(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    provider_id: str
) -> Any:
    """Test connection to an AI provider"""
    service = AIAnalysisService(db)
    result = await service.test_provider(current_user.id, provider_id)

    return ProviderTestResponse(
        success=result["success"],
        message=result["message"],
        available_models=result.get("available_models"),
        response_time=result.get("response_time")
    )

@router.post("/providers/test", response_model=ProviderTestResponse)
async def test_provider_config(
    *,
    test_request: ProviderTestRequest
) -> Any:
    """Test a provider configuration without saving it"""
    try:
        # Validate configuration
        config = {
            "api_key": test_request.api_key,
            "endpoint": test_request.endpoint
        }
        errors = ProviderFactory.validate_provider_config(test_request.type, config)
        if errors:
            return ProviderTestResponse(
                success=False,
                message=f"Configuration validation failed: {errors}"
            )

        # Create temporary provider instance
        provider = ProviderFactory.create_provider(
            test_request.type,
            test_request.api_key,
            test_request.endpoint
        )

        # Test connection
        result = await provider.test_connection()

        return ProviderTestResponse(
            success=result["success"],
            message=result["message"],
            available_models=result.get("available_models"),
            response_time=result.get("response_time")
        )

    except Exception as e:
        return ProviderTestResponse(
            success=False,
            message=f"Test failed: {str(e)}"
        )

@router.get("/providers/types/supported")
def get_supported_provider_types() -> dict[str, Any]:
    """Get information about supported provider types"""
    return ProviderFactory.get_supported_providers()

# AI Analysis Endpoints

@router.post("/", response_model=AIAnalysisResponse)
async def create_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_request: AIAnalysisRequest
) -> Any:
    """Create a new AI analysis"""
    import logging
    import traceback

    logger = logging.getLogger(__name__)

    try:
        service = AIAnalysisService(db)

        # Convert request to create schema
        analysis_data = AIAnalysisCreate(
            health_data_ids=analysis_request.health_data_ids,
            analysis_type=analysis_request.analysis_type,
            provider=analysis_request.provider,
            additional_context=analysis_request.additional_context,
            provider_id=analysis_request.provider if len(analysis_request.provider) > 10 else None  # Assume UUID if long
        )

        logger.info(f"Creating analysis for user {current_user.id}: {analysis_data}")

        analysis = await service.create_analysis(current_user.id, analysis_data)

        response = AIAnalysisResponse(
            id=analysis.id,
            user_id=analysis.user_id,
            health_data_ids=analysis.health_data_ids,
            analysis_type=analysis.analysis_type,
            provider=analysis.provider_name,
            request_prompt=analysis.request_prompt,
            response_content=analysis.response_content or "",
            status=analysis.status,
            created_at=analysis.created_at.isoformat(),
            completed_at=analysis.completed_at.isoformat() if analysis.completed_at else None,
            error_message=analysis.error_message
        )

        # Track analysis creation in history
        try:

            def get_request_context():
                # Try to get request context from FastAPI context
                return {
                    'user_agent': None,  # Would need request object to get this
                    'ip_address': None,  # Would need request object to get this
                    'session_id': None   # Would need session management to get this
                }

            history_service = get_analysis_history_service(db)
            history_service.track_analysis_created(
                user_id=current_user.id,
                analysis_id=analysis.id,
                creation_details={
                    'analysis_type': analysis.analysis_type,
                    'provider': analysis.provider_name,
                    'health_data_count': len(analysis.health_data_ids)
                },
                request_context=get_request_context()
            )
        except Exception as e:
            logger.warning(f"Failed to track analysis creation in history: {str(e)}")

        logger.info(f"Successfully created analysis {analysis.id}")
        return response

    except AIProviderError as e:
        logger.error(f"AI provider error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI provider error: {str(e)}"
        ) from e
    except Exception as e:
        logger.error(f"Analysis creation failed: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        ) from e

@router.get("/", response_model=list[AIAnalysisResponse])
def get_analyses(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100
) -> Any:
    """Get AI analyses for the current user"""
    service = AIAnalysisService(db)
    analyses = service.get_analyses(current_user.id, skip=skip, limit=limit)

    return [
        AIAnalysisResponse(
            id=analysis.id,
            user_id=analysis.user_id,
            health_data_ids=analysis.health_data_ids,
            analysis_type=analysis.analysis_type,
            provider=analysis.provider_name,
            request_prompt=analysis.request_prompt,
            response_content=analysis.response_content,
            status=analysis.status,
            created_at=analysis.created_at.isoformat(),
            completed_at=analysis.completed_at.isoformat() if analysis.completed_at else None,
            error_message=analysis.error_message
        )
        for analysis in analyses
    ]

@router.get("/{analysis_id}", response_model=AIAnalysisResponse)
def get_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """Get a specific AI analysis"""
    service = AIAnalysisService(db)
    analysis = service.get_analysis(current_user.id, analysis_id)

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    # Track analysis view in history
    try:
        history_service = get_analysis_history_service(db)
        history_service.track_analysis_viewed(
            user_id=current_user.id,
            analysis_id=analysis.id,
            view_details={'endpoint': 'get_analysis'}
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to track analysis view in history: {str(e)}")

    return AIAnalysisResponse(
        id=analysis.id,
        user_id=analysis.user_id,
        health_data_ids=analysis.health_data_ids,
        analysis_type=analysis.analysis_type,
        provider=analysis.provider_name,
        request_prompt=analysis.request_prompt,
        response_content=analysis.response_content,
        status=analysis.status,
        created_at=analysis.created_at.isoformat(),
        completed_at=analysis.completed_at.isoformat() if analysis.completed_at else None,
        error_message=analysis.error_message
    )

@router.delete("/{analysis_id}")
def delete_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """Delete an AI analysis"""
    service = AIAnalysisService(db)

    # Get analysis info before deletion for history tracking
    analysis = service.get_analysis(current_user.id, analysis_id)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    success = service.delete_analysis(current_user.id, analysis_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    # Track analysis deletion in history
    try:
        history_service = get_analysis_history_service(db)
        history_service.track_analysis_deleted(
            user_id=current_user.id,
            analysis_id=analysis_id,
            deletion_details={
                'analysis_type': analysis.analysis_type,
                'provider': analysis.provider_name,
                'status_at_deletion': analysis.status
            }
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Failed to track analysis deletion in history: {str(e)}")

    return {"message": "Analysis deleted successfully"}

# Job Management Endpoints

@router.get("/{analysis_id}/status")
def get_analysis_status_endpoint(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """Get the status of an analysis including background job progress"""
    import logging
    import traceback

    logger = logging.getLogger(__name__)

    try:
        # Get basic analysis info directly from database
        service = AIAnalysisService(db)
        analysis = service.get_analysis(current_user.id, analysis_id)

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )

        # Build basic status info
        status_info = {
            "analysis_id": analysis.id,
            "status": analysis.status,
            "created_at": analysis.created_at.isoformat(),
            "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
            "error_message": analysis.error_message,
            "processing_time": analysis.processing_time,
            "cost": analysis.cost,
        }

        # Get associated job if exists
        from app.models.ai_analysis import AnalysisJob
        job = db.query(AnalysisJob).filter(
            AnalysisJob.analysis_id == analysis_id
        ).first()

        if job:
            status_info.update({
                "job_id": str(job.id),
                "job_status": job.status,
                "task_id": job.job_id,
                "retry_count": job.retry_count,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "job_completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "job_error_message": job.error_message
            })

            # If there's a Celery task, get its status
            if job.job_id:
                try:
                    task_result = celery_app.AsyncResult(job.job_id)
                    status_info["task_status"] = task_result.status

                    if task_result.info:
                        if isinstance(task_result.info, dict):
                            status_info["progress"] = task_result.info
                        else:
                            status_info["task_info"] = str(task_result.info)
                except Exception as e:
                    logger.warning(f"Failed to get Celery task status for {job.job_id}: {str(e)}")
                    status_info["task_error"] = str(e)

        logger.info(f"Retrieved status for analysis {analysis_id}: {analysis.status}")
        return status_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get analysis status for {analysis_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analysis status: {str(e)}"
        ) from e

@router.post("/{analysis_id}/cancel")
def cancel_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """Cancel a running analysis"""
    import logging
    import traceback

    logger = logging.getLogger(__name__)

    try:
        service = AIAnalysisService(db)
        analysis = service.get_analysis(current_user.id, analysis_id)

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )

        logger.info(f"Cancelling analysis {analysis_id} with status: {analysis.status}")

        # Allow cancellation of analyses that are pending, processing, or failed (in case they're stuck)
        if analysis.status not in ["pending", "processing", "failed"]:
            if analysis.status == "completed":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Analysis has already completed and cannot be cancelled"
                )
            elif analysis.status == "cancelled":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Analysis has already been cancelled"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Analysis cannot be cancelled in its current state: {analysis.status}"
                )

        # Get the job to find the task ID
        from app.models.ai_analysis import AnalysisJob
        job = db.query(AnalysisJob).filter(
            AnalysisJob.analysis_id == analysis_id
        ).first()

        cancelled_task = False
        if job and job.job_id:
            try:
                # Revoke the Celery task
                celery_app.control.revoke(job.job_id, terminate=True)
                logger.info(f"Revoked Celery task {job.job_id}")

                # Update job status
                job.status = "cancelled"
                job.completed_at = datetime.utcnow()
                cancelled_task = True
            except Exception as e:
                logger.warning(f"Failed to revoke Celery task {job.job_id}: {str(e)}")

        # Update analysis status regardless of Celery task status
        analysis.status = "cancelled"
        analysis.completed_at = datetime.utcnow()
        analysis.error_message = "Analysis cancelled by user"

        db.commit()

        message = "Analysis cancelled successfully"
        if not cancelled_task and job:
            message += " (background task may still be running)"

        logger.info(f"Successfully cancelled analysis {analysis_id}")
        return {"message": message}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel analysis {analysis_id}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel analysis: {str(e)}"
        ) from e

@router.get("/queue/status")
def get_queue_status(
    *,
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """Get the status of the analysis queue"""
    try:
        # Get queue information from Celery
        inspect = celery_app.control.inspect()

        # Get active tasks
        active_tasks = inspect.active()

        # Get queued tasks
        reserved_tasks = inspect.reserved()

        # Count tasks
        total_active = sum(len(tasks) for tasks in (active_tasks or {}).values())
        total_queued = sum(len(tasks) for tasks in (reserved_tasks or {}).values())

        return {
            "queue_name": "analysis",
            "active_tasks": total_active,
            "queued_tasks": total_queued,
            "total_pending": total_active + total_queued,
            "workers_available": len(active_tasks or {})
        }

    except Exception as e:
        return {
            "queue_name": "analysis",
            "error": f"Could not get queue status: {str(e)}",
            "active_tasks": 0,
            "queued_tasks": 0,
            "total_pending": 0,
            "workers_available": 0
        }

@router.get("/{analysis_id}/debug")
def debug_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """Debug endpoint to get detailed analysis information"""
    import logging

    logger = logging.getLogger(__name__)

    try:
        service = AIAnalysisService(db)
        analysis = service.get_analysis(current_user.id, analysis_id)

        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Analysis not found"
            )

        # Get associated job
        from app.models.ai_analysis import AnalysisJob
        job = db.query(AnalysisJob).filter(
            AnalysisJob.analysis_id == analysis_id
        ).first()

        # Get provider details
        provider_info = None
        if analysis.provider_id:
            provider = service.get_provider(current_user.id, analysis.provider_id)
            if provider:
                provider_info = {
                    "id": provider.id,
                    "name": provider.name,
                    "type": provider.type,
                    "enabled": provider.enabled,
                    "has_api_key": bool(provider.api_key_encrypted),
                    "endpoint": provider.endpoint,
                    "models": provider.models,
                    "default_model": provider.default_model
                }

        # Get health data info
        from sqlalchemy import and_

        from app.models.health_data import HealthData
        health_data_count = db.query(HealthData).filter(
            and_(
                HealthData.id.in_(analysis.health_data_ids),
                HealthData.user_id == analysis.user_id
            )
        ).count()

        debug_info = {
            "analysis": {
                "id": analysis.id,
                "status": analysis.status,
                "provider_name": analysis.provider_name,
                "provider_id": analysis.provider_id,
                "analysis_type": analysis.analysis_type,
                "health_data_ids": analysis.health_data_ids,
                "health_data_count": health_data_count,
                "created_at": analysis.created_at.isoformat(),
                "completed_at": analysis.completed_at.isoformat() if analysis.completed_at else None,
                "error_message": analysis.error_message,
                "model_used": analysis.model_used,
                "processing_time": analysis.processing_time,
                "cost": analysis.cost
            },
            "provider": provider_info,
            "job": None
        }

        if job:
            debug_info["job"] = {
                "id": str(job.id),
                "job_id": job.job_id,
                "status": job.status,
                "priority": job.priority,
                "retry_count": job.retry_count,
                "max_retries": job.max_retries,
                "created_at": job.created_at.isoformat(),
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
                "error_message": job.error_message
            }

            # Get Celery task status if available
            if job.job_id:
                try:
                    task_result = celery_app.AsyncResult(job.job_id)
                    debug_info["celery_task"] = {
                        "task_id": job.job_id,
                        "status": task_result.status,
                        "result": str(task_result.result) if task_result.result else None,
                        "info": task_result.info if task_result.info else None,
                        "traceback": task_result.traceback if hasattr(task_result, 'traceback') else None
                    }
                except Exception as e:
                    debug_info["celery_task"] = {"error": str(e)}

        return debug_info

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Debug endpoint error for analysis {analysis_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Debug failed: {str(e)}"
        ) from e
