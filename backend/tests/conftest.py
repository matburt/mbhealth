"""
Pytest configuration and shared fixtures for MBHealth backend tests.
"""
import asyncio
import pytest
import tempfile
import os
from typing import AsyncGenerator, Generator
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.models.user import User
from app.core.security import get_password_hash
from app.api.deps import get_current_user


# Test database setup
@pytest.fixture(scope="session")
def test_db_engine():
    """Create a test database engine using SQLite in-memory."""
    # Use SQLite in-memory database for tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture(scope="function")
def test_db_session(test_db_engine):
    """Create a test database session."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(test_db_session):
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield test_db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def test_user(test_db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        full_name="Test User",
        is_active=True,
    )
    test_db_session.add(user)
    test_db_session.commit()
    test_db_session.refresh(user)
    return user


@pytest.fixture
def authenticated_client(client, test_user):
    """Create an authenticated test client."""
    # Mock the get_current_user dependency
    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_current_user] = override_get_current_user
    
    try:
        yield client
    finally:
        if get_current_user in app.dependency_overrides:
            del app.dependency_overrides[get_current_user]


@pytest.fixture
def sample_health_data():
    """Sample health data for testing."""
    return {
        "metric_type": "blood_pressure",
        "value": 120.0,
        "unit": "mmHg",
        "recorded_at": "2024-01-01T10:00:00Z",
        "notes": "Morning reading"
    }


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


# Utility fixtures for common test scenarios
@pytest.fixture
def temp_file():
    """Create a temporary file for testing."""
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(b"test content")
        tmp.flush()
        yield tmp.name
    os.unlink(tmp.name)


@pytest.fixture
def mock_ai_response():
    """Mock AI response for testing AI analysis."""
    return {
        "analysis_type": "general",
        "response_content": "Test AI analysis response",
        "confidence_score": 0.85,
        "key_insights": ["Test insight 1", "Test insight 2"],
        "recommendations": ["Test recommendation 1"],
        "data_quality_score": 0.9
    }