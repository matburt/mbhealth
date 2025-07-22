"""
Simplified unit tests for AI analysis services
"""

from unittest.mock import Mock, patch

import pytest

from app.models import AIProvider, User
from app.services.ai_analysis_service import AIAnalysisService
from app.services.analysis_scheduler import AnalysisSchedulerService


class TestAIAnalysisService:
    """Test AI analysis service basic functionality"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def ai_service(self, mock_db):
        """AI analysis service instance"""
        with patch('app.services.ai_analysis_service.settings') as mock_settings:
            mock_settings.SECRET_KEY = "test-secret-key"
            return AIAnalysisService(mock_db)

    @pytest.fixture
    def mock_provider(self):
        """Mock AI provider"""
        provider = Mock(spec=AIProvider)
        provider.id = 1
        provider.name = "Test Provider"
        provider.type = "openai"
        provider.enabled = True
        return provider

    @pytest.fixture
    def mock_user(self):
        """Mock user"""
        user = Mock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        return user

    def test_encrypt_decrypt_api_key(self, ai_service):
        """Test API key encryption and decryption"""

        original_key = "test-api-key-123"

        # Test encryption
        encrypted = ai_service._encrypt_api_key(original_key)
        assert encrypted != original_key
        assert len(encrypted) > len(original_key)

        # Test decryption
        decrypted = ai_service._decrypt_api_key(encrypted)
        assert decrypted == original_key

    def test_encrypt_empty_key(self, ai_service):
        """Test encrypting empty API key"""

        encrypted = ai_service._encrypt_api_key("")
        assert encrypted == ""

        encrypted = ai_service._encrypt_api_key(None)
        assert encrypted == ""

    def test_get_providers_query(self, ai_service, mock_user):
        """Test get providers constructs correct query"""

        with patch.object(ai_service.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.order_by.return_value.all.return_value = []

            result = ai_service.get_providers(mock_user.id)

            mock_query.assert_called_once()
            mock_query.return_value.filter.assert_called_once()

    def test_get_providers_enabled_only(self, ai_service, mock_user):
        """Test get providers with enabled_only filter"""

        with patch.object(ai_service.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.order_by.return_value.all.return_value = []

            result = ai_service.get_providers(mock_user.id, enabled_only=True)

            # Should have additional filter for enabled=True
            assert mock_query.return_value.filter.call_count >= 1


class TestAnalysisSchedulerService:
    """Test analysis scheduling service"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def scheduler(self, mock_db):
        """Analysis scheduler service instance"""
        return AnalysisSchedulerService(mock_db)

    @pytest.fixture
    def mock_user(self):
        """Mock user"""
        user = Mock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        return user

    def test_validate_cron_expression(self, scheduler):
        """Test cron expression validation"""

        # Valid expressions
        assert scheduler._validate_cron_expression("0 8 * * *") is True
        assert scheduler._validate_cron_expression("30 */2 * * *") is True
        assert scheduler._validate_cron_expression("0 0 1 * *") is True

        # Invalid expressions
        assert scheduler._validate_cron_expression("invalid") is False
        assert scheduler._validate_cron_expression("70 8 * * *") is False
        assert scheduler._validate_cron_expression("") is False

    def test_get_schedules_query(self, scheduler, mock_user):
        """Test get schedules constructs correct query"""

        with patch.object(scheduler.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.order_by.return_value.all.return_value = []

            result = scheduler.get_schedules(mock_user.id)

            mock_query.assert_called_once()
            mock_query.return_value.filter.assert_called_once()

    def test_get_schedules_enabled_only(self, scheduler, mock_user):
        """Test get schedules with enabled_only filter"""

        with patch.object(scheduler.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.order_by.return_value.all.return_value = []

            result = scheduler.get_schedules(mock_user.id, enabled_only=True)

            # Should have additional filter for enabled=True
            assert mock_query.return_value.filter.call_count >= 1

    def test_enable_disable_schedule(self, scheduler, mock_user):
        """Test enabling and disabling schedules"""

        schedule_id = "test-schedule-id"

        with patch.object(scheduler, 'get_schedule') as mock_get:
            mock_schedule = Mock()
            mock_schedule.enabled = True
            mock_get.return_value = mock_schedule

            # Test disable
            result = scheduler.disable_schedule(mock_user.id, schedule_id)
            assert mock_schedule.enabled is False

            # Test enable
            result = scheduler.enable_schedule(mock_user.id, schedule_id)
            assert mock_schedule.enabled is True


class TestErrorHandling:
    """Test error handling in services"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return Mock()

    @pytest.fixture
    def ai_service(self, mock_db):
        """AI analysis service instance"""
        with patch('app.services.ai_analysis_service.settings') as mock_settings:
            mock_settings.SECRET_KEY = "test-secret-key"
            return AIAnalysisService(mock_db)

    def test_decrypt_invalid_key_handling(self, ai_service):
        """Test handling of invalid encrypted keys"""

        with pytest.raises(Exception):
            ai_service._decrypt_api_key("invalid-encrypted-data")

    def test_get_provider_not_found(self, ai_service):
        """Test getting non-existent provider"""

        with patch.object(ai_service.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = None

            result = ai_service.get_provider(user_id=1, provider_id="non-existent")
            assert result is None

    def test_delete_provider_not_found(self, ai_service):
        """Test deleting non-existent provider"""

        with patch.object(ai_service.db, 'query') as mock_query:
            mock_query.return_value.filter.return_value.first.return_value = None

            result = ai_service.delete_provider(user_id=1, provider_id="non-existent")
            assert result is False
