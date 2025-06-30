from datetime import datetime
from typing import Any

from pydantic import BaseModel


class HealthDataBase(BaseModel):
    metric_type: str
    value: float
    unit: str
    systolic: float | None = None
    diastolic: float | None = None
    additional_data: dict[str, Any] | None = None
    notes: str | None = None
    recorded_at: datetime | None = None

class HealthDataCreate(HealthDataBase):
    pass

class HealthDataUpdate(BaseModel):
    metric_type: str | None = None
    value: float | None = None
    unit: str | None = None
    systolic: float | None = None
    diastolic: float | None = None
    additional_data: dict[str, Any] | None = None
    notes: str | None = None
    recorded_at: datetime | None = None

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
