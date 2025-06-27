from sqlalchemy import Column, Integer, String, DateTime, Float, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class HealthData(Base):
    __tablename__ = "health_data"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    metric_type = Column(String, nullable=False)  # blood_pressure, blood_sugar, weight, etc.
    value = Column(Float, nullable=False)
    unit = Column(String, nullable=False)  # mmHg, mg/dL, kg, etc.
    systolic = Column(Float, nullable=True)  # For blood pressure
    diastolic = Column(Float, nullable=True)  # For blood pressure
    additional_data = Column(JSON, nullable=True)  # For flexible additional data
    notes = Column(Text, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="health_data")
    health_notes = relationship("Note", back_populates="health_data") 