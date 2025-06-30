from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, validator

# Valid unit options
WeightUnit = Literal["kg", "lbs"]
TemperatureUnit = Literal["c", "f"]
HeightUnit = Literal["cm", "ft"]


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str | None = None
    timezone: str | None = "America/New_York"
    ai_context_profile: str | None = None
    weight_unit: WeightUnit = "lbs"
    temperature_unit: TemperatureUnit = "f"
    height_unit: HeightUnit = "ft"

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    timezone: str | None = None
    ai_context_profile: str | None = None
    weight_unit: WeightUnit | None = None
    temperature_unit: TemperatureUnit | None = None
    height_unit: HeightUnit | None = None
    password: str | None = None

class UserInDBBase(UserBase):
    id: int
    timezone: str
    ai_context_profile: str | None = None
    weight_unit: WeightUnit
    temperature_unit: TemperatureUnit
    height_unit: HeightUnit
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class User(UserInDBBase):
    pass

class UserInDB(UserInDBBase):
    hashed_password: str
