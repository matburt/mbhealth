"""
Analysis Workflow API endpoints
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api import deps
from app.core.database import get_db
from app.models.user import User
from app.services.analysis_workflow_service import get_analysis_workflow_service

router = APIRouter()


# Request/Response Models
class WorkflowCreateRequest(BaseModel):
    name: str
    description: str | None = None
    trigger_analysis_type: str
    trigger_conditions: list[dict[str, Any]] = []
    workflow_steps: list[dict[str, Any]]
    auto_execute: bool = True
    max_concurrent_executions: int = 1
    enabled: bool = True


class WorkflowUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_conditions: list[dict[str, Any]] | None = None
    workflow_steps: list[dict[str, Any]] | None = None
    auto_execute: bool | None = None
    max_concurrent_executions: int | None = None
    enabled: bool | None = None


class WorkflowFromTemplateRequest(BaseModel):
    template_id: str
    name: str | None = None
    description: str | None = None
    trigger_conditions: list[dict[str, Any]] | None = None
    workflow_steps: list[dict[str, Any]] | None = None
    auto_execute: bool | None = None
    enabled: bool | None = None


class WorkflowResponse(BaseModel):
    id: str
    name: str
    description: str | None
    trigger_analysis_type: str
    trigger_conditions: list[dict[str, Any]]
    workflow_steps: list[dict[str, Any]]
    auto_execute: bool
    max_concurrent_executions: int
    enabled: bool
    total_executions: int
    successful_executions: int
    failed_executions: int
    last_executed_at: str | None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class WorkflowExecutionResponse(BaseModel):
    id: str
    workflow_id: str
    status: str
    execution_type: str
    current_step: int
    total_steps: int
    step_results: list[dict[str, Any]]
    created_analyses: list[int]
    error_message: str | None
    started_at: str
    completed_at: str | None

    class Config:
        from_attributes = True


class WorkflowTemplateResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str | None
    trigger_analysis_type: str
    trigger_conditions: list[dict[str, Any]]
    workflow_steps: list[dict[str, Any]]
    usage_count: int
    created_at: str

    class Config:
        from_attributes = True


# Workflow Management Endpoints
@router.post("/", response_model=WorkflowResponse)
async def create_workflow(
    workflow_data: WorkflowCreateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new analysis workflow"""
    workflow_service = get_analysis_workflow_service(db)

    workflow = await workflow_service.create_workflow(
        current_user.id,
        workflow_data.dict()
    )

    return WorkflowResponse.from_orm(workflow)


@router.get("/", response_model=list[WorkflowResponse])
async def get_workflows(
    enabled_only: bool = False,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workflows for the current user"""
    workflow_service = get_analysis_workflow_service(db)

    workflows = workflow_service.get_workflows(current_user.id, enabled_only)
    return [WorkflowResponse.from_orm(w) for w in workflows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workflow"""
    workflow_service = get_analysis_workflow_service(db)

    workflow = workflow_service.get_workflow(current_user.id, workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    return WorkflowResponse.from_orm(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a workflow"""
    workflow_service = get_analysis_workflow_service(db)

    workflow = await workflow_service.update_workflow(
        current_user.id,
        workflow_id,
        workflow_data.dict(exclude_unset=True)
    )

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    return WorkflowResponse.from_orm(workflow)


@router.delete("/{workflow_id}")
async def delete_workflow(
    workflow_id: str,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a workflow"""
    workflow_service = get_analysis_workflow_service(db)

    deleted = workflow_service.delete_workflow(current_user.id, workflow_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    return {"message": "Workflow deleted successfully"}


# Workflow Templates
@router.get("/templates/", response_model=list[WorkflowTemplateResponse])
async def get_workflow_templates(
    db: Session = Depends(get_db)
):
    """Get all available workflow templates"""
    workflow_service = get_analysis_workflow_service(db)

    templates = workflow_service.get_workflow_templates()
    return [WorkflowTemplateResponse.from_orm(t) for t in templates]


@router.post("/from-template/", response_model=WorkflowResponse)
async def create_workflow_from_template(
    template_data: WorkflowFromTemplateRequest,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a workflow from a template"""
    workflow_service = get_analysis_workflow_service(db)

    try:
        customizations = template_data.dict(exclude={"template_id"}, exclude_unset=True)
        workflow = await workflow_service.create_workflow_from_template(
            current_user.id,
            template_data.template_id,
            customizations if customizations else None
        )
        return WorkflowResponse.from_orm(workflow)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e


# Workflow Executions
@router.get("/{workflow_id}/executions", response_model=list[WorkflowExecutionResponse])
async def get_workflow_executions(
    workflow_id: str,
    limit: int = 50,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get execution history for a workflow"""
    workflow_service = get_analysis_workflow_service(db)

    # Verify user owns the workflow
    workflow = workflow_service.get_workflow(current_user.id, workflow_id)
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workflow not found"
        )

    executions = workflow_service.get_workflow_executions(
        current_user.id, workflow_id, limit
    )
    return [WorkflowExecutionResponse.from_orm(e) for e in executions]


@router.get("/executions/", response_model=list[WorkflowExecutionResponse])
async def get_all_workflow_executions(
    limit: int = 50,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all workflow executions for the current user"""
    workflow_service = get_analysis_workflow_service(db)

    executions = workflow_service.get_workflow_executions(
        current_user.id, None, limit
    )
    return [WorkflowExecutionResponse.from_orm(e) for e in executions]


@router.get("/statistics/", response_model=dict[str, Any])
async def get_workflow_statistics(
    days: int = 30,
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(get_db)
):
    """Get workflow statistics for the current user"""
    workflow_service = get_analysis_workflow_service(db)

    stats = workflow_service.get_workflow_statistics(current_user.id, days)
    return stats
