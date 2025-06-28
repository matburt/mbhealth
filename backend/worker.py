#!/usr/bin/env python3
"""
Celery worker startup script for MBHealth AI analysis processing.
"""

from app.core.celery_app import celery_app

if __name__ == "__main__":
    celery_app.start()