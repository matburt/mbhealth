from typing import Any, List, Dict
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import User
from app.schemas.ai_analysis import (
    AIProvider, AIProviderCreate, AIProviderUpdate, AIProviderWithoutKey,
    AIAnalysis, AIAnalysisCreate, AIAnalysisRequest, AIAnalysisResponse,
    ProviderTestRequest, ProviderTestResponse
)
from app.api.deps import get_current_active_user
from app.services.ai_analysis_service import AIAnalysisService
from app.services.ai_providers import ProviderFactory, AIProviderError
from app.tasks.ai_analysis import get_analysis_status
from app.core.celery_app import celery_app

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
        )

@router.get("/providers", response_model=List[AIProviderWithoutKey])
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
        )

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
def get_supported_provider_types() -> Dict[str, Any]:
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
    service = AIAnalysisService(db)
    
    # Convert request to create schema
    analysis_data = AIAnalysisCreate(
        health_data_ids=analysis_request.health_data_ids,
        analysis_type=analysis_request.analysis_type,
        provider_name=analysis_request.provider,
        additional_context=analysis_request.additional_context,
        provider_id=analysis_request.provider if len(analysis_request.provider) > 10 else None  # Assume UUID if long
    )
    
    try:
        analysis = await service.create_analysis(current_user.id, analysis_data)
        
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
        
    except AIProviderError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"AI provider error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )

@router.get("/", response_model=List[AIAnalysisResponse])
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
    success = service.delete_analysis(current_user.id, analysis_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
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
    try:
        # Get basic analysis info
        result = get_analysis_status.delay(analysis_id, current_user.id)
        status_info = result.get(timeout=5)  # 5 second timeout
        
        if "error" in status_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=status_info["error"]
            )
        
        # If there's a Celery task, get its status
        if status_info.get("task_id"):
            task_result = celery_app.AsyncResult(status_info["task_id"])
            status_info["task_status"] = task_result.status
            
            if task_result.info:
                if isinstance(task_result.info, dict):
                    status_info["progress"] = task_result.info
                else:
                    status_info["task_info"] = str(task_result.info)
        
        return status_info
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analysis status: {str(e)}"
        )

@router.post("/{analysis_id}/cancel")
def cancel_analysis(
    *,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    analysis_id: int
) -> Any:
    """Cancel a running analysis"""
    service = AIAnalysisService(db)
    analysis = service.get_analysis(current_user.id, analysis_id)
    
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )
    
    if analysis.status not in ["pending", "processing"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis cannot be cancelled in its current state"
        )
    
    try:
        # Get the job to find the task ID
        from app.models.ai_analysis import AnalysisJob
        job = db.query(AnalysisJob).filter(
            AnalysisJob.analysis_id == analysis_id
        ).first()
        
        if job and job.job_id:
            # Revoke the Celery task
            celery_app.control.revoke(job.job_id, terminate=True)
            
            # Update job status
            job.status = "cancelled"
            job.completed_at = datetime.utcnow()
        
        # Update analysis status
        analysis.status = "cancelled"
        analysis.completed_at = datetime.utcnow()
        analysis.error_message = "Analysis cancelled by user"
        
        db.commit()
        
        return {"message": "Analysis cancelled successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel analysis: {str(e)}"
        )

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