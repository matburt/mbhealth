from typing import Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.health_data import HealthData
from app.schemas.health_data import HealthDataCreate, HealthDataUpdate
from app.utils.timezone import user_timezone_to_utc

def get_health_data(db: Session, id: int) -> Optional[HealthData]:
    return db.query(HealthData).filter(HealthData.id == id).first()

def get_health_data_by_user(
    db: Session, 
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    metric_type: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> List[HealthData]:
    query = db.query(HealthData).filter(HealthData.user_id == user_id)
    
    if metric_type:
        query = query.filter(HealthData.metric_type == metric_type)
    
    if start_date:
        query = query.filter(HealthData.recorded_at >= start_date)
    
    if end_date:
        query = query.filter(HealthData.recorded_at <= end_date)
    
    return query.order_by(HealthData.recorded_at.desc()).offset(skip).limit(limit).all()

def create_health_data(db: Session, *, obj_in: HealthDataCreate, user_id: int, user_timezone: Optional[str] = None) -> HealthData:
    db_obj = HealthData(
        user_id=user_id,
        metric_type=obj_in.metric_type,
        value=obj_in.value,
        unit=obj_in.unit,
        systolic=obj_in.systolic,
        diastolic=obj_in.diastolic,
        additional_data=obj_in.additional_data,
        notes=obj_in.notes,
        recorded_at=user_timezone_to_utc(obj_in.recorded_at, user_timezone) if obj_in.recorded_at else datetime.utcnow(),
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_health_data(db: Session, *, db_obj: HealthData, obj_in: HealthDataUpdate) -> HealthData:
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_obj, field, value)
    
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def delete_health_data(db: Session, *, id: int) -> HealthData:
    obj = db.query(HealthData).get(id)
    db.delete(obj)
    db.commit()
    return obj 