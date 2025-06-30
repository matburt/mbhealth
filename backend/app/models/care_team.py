from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class CareTeam(Base):
    __tablename__ = "care_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("CareTeamMember", back_populates="care_team")

class CareTeamMember(Base):
    __tablename__ = "care_team_members"

    id = Column(Integer, primary_key=True, index=True)
    care_team_id = Column(Integer, ForeignKey("care_teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # doctor, nurse, caregiver, etc.
    can_view_data = Column(Boolean, default=True)
    can_add_notes = Column(Boolean, default=True)
    can_edit_data = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    care_team = relationship("CareTeam", back_populates="members")
    user = relationship("User", back_populates="care_teams")
