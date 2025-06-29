from datetime import datetime

from pydantic import BaseModel


class FamilyBase(BaseModel):
    name: str
    description: str | None = None

class FamilyCreate(FamilyBase):
    pass

class FamilyUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class FamilyOut(FamilyBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class FamilyMemberBase(BaseModel):
    user_id: int
    role: str
    can_view_data: bool = True
    can_add_notes: bool = True
    can_edit_data: bool = False

class FamilyMemberCreate(FamilyMemberBase):
    pass

class FamilyMemberOut(FamilyMemberBase):
    id: int
    family_id: int
    class Config:
        from_attributes = True
