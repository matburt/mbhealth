"""
Integration tests for AI analysis workflow covering end-to-end scenarios
"""

from datetime import datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import AIProvider, HealthData, User
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
def test_provider(db: Session, test_user: User):
    """Test AI provider"""
    provider = AIProvider(
        name="Test OpenAI",
        provider_type="openai",
        model="gpt-4-turbo",
        api_key_encrypted=b"encrypted_test_key",
        is_active=True,
        user_id=test_user.id
    )
    db.add(provider)
    db.commit()
    db.refresh(provider)
    return provider


@pytest.fixture
def sample_health_data(db: Session, test_user: User):
    """Sample health data for analysis"""
    health_data = []
    base_time = datetime.utcnow() - timedelta(days=7)

    # Blood pressure readings over a week
    for i in range(7):
        data = HealthData(
            user_id=test_user.id,
            metric_type="blood_pressure",
            value=120 + i,
            systolic=120 + i,
            diastolic=80 + i // 2,
            unit="mmHg",
            recorded_at=base_time + timedelta(days=i),
            notes=f"Day {i + 1} reading"
        )
        health_data.append(data)
        db.add(data)

    db.commit()
    return health_data


class TestAIAnalysisWorkflow:
    """Test complete AI analysis workflow"""

    def test_create_provider_and_analysis_workflow(self, client, auth_headers, db):
        """Test creating a provider and running analysis"""

        # Step 1: Create AI provider
        provider_data = {
            "name": "Test GPT-4",
            "provider_type": "openai",
            "model": "gpt-4-turbo",
            "api_key": "test-api-key-123",
            "base_url": None,
            "is_active": True
        }

        response = client.post(
            f"{settings.API_V1_STR}/ai-providers/",
            headers=auth_headers,
            json=provider_data
        )

        assert response.status_code == 200
        provider = response.json()
        assert provider["name"] == "Test GPT-4"
        assert provider["is_active"] is True

        # Step 2: Test provider connection
        response = client.post(
            f"{settings.API_V1_STR}/ai-providers/{provider['id']}/test",
            headers=auth_headers
        )

        # Should handle test gracefully even with mock API key
        assert response.status_code in [200, 503]  # 503 if provider fails

        # Step 3: Create analysis using the provider
        analysis_data = {
            "prompt": "Analyze my recent health trends",
            "provider_id": provider["id"]
        }

        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.return_value = "Your health trends show improvement over the past week."

            response = client.post(
                f"{settings.API_V1_STR}/ai-analysis/",
                headers=auth_headers,
                json=analysis_data
            )

        assert response.status_code == 200
        analysis = response.json()
        assert analysis["status"] == "pending"
        assert analysis["provider_id"] == provider["id"]

    def test_bulk_analysis_with_health_data(self, client, auth_headers, sample_health_data, test_provider):
        """Test analysis with existing health data"""

        # Create analysis that should use health data context
        analysis_data = {
            "prompt": "Analyze my blood pressure trends from the past week",
            "provider_id": test_provider.id,
            "include_health_data": True,
            "health_data_types": ["blood_pressure"],
            "date_range_days": 7
        }

        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.return_value = "Your blood pressure shows a gradual increase over the week."

            response = client.post(
                f"{settings.API_V1_STR}/ai-analysis/",
                headers=auth_headers,
                json=analysis_data
            )

        assert response.status_code == 200
        analysis = response.json()

        # Verify the prompt included health data context
        mock_generate.assert_called_once()
        call_args = mock_generate.call_args[0]
        assert "blood pressure" in call_args[0].lower()
        assert "week" in call_args[0].lower()

    def test_analysis_failure_and_retry(self, client, auth_headers, test_provider):
        """Test analysis failure handling and retry mechanism"""

        analysis_data = {
            "prompt": "Test analysis for failure scenario",
            "provider_id": test_provider.id
        }

        # Step 1: Create analysis that will fail
        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.side_effect = Exception("API rate limit exceeded")

            response = client.post(
                f"{settings.API_V1_STR}/ai-analysis/",
                headers=auth_headers,
                json=analysis_data
            )

        assert response.status_code == 200
        analysis = response.json()
        analysis_id = analysis["id"]

        # Wait for processing to complete (in real scenario, this would be async)
        # For test, we'll check the status
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/{analysis_id}",
            headers=auth_headers
        )

        analysis = response.json()
        # Should be failed or pending depending on retry logic
        assert analysis["status"] in ["failed", "pending"]

        # Step 2: Retry the failed analysis
        if analysis["status"] == "failed":
            with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
                mock_generate.return_value = "Analysis completed successfully on retry."

                response = client.post(
                    f"{settings.API_V1_STR}/ai-analysis/{analysis_id}/retry",
                    headers=auth_headers
                )

            assert response.status_code == 200
            retried_analysis = response.json()
            assert retried_analysis["status"] == "pending"

    def test_scheduled_analysis_workflow(self, client, auth_headers, test_provider):
        """Test creating and executing scheduled analysis"""

        # Step 1: Create analysis schedule
        schedule_data = {
            "name": "Daily Health Summary",
            "prompt_template": "Analyze my health data from the past {days} days",
            "provider_id": test_provider.id,
            "cron_expression": "0 8 * * *",  # Daily at 8 AM
            "is_active": True,
            "template_variables": {"days": 1}
        }

        response = client.post(
            f"{settings.API_V1_STR}/analysis-schedules/",
            headers=auth_headers,
            json=schedule_data
        )

        assert response.status_code == 200
        schedule = response.json()
        assert schedule["name"] == "Daily Health Summary"
        assert schedule["is_active"] is True

        # Step 2: Manually trigger scheduled analysis
        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.return_value = "Daily health summary: All metrics are within normal ranges."

            response = client.post(
                f"{settings.API_V1_STR}/analysis-schedules/{schedule['id']}/execute",
                headers=auth_headers
            )

        assert response.status_code == 200
        execution = response.json()
        assert "analysis_id" in execution

    def test_analysis_with_custom_configuration(self, client, auth_headers, test_provider):
        """Test analysis with custom AI model configuration"""

        analysis_data = {
            "prompt": "Provide detailed health recommendations",
            "provider_id": test_provider.id,
            "configuration": {
                "temperature": 0.7,
                "max_tokens": 1000,
                "include_context": True,
                "context_days": 30
            }
        }

        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.return_value = "Detailed health recommendations based on your data."

            response = client.post(
                f"{settings.API_V1_STR}/ai-analysis/",
                headers=auth_headers,
                json=analysis_data
            )

        assert response.status_code == 200
        analysis = response.json()

        # Verify configuration was passed to provider
        mock_generate.assert_called_once()
        call_kwargs = mock_generate.call_args[1]
        assert call_kwargs.get("temperature") == 0.7
        assert call_kwargs.get("max_tokens") == 1000

    def test_analysis_history_and_pagination(self, client, auth_headers, test_provider):
        """Test analysis history retrieval with pagination"""

        # Create multiple analyses
        analyses_created = []
        for i in range(15):
            analysis_data = {
                "prompt": f"Test analysis #{i + 1}",
                "provider_id": test_provider.id
            }

            with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
                mock_generate.return_value = f"Response for analysis #{i + 1}"

                response = client.post(
                    f"{settings.API_V1_STR}/ai-analysis/",
                    headers=auth_headers,
                    json=analysis_data
                )

            assert response.status_code == 200
            analyses_created.append(response.json())

        # Test pagination
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/?skip=0&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        page1 = response.json()
        assert len(page1) <= 10

        # Test second page
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/?skip=10&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        page2 = response.json()
        assert len(page2) >= 5  # Should have remaining analyses

    def test_analysis_filtering_and_search(self, client, auth_headers, test_provider):
        """Test filtering analyses by status, provider, and date range"""

        # Create analyses with different statuses
        analysis_data = {
            "prompt": "Health trend analysis",
            "provider_id": test_provider.id
        }

        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.return_value = "Health analysis completed."

            # Create successful analysis
            response = client.post(
                f"{settings.API_V1_STR}/ai-analysis/",
                headers=auth_headers,
                json=analysis_data
            )
            completed_analysis_id = response.json()["id"]

        # Test filtering by status
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/?status=completed",
            headers=auth_headers
        )

        assert response.status_code == 200
        completed_analyses = response.json()
        assert all(analysis["status"] == "completed" for analysis in completed_analyses)

        # Test filtering by provider
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/?provider_id={test_provider.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        provider_analyses = response.json()
        assert all(analysis["provider_id"] == test_provider.id for analysis in provider_analyses)

    def test_analysis_export_and_sharing(self, client, auth_headers, test_provider):
        """Test exporting analysis results"""

        # Create analysis for export
        analysis_data = {
            "prompt": "Comprehensive health report for export",
            "provider_id": test_provider.id
        }

        with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
            mock_generate.return_value = "Comprehensive health analysis report with detailed insights."

            response = client.post(
                f"{settings.API_V1_STR}/ai-analysis/",
                headers=auth_headers,
                json=analysis_data
            )

        analysis_id = response.json()["id"]

        # Test PDF export
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/{analysis_id}/export/pdf",
            headers=auth_headers
        )

        # Should return PDF content or redirect to file
        assert response.status_code in [200, 302]

        # Test JSON export
        response = client.get(
            f"{settings.API_V1_STR}/ai-analysis/{analysis_id}/export/json",
            headers=auth_headers
        )

        assert response.status_code == 200
        export_data = response.json()
        assert "analysis" in export_data
        assert "metadata" in export_data
        assert export_data["analysis"]["id"] == analysis_id

    def test_concurrent_analysis_handling(self, client, auth_headers, test_provider):
        """Test handling multiple concurrent analysis requests"""

        # Simulate concurrent requests
        import concurrent.futures

        def create_analysis(prompt_suffix):
            analysis_data = {
                "prompt": f"Concurrent analysis {prompt_suffix}",
                "provider_id": test_provider.id
            }

            with patch('app.services.ai_providers.openai_provider.OpenAIProvider.generate_response') as mock_generate:
                mock_generate.return_value = f"Response for concurrent analysis {prompt_suffix}"

                response = client.post(
                    f"{settings.API_V1_STR}/ai-analysis/",
                    headers=auth_headers,
                    json=analysis_data
                )

            return response

        # Create 5 concurrent analyses
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(create_analysis, i) for i in range(5)]
            responses = [future.result() for future in concurrent.futures.as_completed(futures)]

        # All should succeed
        for response in responses:
            assert response.status_code == 200
            analysis = response.json()
            assert analysis["status"] in ["pending", "processing", "completed"]
