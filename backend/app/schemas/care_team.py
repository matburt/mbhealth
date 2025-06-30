from datetime import datetime

from pydantic import BaseModel


class CareTeamBase(BaseModel):
    name: str
    description: str | None = None

class CareTeamCreate(CareTeamBase):
    pass

class CareTeamUpdate(BaseModel):
    name: str | None = None
    description: str | None = None

class CareTeamOut(CareTeamBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

class CareTeamMemberBase(BaseModel):
    user_id: int
    role: str
    can_view_data: bool = True
    can_add_notes: bool = True
    can_edit_data: bool = False

class CareTeamMemberCreate(CareTeamMemberBase):
    pass

class CareTeamMemberOut(CareTeamMemberBase):
    id: int
    care_team_id: int
    class Config:
        from_attributes = True
