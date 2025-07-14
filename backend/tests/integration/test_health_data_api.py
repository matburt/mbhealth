"""
Comprehensive API endpoint tests for health data operations
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import HealthData, User
from main import app


@pytest.fixture
def client():
    """Test client for API requests"""
    return TestClient(app)


@pytest.fixture
def auth_headers(client, test_user):
    """Authenticated headers for API requests"""
    response = client.post(
        f"{settings.API_V1_STR}/auth/login",
        data={"username": test_user.email, "password": "testpassword"}
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def sample_health_data(db: Session, test_user: User):
    """Sample health data for testing"""
    health_data = []
    base_time = datetime.utcnow() - timedelta(days=30)
    
    # Create various health metrics over 30 days
    metrics = [
        {"type": "weight", "value": 70.5, "unit": "kg"},
        {"type": "blood_pressure", "value": 120, "systolic": 120, "diastolic": 80, "unit": "mmHg"},
        {"type": "heart_rate", "value": 72, "unit": "bpm"},
        {"type": "blood_sugar", "value": 95, "unit": "mg/dL"},
        {"type": "temperature", "value": 98.6, "unit": "°F"},
    ]
    
    for i in range(30):
        for j, metric in enumerate(metrics):
            data = HealthData(
                user_id=test_user.id,
                metric_type=metric["type"],
                value=metric["value"] + (i * 0.1),  # Small variation over time
                systolic=metric.get("systolic"),
                diastolic=metric.get("diastolic"),
                unit=metric["unit"],
                recorded_at=base_time + timedelta(days=i, hours=j),
                notes=f"Test data for day {i + 1}"
            )
            health_data.append(data)
            db.add(data)
    
    db.commit()
    return health_data


class TestHealthDataAPI:
    """Test health data CRUD operations"""

    def test_create_single_health_data(self, client, auth_headers):
        """Test creating a single health data entry"""
        
        health_data = {
            "metric_type": "weight",
            "value": 75.2,
            "unit": "kg",
            "notes": "Morning weight after exercise",
            "recorded_at": "2024-01-15T08:00:00Z"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/",
            headers=auth_headers,
            json=health_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["metric_type"] == "weight"
        assert data["value"] == 75.2
        assert data["unit"] == "kg"
        assert data["notes"] == "Morning weight after exercise"
        assert "id" in data
        assert "created_at" in data

    def test_create_blood_pressure_data(self, client, auth_headers):
        """Test creating blood pressure data with systolic/diastolic"""
        
        bp_data = {
            "metric_type": "blood_pressure",
            "value": 130,
            "systolic": 130,
            "diastolic": 85,
            "unit": "mmHg",
            "notes": "After morning coffee",
            "recorded_at": "2024-01-15T09:30:00Z"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/",
            headers=auth_headers,
            json=bp_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["metric_type"] == "blood_pressure"
        assert data["systolic"] == 130
        assert data["diastolic"] == 85
        assert data["value"] == 130

    def test_create_bulk_health_data(self, client, auth_headers):
        """Test creating multiple health data entries at once"""
        
        bulk_data = [
            {
                "metric_type": "weight",
                "value": 74.8,
                "unit": "kg",
                "recorded_at": "2024-01-15T08:00:00Z"
            },
            {
                "metric_type": "heart_rate",
                "value": 68,
                "unit": "bpm",
                "recorded_at": "2024-01-15T08:05:00Z"
            },
            {
                "metric_type": "blood_pressure",
                "value": 125,
                "systolic": 125,
                "diastolic": 82,
                "unit": "mmHg",
                "recorded_at": "2024-01-15T08:10:00Z"
            }
        ]
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/bulk",
            headers=auth_headers,
            json=bulk_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 3
        assert all("id" in item for item in data)
        assert data[0]["metric_type"] == "weight"
        assert data[1]["metric_type"] == "heart_rate"
        assert data[2]["metric_type"] == "blood_pressure"

    def test_get_health_data_list(self, client, auth_headers, sample_health_data):
        """Test retrieving health data list with pagination"""
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/?skip=0&limit=10",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 10
        assert all("metric_type" in item for item in data)
        assert all("value" in item for item in data)

    def test_get_health_data_by_type(self, client, auth_headers, sample_health_data):
        """Test filtering health data by metric type"""
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/?metric_type=weight",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert all(item["metric_type"] == "weight" for item in data)
        assert len(data) == 30  # 30 days of weight data

    def test_get_health_data_by_date_range(self, client, auth_headers, sample_health_data):
        """Test filtering health data by date range"""
        
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        end_date = datetime.utcnow().isoformat()
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/?start_date={start_date}&end_date={end_date}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify all data is within the date range
        for item in data:
            recorded_at = datetime.fromisoformat(item["recorded_at"].replace("Z", "+00:00"))
            assert recorded_at >= datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            assert recorded_at <= datetime.fromisoformat(end_date.replace("Z", "+00:00"))

    def test_get_single_health_data(self, client, auth_headers, sample_health_data):
        """Test retrieving a single health data entry"""
        
        # Get ID from sample data
        health_data_id = sample_health_data[0].id
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/{health_data_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == health_data_id
        assert "metric_type" in data
        assert "value" in data

    def test_update_health_data(self, client, auth_headers, sample_health_data):
        """Test updating a health data entry"""
        
        health_data_id = sample_health_data[0].id
        
        update_data = {
            "value": 75.0,
            "notes": "Updated measurement"
        }
        
        response = client.put(
            f"{settings.API_V1_STR}/health-data/{health_data_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["value"] == 75.0
        assert data["notes"] == "Updated measurement"
        assert data["id"] == health_data_id

    def test_delete_health_data(self, client, auth_headers, sample_health_data):
        """Test deleting a health data entry"""
        
        health_data_id = sample_health_data[-1].id
        
        response = client.delete(
            f"{settings.API_V1_STR}/health-data/{health_data_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        
        # Verify deletion by trying to get the deleted item
        response = client.get(
            f"{settings.API_V1_STR}/health-data/{health_data_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 404

    def test_get_health_data_statistics(self, client, auth_headers, sample_health_data):
        """Test getting health data statistics"""
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/statistics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        stats = response.json()
        
        assert "total_entries" in stats
        assert "metric_types" in stats
        assert "date_range" in stats
        assert stats["total_entries"] > 0
        assert len(stats["metric_types"]) == 5  # weight, bp, hr, bs, temp

    def test_get_health_data_trends(self, client, auth_headers, sample_health_data):
        """Test getting health data trends"""
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/trends?metric_type=weight&days=30",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        trends = response.json()
        
        assert "metric_type" in trends
        assert "trend_direction" in trends
        assert "average_value" in trends
        assert "data_points" in trends
        assert trends["metric_type"] == "weight"

    def test_export_health_data(self, client, auth_headers, sample_health_data):
        """Test exporting health data"""
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/export/csv",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        
        # Test JSON export
        response = client.get(
            f"{settings.API_V1_STR}/health-data/export/json",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "health_data" in data
        assert "export_info" in data
        assert len(data["health_data"]) > 0

    def test_health_data_validation_errors(self, client, auth_headers):
        """Test validation errors for invalid health data"""
        
        # Test missing required fields
        invalid_data = {
            "metric_type": "",
            "unit": "kg"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/",
            headers=auth_headers,
            json=invalid_data
        )
        
        assert response.status_code == 422
        
        # Test invalid value range
        invalid_data = {
            "metric_type": "weight",
            "value": -5,  # Negative weight
            "unit": "kg"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/",
            headers=auth_headers,
            json=invalid_data
        )
        
        assert response.status_code == 422

    def test_blood_pressure_validation(self, client, auth_headers):
        """Test blood pressure specific validation"""
        
        # Test systolic/diastolic validation
        invalid_bp = {
            "metric_type": "blood_pressure",
            "value": 120,
            "systolic": 300,  # Too high
            "diastolic": 200,  # Too high
            "unit": "mmHg"
        }
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/",
            headers=auth_headers,
            json=invalid_bp
        )
        
        assert response.status_code == 422

    def test_unauthorized_access(self, client):
        """Test that endpoints require authentication"""
        
        response = client.get(f"{settings.API_V1_STR}/health-data/")
        assert response.status_code == 401
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/",
            json={"metric_type": "weight", "value": 70, "unit": "kg"}
        )
        assert response.status_code == 401

    def test_user_data_isolation(self, client, db, sample_health_data):
        """Test that users can only access their own data"""
        
        # Create second user
        from app.models import User
        from app.core.security import get_password_hash
        
        user2 = User(
            email="user2@test.com",
            hashed_password=get_password_hash("password"),
            full_name="User Two",
            is_active=True
        )
        db.add(user2)
        db.commit()
        
        # Login as second user
        response = client.post(
            f"{settings.API_V1_STR}/auth/login",
            data={"username": "user2@test.com", "password": "password"}
        )
        user2_token = response.json()["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}
        
        # Try to access first user's data
        health_data_id = sample_health_data[0].id
        response = client.get(
            f"{settings.API_V1_STR}/health-data/{health_data_id}",
            headers=user2_headers
        )
        
        assert response.status_code == 404  # Should not find other user's data

    def test_health_data_search(self, client, auth_headers, sample_health_data):
        """Test searching health data by notes and content"""
        
        response = client.get(
            f"{settings.API_V1_STR}/health-data/search?q=Test data",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert all("Test data" in item.get("notes", "") for item in data)

    def test_health_data_aggregation(self, client, auth_headers, sample_health_data):
        """Test health data aggregation endpoints"""
        
        # Test daily aggregation
        response = client.get(
            f"{settings.API_V1_STR}/health-data/aggregate/daily?metric_type=weight&days=7",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "aggregations" in data
        assert len(data["aggregations"]) <= 7
        
        # Test weekly aggregation
        response = client.get(
            f"{settings.API_V1_STR}/health-data/aggregate/weekly?metric_type=heart_rate&weeks=4",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "aggregations" in data

    def test_health_data_import(self, client, auth_headers):
        """Test importing health data from CSV"""
        
        csv_content = """metric_type,value,unit,recorded_at,notes
weight,75.5,kg,2024-01-15T08:00:00Z,Imported data
heart_rate,72,bpm,2024-01-15T08:05:00Z,Imported data
"""
        
        files = {"file": ("data.csv", csv_content, "text/csv")}
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/import/csv",
            headers=auth_headers,
            files=files
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "imported_count" in result
        assert result["imported_count"] == 2

    def test_health_data_backup(self, client, auth_headers, sample_health_data):
        """Test creating a backup of all health data"""
        
        response = client.post(
            f"{settings.API_V1_STR}/health-data/backup",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        backup = response.json()
        assert "backup_id" in backup
        assert "created_at" in backup
        assert "total_records" in backup
        assert backup["total_records"] > 0