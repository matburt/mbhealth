from typing import Any, List, Optional
from datetime import datetime
import csv
import io
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.health_data import HealthData, HealthDataCreate, HealthDataUpdate
from app.schemas.user import User
from app.api.deps import get_current_active_user
from app.services.health_data import (
    create_health_data,
    get_health_data,
    get_health_data_by_user,
    update_health_data,
    delete_health_data
)

router = APIRouter()

@router.post("/", response_model=HealthData)
def create_health_data_endpoint(
    *,
    db: Session = Depends(get_db),
    health_data_in: HealthDataCreate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Create new health data entry.
    """
    health_data = create_health_data(db, obj_in=health_data_in, user_id=current_user.id, user_timezone=current_user.timezone)
    return health_data

@router.get("/", response_model=List[HealthData])
def read_health_data(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    metric_type: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Retrieve health data entries.
    """
    health_data = get_health_data_by_user(
        db, 
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        metric_type=metric_type,
        start_date=start_date,
        end_date=end_date
    )
    return health_data

@router.get("/{health_data_id}", response_model=HealthData)
def read_health_data_by_id(
    *,
    db: Session = Depends(get_db),
    health_data_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Get health data by ID.
    """
    health_data = get_health_data(db, id=health_data_id)
    if not health_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health data not found",
        )
    if health_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    return health_data

@router.put("/{health_data_id}", response_model=HealthData)
def update_health_data_endpoint(
    *,
    db: Session = Depends(get_db),
    health_data_id: int,
    health_data_in: HealthDataUpdate,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Update health data entry.
    """
    health_data = get_health_data(db, id=health_data_id)
    if not health_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health data not found",
        )
    if health_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    health_data = update_health_data(db, db_obj=health_data, obj_in=health_data_in)
    return health_data

@router.delete("/{health_data_id}")
def delete_health_data_endpoint(
    *,
    db: Session = Depends(get_db),
    health_data_id: int,
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Delete health data entry.
    """
    health_data = get_health_data(db, id=health_data_id)
    if not health_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Health data not found",
        )
    if health_data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions",
        )
    delete_health_data(db, id=health_data_id)
    return {"message": "Health data deleted successfully"}

@router.get("/export/csv")
def export_health_data_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Export all health data for the current user as CSV.
    """
    from app.utils.timezone import utc_to_user_timezone
    
    # Get all health data for the user
    health_data = get_health_data_by_user(
        db, 
        user_id=current_user.id,
        skip=0,
        limit=10000  # Get a large number to get all data
    )
    
    # Create CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write headers
    headers = [
        "id", "metric_type", "value", "unit", "systolic", "diastolic", 
        "additional_data", "notes", "recorded_at", "created_at", "updated_at"
    ]
    writer.writerow(headers)
    
    # Write data rows
    for data in health_data:
        # Convert timestamps to user's timezone
        recorded_at_local = utc_to_user_timezone(data.recorded_at, current_user.timezone) if data.recorded_at else None
        created_at_local = utc_to_user_timezone(data.created_at, current_user.timezone)
        updated_at_local = utc_to_user_timezone(data.updated_at, current_user.timezone)
        
        row = [
            data.id,
            data.metric_type,
            data.value,
            data.unit,
            data.systolic,
            data.diastolic,
            str(data.additional_data) if data.additional_data else "",
            data.notes or "",
            recorded_at_local.isoformat() if recorded_at_local else "",
            created_at_local.isoformat(),
            updated_at_local.isoformat(),
        ]
        writer.writerow(row)
    
    # Create response
    output.seek(0)
    
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=health_data.csv"}
    )

@router.post("/import/csv")
def import_health_data_csv(
    *,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    Import health data from CSV file.
    """
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV file"
        )
    
    try:
        # Read CSV content
        content = file.file.read().decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(content))
        
        # Expected headers
        expected_headers = {
            "metric_type", "value", "unit", "recorded_at"
        }
        optional_headers = {
            "systolic", "diastolic", "additional_data", "notes"
        }
        
        # Validate headers
        csv_headers = set(csv_reader.fieldnames or [])
        if not expected_headers.issubset(csv_headers):
            missing_headers = expected_headers - csv_headers
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required headers: {missing_headers}"
            )
        
        imported_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 because header is row 1
            try:
                # Parse datetime
                recorded_at = None
                if row.get("recorded_at"):
                    try:
                        recorded_at = datetime.fromisoformat(row["recorded_at"].replace("Z", "+00:00"))
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid date format for recorded_at")
                        continue
                
                # Parse additional_data if present
                additional_data = None
                if row.get("additional_data"):
                    try:
                        import json
                        additional_data = json.loads(row["additional_data"])
                    except json.JSONDecodeError:
                        # If it's not valid JSON, treat as string
                        additional_data = {"raw": row["additional_data"]}
                
                # Create health data entry
                health_data_create = HealthDataCreate(
                    metric_type=row["metric_type"],
                    value=float(row["value"]),
                    unit=row["unit"],
                    systolic=float(row["systolic"]) if row.get("systolic") and row["systolic"].strip() else None,
                    diastolic=float(row["diastolic"]) if row.get("diastolic") and row["diastolic"].strip() else None,
                    additional_data=additional_data,
                    notes=row.get("notes") or None,
                    recorded_at=recorded_at
                )
                
                create_health_data(db, obj_in=health_data_create, user_id=current_user.id)
                imported_count += 1
                
            except ValueError as e:
                errors.append(f"Row {row_num}: Invalid number format - {str(e)}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "message": f"Successfully imported {imported_count} records",
            "imported_count": imported_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing CSV file: {str(e)}"
        )
    finally:
        file.file.close() 