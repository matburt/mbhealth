from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from app.models.ai_analysis import AIProvider, AIAnalysis, AnalysisSettings
from app.models.health_data import HealthData
from app.schemas.ai_analysis import (
    AIProviderCreate, AIProviderUpdate, 
    AIAnalysisCreate, AIAnalysisUpdate,
    AnalysisSettingsCreate, AnalysisSettingsUpdate
)
from app.services.ai_providers import ProviderFactory, BaseAIProvider, AIProviderError
from app.core.config import settings
from cryptography.fernet import Fernet
import uuid
import base64
import hashlib
import os
from datetime import datetime

class AIAnalysisService:
    """Service for managing AI analysis operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self._encryption_key = self._get_encryption_key()
    
    def _get_encryption_key(self) -> Fernet:
        """Get or create encryption key for API keys"""
        key = getattr(settings, 'ENCRYPTION_KEY', None)
        if not key:
            # Use SECRET_KEY as base for encryption key to ensure consistency
            # This ensures the same key is used across service restarts
            import hashlib
            key_bytes = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
            key = base64.urlsafe_b64encode(key_bytes)
        elif isinstance(key, str):
            key = key.encode()
        return Fernet(key)
    
    def _encrypt_api_key(self, api_key: str) -> str:
        """Encrypt an API key for storage"""
        if not api_key:
            return ""
        try:
            return self._encryption_key.encrypt(api_key.encode()).decode()
        except Exception as e:
            raise ValueError(f"Failed to encrypt API key: {str(e)}")
    
    def _decrypt_api_key(self, encrypted_key: str) -> str:
        """Decrypt an API key from storage"""
        if not encrypted_key:
            return ""
        try:
            return self._encryption_key.decrypt(encrypted_key.encode()).decode()
        except Exception as e:
            # Log the error but don't expose it to the user
            print(f"Failed to decrypt API key: {str(e)}")
            return ""
    
    # AI Provider Management
    async def create_provider(self, user_id: int, provider_data: AIProviderCreate) -> AIProvider:
        """Create a new AI provider for a user"""
        # Encrypt API key if provided
        encrypted_key = ""
        if provider_data.api_key:
            encrypted_key = self._encrypt_api_key(provider_data.api_key)
        
        db_provider = AIProvider(
            user_id=user_id,
            name=provider_data.name,
            type=provider_data.type,
            endpoint=provider_data.endpoint,
            api_key_encrypted=encrypted_key,
            models=provider_data.models,
            default_model=provider_data.default_model,
            parameters=provider_data.parameters,
            enabled=provider_data.enabled,
            priority=provider_data.priority
        )
        
        self.db.add(db_provider)
        self.db.commit()
        self.db.refresh(db_provider)
        return db_provider
    
    def get_providers(self, user_id: int, enabled_only: bool = False) -> List[AIProvider]:
        """Get all AI providers for a user"""
        query = self.db.query(AIProvider).filter(AIProvider.user_id == user_id)
        if enabled_only:
            query = query.filter(AIProvider.enabled == True)
        return query.order_by(desc(AIProvider.priority), AIProvider.name).all()
    
    def get_provider(self, user_id: int, provider_id: str) -> Optional[AIProvider]:
        """Get a specific AI provider"""
        return self.db.query(AIProvider).filter(
            and_(AIProvider.id == provider_id, AIProvider.user_id == user_id)
        ).first()
    
    async def update_provider(self, user_id: int, provider_id: str, provider_data: AIProviderUpdate) -> Optional[AIProvider]:
        """Update an AI provider"""
        provider = self.get_provider(user_id, provider_id)
        if not provider:
            return None
        
        update_data = provider_data.dict(exclude_unset=True)
        
        # Handle API key encryption
        if "api_key" in update_data and update_data["api_key"]:
            update_data["api_key_encrypted"] = self._encrypt_api_key(update_data["api_key"])
            del update_data["api_key"]
        
        for field, value in update_data.items():
            setattr(provider, field, value)
        
        self.db.commit()
        self.db.refresh(provider)
        return provider
    
    def delete_provider(self, user_id: int, provider_id: str) -> bool:
        """Delete an AI provider"""
        provider = self.get_provider(user_id, provider_id)
        if not provider:
            return False
        
        self.db.delete(provider)
        self.db.commit()
        return True
    
    async def test_provider(self, user_id: int, provider_id: str) -> Dict[str, Any]:
        """Test connection to an AI provider"""
        provider = self.get_provider(user_id, provider_id)
        if not provider:
            return {"success": False, "message": "Provider not found"}
        
        try:
            api_key = self._decrypt_api_key(provider.api_key_encrypted)
            if not api_key:
                return {"success": False, "message": "API key could not be decrypted. Please update your API key."}
            
            ai_provider = ProviderFactory.create_provider(
                provider.type,
                api_key,
                provider.endpoint,
                provider.models.get("available", []) if provider.models else None,
                **(provider.parameters or {})
            )
            
            result = await ai_provider.test_connection()
            
            # Update available models if test was successful
            if result["success"] and result.get("available_models"):
                if not provider.models:
                    provider.models = {}
                provider.models["available"] = result["available_models"]
                self.db.commit()
            
            return result
            
        except Exception as e:
            return {"success": False, "message": f"Test failed: {str(e)}"}
    
    # AI Analysis Management
    async def create_analysis(self, user_id: int, analysis_data: AIAnalysisCreate, background: bool = True) -> AIAnalysis:
        """Create a new AI analysis"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            # Resolve provider information
            provider_id = analysis_data.provider_id
            provider_name = analysis_data.provider
            
            # If no provider_id is set, try to resolve from provider name
            if not provider_id:
                # Check if provider is a UUID (indicating it's actually a provider ID)
                try:
                    import uuid
                    uuid.UUID(analysis_data.provider)
                    provider_id = analysis_data.provider
                    logger.info(f"Using provider ID from provider field: {provider_id}")
                except ValueError:
                    # It's a provider name, try to find the provider
                    provider = self.db.query(AIProvider).filter(
                        AIProvider.user_id == user_id,
                        AIProvider.name == analysis_data.provider,
                        AIProvider.enabled == True
                    ).first()
                    
                    if provider:
                        provider_id = provider.id
                        provider_name = provider.name
                        logger.info(f"Resolved provider name '{analysis_data.provider}' to ID: {provider_id}")
                    else:
                        logger.warning(f"Provider '{analysis_data.provider}' not found, using as name")
                        provider_name = analysis_data.provider
            else:
                # We have a provider_id, get the name for compatibility
                provider = self.get_provider(user_id, provider_id)
                if provider:
                    provider_name = provider.name
                    logger.info(f"Using provider ID {provider_id} with name: {provider_name}")
            
            # Get user context profile
            from app.models.user import User
            user = self.db.query(User).filter(User.id == user_id).first()
            user_context = user.ai_context_profile if user and user.ai_context_profile else None
            
            # Generate request prompt based on analysis type
            system_prompt = self._generate_analysis_prompt(analysis_data.analysis_type)
            
            # Add user context profile if available
            if user_context:
                system_prompt += f"\n\nUser context: {user_context}"
            
            # Add additional context if provided
            if analysis_data.additional_context:
                system_prompt += f"\n\nAdditional context from user: {analysis_data.additional_context}"
            
            # Create analysis record
            db_analysis = AIAnalysis(
                user_id=user_id,
                provider_id=provider_id,
                health_data_ids=analysis_data.health_data_ids,
                analysis_type=analysis_data.analysis_type,
                provider_name=provider_name,
                request_prompt=system_prompt,
                status="pending"
            )
            
            self.db.add(db_analysis)
            self.db.commit()
            self.db.refresh(db_analysis)
            
            logger.info(f"Created analysis {db_analysis.id} for user {user_id}")
            
            if background:
                # Queue analysis for background processing
                from app.tasks.ai_analysis import create_analysis_job
                create_analysis_job.delay(
                    db_analysis.id, 
                    user_id, 
                    provider_id,
                priority=5  # Normal priority
                )
            else:
                # Execute analysis immediately (for testing/debugging)
                await self._execute_analysis(db_analysis, analysis_data.additional_context)
            
            return db_analysis
            
        except Exception as e:
            logger.error(f"Failed to create analysis: {str(e)}")
            logger.error(f"Analysis data: {analysis_data}")
            # If we have a database record, mark it as failed
            try:
                if 'db_analysis' in locals():
                    db_analysis.status = "failed"
                    db_analysis.error_message = f"Creation failed: {str(e)}"
                    db_analysis.completed_at = datetime.utcnow()
                    self.db.commit()
            except:
                pass  # Don't raise during error handling
            raise
    
    async def _execute_analysis(self, analysis: AIAnalysis, additional_context: Optional[str] = None):
        """Execute the AI analysis"""
        import logging
        import traceback
        
        logger = logging.getLogger(__name__)
        logger.info(f"Starting analysis execution for analysis {analysis.id}")
        
        try:
            # Get user information including AI context profile
            from app.models.user import User
            user = self.db.query(User).filter(User.id == analysis.user_id).first()
            user_context = user.ai_context_profile if user and user.ai_context_profile else None
            
            # Get health data
            health_data = self.db.query(HealthData).filter(
                and_(
                    HealthData.id.in_(analysis.health_data_ids),
                    HealthData.user_id == analysis.user_id
                )
            ).all()
            
            if not health_data:
                logger.error(f"No health data found for analysis {analysis.id} with IDs: {analysis.health_data_ids}")
                analysis.status = "failed"
                analysis.error_message = "No health data found for the selected entries"
                analysis.completed_at = datetime.utcnow()
                self.db.commit()
                return
            
            # Prepare health data for analysis
            health_data_list = [
                {
                    "metric_type": d.metric_type,
                    "value": d.value,
                    "unit": d.unit,
                    "systolic": d.systolic,
                    "diastolic": d.diastolic,
                    "recorded_at": d.recorded_at.isoformat() if d.recorded_at else None,
                    "notes": d.notes,
                    "additional_data": d.additional_data
                }
                for d in health_data
            ]
            
            # Get provider and create AI provider instance
            if analysis.provider_id:
                logger.info(f"Getting provider {analysis.provider_id} for analysis {analysis.id}")
                provider = self.get_provider(analysis.user_id, analysis.provider_id)
                if not provider or not provider.enabled:
                    logger.error(f"Provider {analysis.provider_id} not found or disabled for analysis {analysis.id}")
                    analysis.status = "failed"
                    analysis.error_message = "Provider not found or disabled"
                    analysis.completed_at = datetime.utcnow()
                    self.db.commit()
                    return
                
                logger.info(f"Decrypting API key for provider {provider.name}")
                api_key = self._decrypt_api_key(provider.api_key_encrypted)
                if not api_key:
                    logger.error(f"Failed to decrypt API key for provider {provider.name}")
                    analysis.status = "failed"
                    analysis.error_message = "Failed to decrypt provider API key"
                    analysis.completed_at = datetime.utcnow()
                    self.db.commit()
                    return
                
                logger.info(f"Creating AI provider instance of type {provider.type}")
                ai_provider = ProviderFactory.create_provider(
                    provider.type,
                    api_key,
                    provider.endpoint,
                    provider.models.get("available", []) if provider.models else None,
                    **(provider.parameters or {})
                )
                model = provider.default_model
                logger.info(f"Using model: {model}")
            else:
                # Fallback to legacy provider logic
                logger.info(f"Using legacy provider {analysis.provider_name}")
                ai_provider = await self._create_legacy_provider(analysis.provider_name)
                if not ai_provider:
                    logger.error(f"Legacy provider {analysis.provider_name} not configured")
                    analysis.status = "failed"
                    analysis.error_message = f"Legacy provider {analysis.provider_name} not configured"
                    analysis.completed_at = datetime.utcnow()
                    self.db.commit()
                    return
                model = ai_provider.get_default_model()
                logger.info(f"Using legacy model: {model}")
            
            # Add user context and additional context to prompt
            prompt = analysis.request_prompt
            if user_context:
                prompt += f"\n\nUser context: {user_context}"
            if additional_context:
                prompt += f"\n\nAdditional context: {additional_context}"
            
            # Execute analysis
            logger.info(f"Executing AI analysis for analysis {analysis.id}")
            result = await ai_provider.generate_analysis(
                prompt, 
                health_data_list, 
                model=model
            )
            
            # Update analysis with results
            logger.info(f"Analysis {analysis.id} completed successfully")
            analysis.status = "completed"
            analysis.response_content = result.content
            analysis.model_used = result.model_used
            analysis.processing_time = result.processing_time
            analysis.token_usage = result.token_usage
            analysis.cost = result.cost
            analysis.completed_at = datetime.utcnow()
            
        except AIProviderError as e:
            logger.error(f"AI Provider error in analysis {analysis.id}: {str(e)}")
            logger.error(f"AI Provider traceback: {traceback.format_exc()}")
            analysis.status = "failed"
            analysis.error_message = str(e)
            analysis.completed_at = datetime.utcnow()
        except Exception as e:
            logger.error(f"Unexpected error in analysis {analysis.id}: {str(e)}")
            logger.error(f"Unexpected error traceback: {traceback.format_exc()}")
            analysis.status = "failed" 
            analysis.error_message = f"Unexpected error: {str(e)}"
            analysis.completed_at = datetime.utcnow()
        
        try:
            self.db.commit()
            logger.info(f"Analysis {analysis.id} status updated to: {analysis.status}")
        except Exception as e:
            logger.error(f"Failed to commit analysis {analysis.id} status: {str(e)}")
            raise
    
    async def _create_legacy_provider(self, provider_name: str) -> Optional[BaseAIProvider]:
        """Create provider instance for legacy provider names"""
        if provider_name == "openai" and settings.OPENAI_API_KEY:
            return ProviderFactory.create_provider("openai", settings.OPENAI_API_KEY)
        elif provider_name == "openrouter" and settings.OPENROUTER_API_KEY:
            return ProviderFactory.create_provider("openai", settings.OPENROUTER_API_KEY, "https://openrouter.ai/api/v1")
        elif provider_name == "google" and settings.GOOGLE_AI_API_KEY:
            return ProviderFactory.create_provider("google", settings.GOOGLE_AI_API_KEY)
        return None
    
    def _generate_analysis_prompt(self, analysis_type: str) -> str:
        """Generate system prompt based on analysis type"""
        prompts = {
            "trends": """You are a health data analyst. Analyze the provided health metrics to identify trends, patterns, and changes over time. 
                        Focus on: progression, regression, patterns, seasonal changes, and significant variations. 
                        Provide clear, actionable insights in a friendly, professional tone.""",
            
            "insights": """You are a health insights specialist. Examine the health data to provide meaningful insights about the user's health status.
                          Focus on: correlations between metrics, health implications, potential causes, and notable observations.
                          Provide educational and helpful insights in an encouraging tone.""",
            
            "recommendations": """You are a health advisor. Based on the provided health data, offer practical, evidence-based recommendations.
                                Focus on: lifestyle suggestions, monitoring recommendations, when to consult healthcare providers, and preventive measures.
                                Always remind users to consult healthcare professionals for medical decisions.""",
            
            "anomalies": """You are a health monitoring specialist. Identify any unusual patterns, outliers, or anomalies in the health data.
                           Focus on: abnormal readings, sudden changes, inconsistent patterns, and potential data quality issues.
                           Be clear about what appears concerning vs. normal variation."""
        }
        
        return prompts.get(analysis_type, prompts["insights"])
    
    def get_analyses(self, user_id: int, skip: int = 0, limit: int = 100) -> List[AIAnalysis]:
        """Get AI analyses for a user"""
        return self.db.query(AIAnalysis).filter(
            AIAnalysis.user_id == user_id
        ).order_by(desc(AIAnalysis.created_at)).offset(skip).limit(limit).all()
    
    def get_analysis(self, user_id: int, analysis_id: int) -> Optional[AIAnalysis]:
        """Get a specific AI analysis"""
        return self.db.query(AIAnalysis).filter(
            and_(AIAnalysis.id == analysis_id, AIAnalysis.user_id == user_id)
        ).first()
    
    def delete_analysis(self, user_id: int, analysis_id: int) -> bool:
        """Delete an AI analysis"""
        analysis = self.get_analysis(user_id, analysis_id)
        if not analysis:
            return False
        
        self.db.delete(analysis)
        self.db.commit()
        return True