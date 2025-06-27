from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class HealthDataBase(BaseModel):
    metric_type: str
    value: float
    unit: str
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    additional_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None

class HealthDataCreate(HealthDataBase):
    pass

class HealthDataUpdate(BaseModel):
    metric_type: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    systolic: Optional[float] = None
    diastolic: Optional[float] = None
    additional_data: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    recorded_at: Optional[datetime] = None

class HealthDataInDBBase(HealthDataBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class HealthData(HealthDataInDBBase):
    pass

class HealthDataWithUser(HealthData):
    user: "User"

# Import User to avoid circular imports
from app.schemas.user import User
HealthDataWithUser.model_rebuild() 