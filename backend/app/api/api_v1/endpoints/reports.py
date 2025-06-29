"""
Reports API endpoints for generating and exporting health data reports.
"""

import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.celery_app import celery_app
from app.models.health_data import HealthData
from app.models.user import User
from app.services.pdf_report_service import pdf_report_service

router = APIRouter()


class PDFReportRequest(BaseModel):
    """Request model for PDF report generation."""
    start_date: datetime
    end_date: datetime
    metric_types: list[str] | None = None
    include_charts: bool = True
    include_summary: bool = True
    include_trends: bool = True
    title: str | None = None


class ReportJobResponse(BaseModel):
    """Response model for report generation job."""
    job_id: str
    status: str
    message: str


@router.post("/export/pdf", response_class=StreamingResponse)
async def export_pdf_report(
    request: PDFReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate and download a PDF report of health data visualizations.
    
    Args:
        request: PDF report configuration
        current_user: Authenticated user
        db: Database session
        
    Returns:
        StreamingResponse: PDF file download
    """
    try:
        # Validate date range
        if request.start_date >= request.end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before end date"
            )

        # Check if date range is reasonable (not too large)
        date_diff = request.end_date - request.start_date
        if date_diff.days > 365:
            raise HTTPException(
                status_code=400,
                detail="Date range cannot exceed 365 days"
            )

        # Query health data for the user and date range
        health_data_query = db.query(HealthData).filter(
            HealthData.user_id == current_user.id,
            HealthData.recorded_at >= request.start_date,
            HealthData.recorded_at <= request.end_date
        )

        # Filter by metric types if specified
        if request.metric_types:
            health_data_query = health_data_query.filter(
                HealthData.metric_type.in_(request.metric_types)
            )

        health_data = health_data_query.order_by(HealthData.recorded_at).all()

        if not health_data:
            raise HTTPException(
                status_code=404,
                detail="No health data found for the specified criteria"
            )

        # Generate PDF report
        pdf_bytes = await pdf_report_service.generate_health_report(
            user_id=current_user.id,
            health_data=health_data,
            date_range=(request.start_date, request.end_date),
            metric_types=request.metric_types,
            include_charts=request.include_charts,
            include_summary=request.include_summary,
            include_trends=request.include_trends,
            user_timezone=current_user.timezone,
            db_session=db
        )

        # Create filename
        date_str = request.start_date.strftime("%Y%m%d")
        end_date_str = request.end_date.strftime("%Y%m%d")
        filename = f"health_report_{date_str}_to_{end_date_str}.pdf"

        # Return PDF as streaming response
        pdf_stream = io.BytesIO(pdf_bytes)

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_bytes))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF report: {str(e)}"
        )


@router.post("/export/pdf/async", response_model=ReportJobResponse)
async def export_pdf_report_async(
    request: PDFReportRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a PDF report asynchronously for large datasets.
    
    Args:
        request: PDF report configuration
        current_user: Authenticated user
        db: Database session
        
    Returns:
        ReportJobResponse: Job information for tracking progress
    """
    try:
        # Validate date range
        if request.start_date >= request.end_date:
            raise HTTPException(
                status_code=400,
                detail="Start date must be before end date"
            )

        # Queue the PDF generation task
        task = celery_app.send_task(
            "app.tasks.generate_pdf_report",
            args=[
                current_user.id,
                request.start_date.isoformat(),
                request.end_date.isoformat(),
                request.metric_types,
                request.include_charts,
                request.include_summary,
                request.include_trends
            ]
        )

        return ReportJobResponse(
            job_id=task.id,
            status="queued",
            message="PDF report generation has been queued. Check status using the job ID."
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to queue PDF report generation: {str(e)}"
        )


@router.get("/export/pdf/status/{job_id}")
async def get_pdf_report_status(
    job_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the status of an async PDF report generation job.
    
    Args:
        job_id: Celery task ID
        current_user: Authenticated user
        
    Returns:
        Job status and result information
    """
    try:
        # Get task result
        result = celery_app.AsyncResult(job_id)

        if result.state == "PENDING":
            return {
                "job_id": job_id,
                "status": "pending",
                "message": "Task is waiting to be processed"
            }
        elif result.state == "PROGRESS":
            return {
                "job_id": job_id,
                "status": "in_progress",
                "message": "PDF report is being generated",
                "progress": result.info.get("progress", 0)
            }
        elif result.state == "SUCCESS":
            return {
                "job_id": job_id,
                "status": "completed",
                "message": "PDF report generated successfully",
                "download_url": f"/api/v1/reports/export/pdf/download/{job_id}"
            }
        elif result.state == "FAILURE":
            return {
                "job_id": job_id,
                "status": "failed",
                "message": f"PDF generation failed: {str(result.info)}"
            }
        else:
            return {
                "job_id": job_id,
                "status": result.state.lower(),
                "message": f"Task status: {result.state}"
            }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get job status: {str(e)}"
        )


@router.get("/export/pdf/download/{job_id}", response_class=StreamingResponse)
async def download_pdf_report(
    job_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Download a completed PDF report from async generation.
    
    Args:
        job_id: Celery task ID
        current_user: Authenticated user
        
    Returns:
        StreamingResponse: PDF file download
    """
    try:
        # Get task result
        result = celery_app.AsyncResult(job_id)

        if result.state != "SUCCESS":
            raise HTTPException(
                status_code=404,
                detail="PDF report is not ready or does not exist"
            )

        # Get PDF bytes from task result
        pdf_data = result.get()
        if not pdf_data:
            raise HTTPException(
                status_code=404,
                detail="PDF data not found"
            )

        # Create filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"health_report_{timestamp}.pdf"

        return StreamingResponse(
            io.BytesIO(pdf_data),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Length": str(len(pdf_data))
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to download PDF report: {str(e)}"
        )


@router.get("/templates")
async def get_report_templates(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get available report templates.
    
    Args:
        current_user: Authenticated user
        
    Returns:
        List of available report templates
    """
    templates = [
        {
            "id": "comprehensive",
            "name": "Comprehensive Health Report",
            "description": "Complete analysis with all metrics, charts, and trends",
            "includes": ["charts", "summary", "trends", "clinical_notes"],
            "recommended_for": ["doctor_visits", "specialist_referrals"]
        },
        {
            "id": "summary",
            "name": "Health Summary",
            "description": "Quick overview with key statistics",
            "includes": ["summary", "key_charts"],
            "recommended_for": ["personal_review", "family_sharing"]
        },
        {
            "id": "trends",
            "name": "Trend Analysis Report",
            "description": "Focus on data trends and patterns over time",
            "includes": ["charts", "trends", "statistical_analysis"],
            "recommended_for": ["progress_tracking", "medication_monitoring"]
        },
        {
            "id": "clinical",
            "name": "Clinical Reference Report",
            "description": "Medical-focused report with clinical annotations",
            "includes": ["charts", "summary", "trends", "clinical_notes", "reference_ranges"],
            "recommended_for": ["healthcare_providers", "medical_records"]
        }
    ]

    return {"templates": templates}


@router.get("/metrics/available")
async def get_available_metrics(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get available metrics for the current user.
    
    Args:
        current_user: Authenticated user
        db: Database session
        
    Returns:
        List of metric types available for the user
    """
    try:
        # Query distinct metric types for the user
        metrics = db.query(HealthData.metric_type).filter(
            HealthData.user_id == current_user.id
        ).distinct().all()

        metric_types = [metric[0] for metric in metrics]

        # Add display names and descriptions
        metric_info = []
        metric_descriptions = {
            "blood_pressure": {
                "display_name": "Blood Pressure",
                "description": "Systolic and diastolic blood pressure measurements",
                "unit": "mmHg"
            },
            "blood_sugar": {
                "display_name": "Blood Sugar",
                "description": "Blood glucose level measurements",
                "unit": "mg/dL"
            },
            "weight": {
                "display_name": "Weight",
                "description": "Body weight measurements",
                "unit": "kg/lbs"
            },
            "heart_rate": {
                "display_name": "Heart Rate",
                "description": "Heart rate measurements",
                "unit": "bpm"
            },
            "temperature": {
                "display_name": "Temperature",
                "description": "Body temperature measurements",
                "unit": "°F/°C"
            }
        }

        for metric_type in metric_types:
            info = metric_descriptions.get(metric_type, {
                "display_name": metric_type.replace("_", " ").title(),
                "description": f"{metric_type.replace('_', ' ').title()} measurements",
                "unit": "units"
            })

            metric_info.append({
                "type": metric_type,
                **info
            })

        return {"metrics": metric_info}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get available metrics: {str(e)}"
        )
