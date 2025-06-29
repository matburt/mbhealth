from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str | None = None
    timezone: str | None = "America/New_York"
    ai_context_profile: str | None = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: EmailStr | None = None
    username: str | None = None
    full_name: str | None = None
    timezone: str | None = None
    ai_context_profile: str | None = None
    password: str | None = None

class UserInDBBase(UserBase):
    id: int
    timezone: str
    ai_context_profile: str | None = None
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
