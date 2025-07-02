"""
Integration tests for health data endpoints.
"""
from datetime import datetime, timedelta

import pytest


class TestHealthDataEndpoints:
    """Test health data API endpoints."""
    
    def test_create_health_data(self, authenticated_client, sample_health_data):
        """Test creating health data."""
        response = authenticated_client.post("/api/v1/health-data/", json=sample_health_data)
        
        assert response.status_code == 201
        data = response.json()
        assert data["metric_type"] == sample_health_data["metric_type"]
        assert data["value"] == sample_health_data["value"]
        assert data["unit"] == sample_health_data["unit"]
        assert "id" in data
        assert "user_id" in data
    
    def test_get_health_data_list(self, authenticated_client, sample_health_data):
        """Test getting list of health data."""
        # First create some health data
        authenticated_client.post("/api/v1/health-data/", json=sample_health_data)
        
        response = authenticated_client.get("/api/v1/health-data/")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["metric_type"] == sample_health_data["metric_type"]
    
    def test_get_health_data_by_id(self, authenticated_client, sample_health_data):
        """Test getting specific health data by ID."""
        # Create health data
        create_response = authenticated_client.post("/api/v1/health-data/", json=sample_health_data)
        created_id = create_response.json()["id"]
        
        # Get the specific health data
        response = authenticated_client.get(f"/api/v1/health-data/{created_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == created_id
        assert data["metric_type"] == sample_health_data["metric_type"]
    
    def test_update_health_data(self, authenticated_client, sample_health_data):
        """Test updating health data."""
        # Create health data
        create_response = authenticated_client.post("/api/v1/health-data/", json=sample_health_data)
        created_id = create_response.json()["id"]
        
        # Update the health data
        update_data = {
            "value": 130.0,
            "notes": "Updated reading"
        }
        response = authenticated_client.put(f"/api/v1/health-data/{created_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["value"] == 130.0
        assert data["notes"] == "Updated reading"
    
    def test_delete_health_data(self, authenticated_client, sample_health_data):
        """Test deleting health data."""
        # Create health data
        create_response = authenticated_client.post("/api/v1/health-data/", json=sample_health_data)
        created_id = create_response.json()["id"]
        
        # Delete the health data
        response = authenticated_client.delete(f"/api/v1/health-data/{created_id}")
        
        assert response.status_code == 200
        
        # Verify it's deleted
        get_response = authenticated_client.get(f"/api/v1/health-data/{created_id}")
        assert get_response.status_code == 404
    
    def test_filter_health_data_by_metric_type(self, authenticated_client):
        """Test filtering health data by metric type."""
        # Create different types of health data
        blood_pressure_data = {
            "metric_type": "blood_pressure",
            "value": 120.0,
            "unit": "mmHg",
            "recorded_at": datetime.utcnow().isoformat()
        }
        weight_data = {
            "metric_type": "weight",
            "value": 70.0,
            "unit": "kg",
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        authenticated_client.post("/api/v1/health-data/", json=blood_pressure_data)
        authenticated_client.post("/api/v1/health-data/", json=weight_data)
        
        # Filter by blood pressure
        response = authenticated_client.get("/api/v1/health-data/?metric_type=blood_pressure")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        assert all(item["metric_type"] == "blood_pressure" for item in data)
    
    def test_filter_health_data_by_date_range(self, authenticated_client):
        """Test filtering health data by date range."""
        # Create health data with different dates
        old_data = {
            "metric_type": "weight",
            "value": 70.0,
            "unit": "kg",
            "recorded_at": (datetime.utcnow() - timedelta(days=10)).isoformat()
        }
        recent_data = {
            "metric_type": "weight",
            "value": 71.0,
            "unit": "kg",
            "recorded_at": datetime.utcnow().isoformat()
        }
        
        authenticated_client.post("/api/v1/health-data/", json=old_data)
        authenticated_client.post("/api/v1/health-data/", json=recent_data)
        
        # Filter by last 7 days
        start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
        response = authenticated_client.get(f"/api/v1/health-data/?start_date={start_date}")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # Should only include recent data
        assert all(
            datetime.fromisoformat(item["recorded_at"].replace("Z", "+00:00")) >= 
            datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            for item in data
        )
    
    def test_unauthorized_access_health_data(self, client):
        """Test accessing health data without authentication."""
        response = client.get("/api/v1/health-data/")
        
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]
    
    def test_health_data_validation(self, authenticated_client):
        """Test health data validation."""
        invalid_data = {
            "metric_type": "",  # Empty metric type
            "value": "not_a_number",  # Invalid value type
            "unit": "",  # Empty unit
        }
        
        response = authenticated_client.post("/api/v1/health-data/", json=invalid_data)
        
        assert response.status_code == 422  # Validation error