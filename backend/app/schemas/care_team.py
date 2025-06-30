from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


class UserInfo(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    email: str

    class Config:
        from_attributes = True


class CareTeamBase(BaseModel):
    name: str
    description: Optional[str] = None
    specialty: Optional[str] = None


class CareTeamCreate(CareTeamBase):
    pass


class CareTeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    specialty: Optional[str] = None


class CareTeamOut(CareTeamBase):
    id: int
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CareTeamMemberBase(BaseModel):
    user_id: int
    role: str  # admin, provider, viewer
    specialty: Optional[str] = None


class CareTeamMemberCreate(CareTeamMemberBase):
    pass


class CareTeamMemberUpdate(BaseModel):
    role: Optional[str] = None
    specialty: Optional[str] = None


class CareTeamMemberOut(CareTeamMemberBase):
    id: int
    care_team_id: int
    joined_at: datetime
    user: UserInfo

    class Config:
        from_attributes = True


class CareTeamInviteCreate(BaseModel):
    care_team_id: int
    email: EmailStr
    role: str  # provider, viewer
    specialty: Optional[str] = None


class CareTeamInvitationOut(BaseModel):
    id: int
    care_team_id: int
    email: str
    role: str
    specialty: Optional[str] = None
    status: str  # pending, accepted, declined
    created_at: datetime
    care_team: CareTeamOut

    class Config:
        from_attributes = True
