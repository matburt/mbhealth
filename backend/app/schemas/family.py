from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class FamilyBase(BaseModel):
    name: str
    description: Optional[str] = None

class FamilyCreate(FamilyBase):
    pass

class FamilyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

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