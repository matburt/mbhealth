from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class CareTeam(Base):
    __tablename__ = "care_teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    specialty = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    members = relationship("CareTeamMember", back_populates="care_team", cascade="all, delete-orphan")
    invitations = relationship("CareTeamInvitation", back_populates="care_team", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class CareTeamMember(Base):
    __tablename__ = "care_team_members"

    id = Column(Integer, primary_key=True, index=True)
    care_team_id = Column(Integer, ForeignKey("care_teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, nullable=False)  # admin, provider, viewer
    specialty = Column(String, nullable=True)
    joined_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    care_team = relationship("CareTeam", back_populates="members")
    user = relationship("User")


class CareTeamInvitation(Base):
    __tablename__ = "care_team_invitations"

    id = Column(Integer, primary_key=True, index=True)
    care_team_id = Column(Integer, ForeignKey("care_teams.id"), nullable=False)
    email = Column(String, nullable=False)
    role = Column(String, nullable=False)  # provider, viewer
    specialty = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, accepted, declined
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    care_team = relationship("CareTeam", back_populates="invitations")
