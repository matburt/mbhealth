"""
Unit tests for AI analysis services
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from app.services.ai_analysis_service import AIAnalysisService
from app.services.ai_providers.openai_provider import OpenAIProvider
from app.services.ai_providers.google_provider import GoogleProvider
from app.services.analysis_scheduler import AnalysisScheduler
from app.models import AIAnalysis, AIProvider, HealthData, User
from app.core.exceptions import AIProviderException


class TestAIAnalysisService:
    """Test AI analysis service functionality"""

    @pytest.fixture
    def ai_service(self):
        """AI analysis service instance"""
        return AIAnalysisService()

    @pytest.fixture
    def mock_provider(self):
        """Mock AI provider"""
        provider = Mock(spec=AIProvider)
        provider.id = 1
        provider.name = "Test Provider"
        provider.provider_type = "openai"
        provider.model = "gpt-4-turbo"
        provider.is_active = True
        return provider

    @pytest.fixture
    def mock_user(self):
        """Mock user"""
        user = Mock(spec=User)
        user.id = 1
        user.email = "test@example.com"
        return user

    def test_create_analysis(self, ai_service, mock_provider, mock_user, db):
        """Test creating a new analysis"""
        
        prompt = "Analyze my recent health trends"
        
        with patch.object(ai_service, '_queue_analysis') as mock_queue:
            mock_queue.return_value = Mock(id=1, status="pending")
            
            analysis = ai_service.create_analysis(
                user_id=mock_user.id,
                provider_id=mock_provider.id,
                prompt=prompt,
                db=db
            )
        
        assert analysis is not None
        mock_queue.assert_called_once()

    def test_process_analysis_with_context(self, ai_service, mock_provider, mock_user, db):
        """Test processing analysis with health data context"""
        
        # Create mock health data
        health_data = [
            Mock(
                metric_type="blood_pressure",
                value=120,
                systolic=120,
                diastolic=80,
                recorded_at=datetime.utcnow() - timedelta(days=1)
            ),
            Mock(
                metric_type="heart_rate",
                value=72,
                recorded_at=datetime.utcnow() - timedelta(days=1)
            )
        ]
        
        with patch.object(ai_service, '_get_health_context') as mock_context:
            mock_context.return_value = health_data
            
            with patch.object(ai_service, '_get_provider_instance') as mock_get_provider:
                mock_provider_instance = Mock()
                mock_provider_instance.generate_response = AsyncMock(
                    return_value="Your blood pressure and heart rate are within normal ranges."
                )
                mock_get_provider.return_value = mock_provider_instance
                
                result = ai_service.process_analysis(
                    analysis_id=1,
                    prompt="Analyze my vitals",
                    provider=mock_provider,
                    include_context=True,
                    db=db
                )
        
        mock_context.assert_called_once()
        mock_provider_instance.generate_response.assert_called_once()

    def test_analysis_with_custom_configuration(self, ai_service, mock_provider, mock_user, db):
        """Test analysis with custom AI configuration"""
        
        config = {
            "temperature": 0.7,
            "max_tokens": 1000,
            "top_p": 0.9
        }
        
        with patch.object(ai_service, '_get_provider_instance') as mock_get_provider:
            mock_provider_instance = Mock()
            mock_provider_instance.generate_response = AsyncMock(
                return_value="Analysis with custom configuration."
            )
            mock_get_provider.return_value = mock_provider_instance
            
            result = ai_service.process_analysis(
                analysis_id=1,
                prompt="Custom analysis",
                provider=mock_provider,
                configuration=config,
                db=db
            )
        
        # Verify configuration was passed
        call_args = mock_provider_instance.generate_response.call_args
        assert call_args[1]["temperature"] == 0.7
        assert call_args[1]["max_tokens"] == 1000

    def test_analysis_failure_handling(self, ai_service, mock_provider, db):
        """Test handling of analysis failures"""
        
        with patch.object(ai_service, '_get_provider_instance') as mock_get_provider:
            mock_provider_instance = Mock()
            mock_provider_instance.generate_response = AsyncMock(
                side_effect=Exception("API rate limit exceeded")
            )
            mock_get_provider.return_value = mock_provider_instance
            
            with pytest.raises(AIProviderException):
                ai_service.process_analysis(
                    analysis_id=1,
                    prompt="Test analysis",
                    provider=mock_provider,
                    db=db
                )

    def test_health_data_context_building(self, ai_service, mock_user, db):
        """Test building health data context for analysis"""
        
        # Mock health data query
        mock_health_data = [
            Mock(
                metric_type="weight",
                value=75.0,
                unit="kg",
                recorded_at=datetime.utcnow() - timedelta(days=1),
                notes="Morning weight"
            ),
            Mock(
                metric_type="blood_sugar",
                value=95,
                unit="mg/dL",
                recorded_at=datetime.utcnow() - timedelta(hours=2),
                notes="Fasting glucose"
            )
        ]
        
        with patch('app.services.ai_analysis_service.db') as mock_db:
            mock_db.query().filter().order_by().limit().all.return_value = mock_health_data
            
            context = ai_service._get_health_context(
                user_id=mock_user.id,
                days=7,
                metric_types=["weight", "blood_sugar"],
                db=db
            )
        
        assert len(context) == 2
        assert any(item.metric_type == "weight" for item in context)
        assert any(item.metric_type == "blood_sugar" for item in context)

    def test_prompt_template_processing(self, ai_service):
        """Test processing of prompt templates with variables"""
        
        template = "Analyze my {metric_type} data from the past {days} days"
        variables = {"metric_type": "blood pressure", "days": 7}
        
        processed = ai_service._process_prompt_template(template, variables)
        
        assert processed == "Analyze my blood pressure data from the past 7 days"

    def test_analysis_retry_mechanism(self, ai_service, mock_provider, db):
        """Test retry mechanism for failed analyses"""
        
        analysis_id = 1
        
        with patch.object(ai_service, '_get_provider_instance') as mock_get_provider:
            mock_provider_instance = Mock()
            
            # First call fails, second succeeds
            mock_provider_instance.generate_response = AsyncMock(
                side_effect=[
                    Exception("Temporary failure"),
                    "Analysis completed successfully"
                ]
            )
            mock_get_provider.return_value = mock_provider_instance
            
            with patch.object(ai_service, '_should_retry') as mock_should_retry:
                mock_should_retry.return_value = True
                
                result = ai_service.retry_analysis(
                    analysis_id=analysis_id,
                    provider=mock_provider,
                    db=db
                )
        
        # Should have been called twice due to retry
        assert mock_provider_instance.generate_response.call_count == 2


class TestOpenAIProvider:
    """Test OpenAI provider implementation"""

    @pytest.fixture
    def openai_provider(self):
        """OpenAI provider instance"""
        return OpenAIProvider(
            api_key="test-key",
            model="gpt-4-turbo"
        )

    @pytest.mark.asyncio
    async def test_generate_response(self, openai_provider):
        """Test generating response from OpenAI"""
        
        with patch('openai.AsyncOpenAI') as mock_openai:
            mock_client = Mock()
            mock_openai.return_value = mock_client
            
            mock_response = Mock()
            mock_response.choices = [
                Mock(message=Mock(content="Test response from OpenAI"))
            ]
            mock_response.usage = Mock(
                prompt_tokens=50,
                completion_tokens=25,
                total_tokens=75
            )
            
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            result = await openai_provider.generate_response(
                "Test prompt",
                temperature=0.7,
                max_tokens=500
            )
        
        assert result == "Test response from OpenAI"
        mock_client.chat.completions.create.assert_called_once()

    @pytest.mark.asyncio
    async def test_provider_error_handling(self, openai_provider):
        """Test provider error handling"""
        
        with patch('openai.AsyncOpenAI') as mock_openai:
            mock_client = Mock()
            mock_openai.return_value = mock_client
            
            mock_client.chat.completions.create = AsyncMock(
                side_effect=Exception("API Error")
            )
            
            with pytest.raises(AIProviderException):
                await openai_provider.generate_response("Test prompt")

    def test_provider_configuration_validation(self):
        """Test provider configuration validation"""
        
        # Test invalid API key
        with pytest.raises(ValueError):
            OpenAIProvider(api_key="", model="gpt-4")
        
        # Test invalid model
        with pytest.raises(ValueError):
            OpenAIProvider(api_key="test-key", model="")


class TestGoogleProvider:
    """Test Google AI provider implementation"""

    @pytest.fixture
    def google_provider(self):
        """Google provider instance"""
        return GoogleProvider(
            api_key="test-key",
            model="gemini-1.5-pro"
        )

    @pytest.mark.asyncio
    async def test_generate_response(self, google_provider):
        """Test generating response from Google AI"""
        
        with patch('google.generativeai.GenerativeModel') as mock_model_class:
            mock_model = Mock()
            mock_model_class.return_value = mock_model
            
            mock_response = Mock()
            mock_response.text = "Test response from Google AI"
            mock_response.usage_metadata = Mock(
                prompt_token_count=40,
                candidates_token_count=20,
                total_token_count=60
            )
            
            mock_model.generate_content = AsyncMock(return_value=mock_response)
            
            result = await google_provider.generate_response(
                "Test prompt",
                temperature=0.8,
                max_output_tokens=800
            )
        
        assert result == "Test response from Google AI"
        mock_model.generate_content.assert_called_once()


class TestAnalysisScheduler:
    """Test analysis scheduling functionality"""

    @pytest.fixture
    def scheduler(self):
        """Analysis scheduler instance"""
        return AnalysisScheduler()

    def test_schedule_creation(self, scheduler, mock_user, mock_provider, db):
        """Test creating analysis schedule"""
        
        schedule_data = {
            "name": "Daily Health Summary",
            "prompt_template": "Analyze my health data from the past {days} days",
            "cron_expression": "0 8 * * *",
            "provider_id": mock_provider.id,
            "template_variables": {"days": 1},
            "is_active": True
        }
        
        with patch.object(scheduler, '_validate_cron_expression') as mock_validate:
            mock_validate.return_value = True
            
            schedule = scheduler.create_schedule(
                user_id=mock_user.id,
                schedule_data=schedule_data,
                db=db
            )
        
        mock_validate.assert_called_once_with("0 8 * * *")

    def test_schedule_execution(self, scheduler, mock_user, mock_provider, db):
        """Test executing scheduled analysis"""
        
        schedule = Mock()
        schedule.id = 1
        schedule.prompt_template = "Daily analysis for {date}"
        schedule.template_variables = {"date": "today"}
        schedule.provider_id = mock_provider.id
        schedule.user_id = mock_user.id
        
        with patch.object(scheduler, '_create_analysis_from_schedule') as mock_create:
            mock_create.return_value = Mock(id=1, status="pending")
            
            result = scheduler.execute_schedule(schedule, db)
        
        mock_create.assert_called_once()

    def test_cron_expression_validation(self, scheduler):
        """Test cron expression validation"""
        
        # Valid expressions
        assert scheduler._validate_cron_expression("0 8 * * *") is True
        assert scheduler._validate_cron_expression("30 */2 * * *") is True
        
        # Invalid expressions
        assert scheduler._validate_cron_expression("invalid") is False
        assert scheduler._validate_cron_expression("70 8 * * *") is False

    def test_schedule_deactivation(self, scheduler, db):
        """Test deactivating schedules"""
        
        schedule_id = 1
        
        with patch.object(scheduler, '_get_schedule') as mock_get:
            mock_schedule = Mock()
            mock_schedule.is_active = True
            mock_get.return_value = mock_schedule
            
            result = scheduler.deactivate_schedule(schedule_id, db)
        
        assert mock_schedule.is_active is False

    def test_schedule_history_tracking(self, scheduler, db):
        """Test tracking schedule execution history"""
        
        schedule_id = 1
        analysis_id = 1
        
        with patch.object(scheduler, '_create_execution_record') as mock_record:
            mock_record.return_value = Mock(
                id=1,
                schedule_id=schedule_id,
                analysis_id=analysis_id,
                status="completed"
            )
            
            history = scheduler.get_schedule_history(schedule_id, db)
        
        mock_record.assert_called_once()