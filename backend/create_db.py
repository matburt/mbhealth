#!/usr/bin/env python3
"""
Database initialization script for MBHealth.
This script creates all database tables based on the SQLAlchemy models.
"""

from app.core.database import engine, Base
from app.models import *  # This ensures all models are registered

def create_database():
    """Create all database tables."""
    print("Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")
        raise

if __name__ == "__main__":
    create_database() 