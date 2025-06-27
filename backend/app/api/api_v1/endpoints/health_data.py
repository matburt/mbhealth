from typing import Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
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
    health_data = create_health_data(db, obj_in=health_data_in, user_id=current_user.id)
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