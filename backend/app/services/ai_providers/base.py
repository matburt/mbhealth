from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime
import time

class AIProviderError(Exception):
    """Base exception for AI provider errors"""
    pass

class AIProviderResponse(BaseModel):
    content: str
    model_used: str
    token_usage: Optional[Dict[str, Any]] = None
    processing_time: float
    cost: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class BaseAIProvider(ABC):
    """Abstract base class for all AI providers"""
    
    def __init__(self, api_key: str, endpoint: Optional[str] = None, **kwargs):
        self.api_key = api_key
        self.endpoint = endpoint
        self.parameters = kwargs
        
    @abstractmethod
    async def generate_analysis(
        self, 
        prompt: str, 
        health_data: List[Dict[str, Any]], 
        model: Optional[str] = None,
        **kwargs
    ) -> AIProviderResponse:
        """Generate AI analysis for health data"""
        pass
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """Test the provider connection and return available models"""
        pass
    
    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Return list of available models for this provider"""
        pass
    
    @abstractmethod
    def get_default_model(self) -> str:
        """Return the default model for this provider"""
        pass
    
    @abstractmethod
    def estimate_cost(self, prompt: str, health_data: List[Dict[str, Any]]) -> float:
        """Estimate the cost for the analysis"""
        pass
    
    def _prepare_health_data(self, health_data: List[Dict[str, Any]]) -> str:
        """Convert health data to a formatted string for the AI"""
        formatted_data = []
        for data in health_data:
            entry = f"Date: {data.get('recorded_at', 'Unknown')}\n"
            entry += f"Metric: {data.get('metric_type', 'Unknown')}\n"
            entry += f"Value: {data.get('value', 'Unknown')} {data.get('unit', '')}\n"
            
            if data.get('systolic') and data.get('diastolic'):
                entry += f"Blood Pressure: {data['systolic']}/{data['diastolic']} mmHg\n"
            
            if data.get('notes'):
                entry += f"Notes: {data['notes']}\n"
                
            formatted_data.append(entry)
            
        return "\n---\n".join(formatted_data)
    
    def _generate_system_prompt(self, analysis_type: str) -> str:
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
    
    async def _measure_performance(self, func, *args, **kwargs):
        """Measure the performance of an async function"""
        start_time = time.time()
        result = await func(*args, **kwargs)
        end_time = time.time()
        return result, end_time - start_time