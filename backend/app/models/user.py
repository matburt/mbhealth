from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    timezone = Column(String, default="America/New_York", nullable=False)  # User's timezone preference
    ai_context_profile = Column(Text, nullable=True)  # Additional context for AI analysis
    
    # Unit Preferences
    weight_unit = Column(String, default="lbs", nullable=False)  # "kg" or "lbs"
    temperature_unit = Column(String, default="f", nullable=False)  # "c" or "f"
    height_unit = Column(String, default="ft", nullable=False)  # "cm" or "ft"
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    health_data = relationship("HealthData", back_populates="user")
    families = relationship("FamilyMember", back_populates="user")
    care_teams = relationship("CareTeamMember", back_populates="user")
    notes = relationship("Note", back_populates="user")
    ai_providers = relationship("AIProvider", back_populates="user")
    ai_analyses = relationship("AIAnalysis", back_populates="user")
    analysis_settings = relationship("AnalysisSettings", back_populates="user", uselist=False)
    analysis_schedules = relationship("AnalysisSchedule", back_populates="user")
    analysis_workflows = relationship("AnalysisWorkflow", back_populates="user")
    notification_channels = relationship("NotificationChannel", back_populates="user")
    notification_preferences = relationship("NotificationPreference", back_populates="user")
    notification_history = relationship("NotificationHistory", back_populates="user")
