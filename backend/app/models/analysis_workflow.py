"""
Analysis Workflow Models

Defines models for creating analysis workflows that chain multiple analyses together.
"""

from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base
from datetime import datetime
import uuid


class AnalysisWorkflow(Base):
    """
    Defines a workflow that chains multiple analyses together
    """
    __tablename__ = "analysis_workflows"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    enabled = Column(Boolean, default=True, nullable=False)
    
    # Workflow configuration
    trigger_analysis_type = Column(String(100), nullable=False)  # What analysis type triggers this workflow
    trigger_conditions = Column(JSON)  # Conditions that must be met to trigger workflow
    
    # Workflow steps - each step defines a follow-up analysis
    workflow_steps = Column(JSON, nullable=False)  # Array of step configurations
    
    # Settings
    auto_execute = Column(Boolean, default=True)  # Auto-execute or require manual approval
    max_concurrent_executions = Column(Integer, default=1)
    
    # Tracking
    total_executions = Column(Integer, default=0)
    successful_executions = Column(Integer, default=0)
    failed_executions = Column(Integer, default=0)
    last_executed_at = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="analysis_workflows")
    workflow_executions = relationship("AnalysisWorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")


class AnalysisWorkflowExecution(Base):
    """
    Tracks the execution of a workflow instance
    """
    __tablename__ = "analysis_workflow_executions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workflow_id = Column(String(36), ForeignKey("analysis_workflows.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Trigger information
    trigger_analysis_id = Column(Integer, ForeignKey("ai_analyses.id"), nullable=False)
    trigger_analysis_result = Column(JSON)  # Snapshot of trigger analysis result
    execution_type = Column(String(50), default="automatic")  # automatic, manual, scheduled
    
    # Execution status
    status = Column(String(50), default="pending")  # pending, running, completed, failed, cancelled
    current_step = Column(Integer, default=0)  # Which step is currently executing
    total_steps = Column(Integer, nullable=False)
    
    # Results
    step_results = Column(JSON, default=list)  # Results from each step
    created_analyses = Column(JSON, default=list)  # IDs of analyses created by this workflow
    error_message = Column(Text)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    
    # Relationships
    workflow = relationship("AnalysisWorkflow", back_populates="workflow_executions")
    user = relationship("User")
    trigger_analysis = relationship("AIAnalysis")


class WorkflowTemplate(Base):
    """
    Predefined workflow templates for common patterns
    """
    __tablename__ = "workflow_templates"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(100))  # health_monitoring, anomaly_detection, etc.
    
    # Template configuration
    trigger_analysis_type = Column(String(100), nullable=False)
    trigger_conditions = Column(JSON)
    workflow_steps = Column(JSON, nullable=False)
    
    # Settings
    is_public = Column(Boolean, default=True)  # Available to all users
    created_by_user_id = Column(Integer, ForeignKey("users.id"))
    usage_count = Column(Integer, default=0)  # How many times this template has been used
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    created_by = relationship("User")


class WorkflowStepResult(Base):
    """
    Detailed results for each workflow step execution
    """
    __tablename__ = "workflow_step_results"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String(36), ForeignKey("analysis_workflow_executions.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    step_name = Column(String(255))
    
    # Step execution details
    status = Column(String(50), nullable=False)  # pending, running, completed, failed, skipped
    analysis_id = Column(Integer, ForeignKey("ai_analyses.id"))  # Analysis created by this step
    analysis_type = Column(String(100))
    
    # Input/Output
    input_data = Column(JSON)  # Data passed to this step
    output_data = Column(JSON)  # Data produced by this step
    error_message = Column(Text)
    
    # Timing
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime)
    
    # Relationships
    execution = relationship("AnalysisWorkflowExecution")
    analysis = relationship("AIAnalysis")


# Workflow condition examples stored as JSON:
# {
#   "type": "content_contains",
#   "field": "response_content", 
#   "value": "anomaly",
#   "operator": "contains"
# }
# {
#   "type": "analysis_status",
#   "value": "completed",
#   "operator": "equals"
# }
# {
#   "type": "metric_threshold",
#   "metric_type": "blood_pressure",
#   "field": "systolic",
#   "value": 140,
#   "operator": "greater_than"
# }

# Workflow step examples stored as JSON:
# [
#   {
#     "name": "Detailed Analysis",
#     "analysis_type": "detailed_insights",
#     "delay_minutes": 0,
#     "conditions": [],
#     "additional_context": "Follow up on the anomaly detected in the previous analysis"
#   },
#   {
#     "name": "Recommendations",
#     "analysis_type": "recommendations", 
#     "delay_minutes": 5,
#     "conditions": [{"type": "previous_step_status", "value": "completed"}],
#     "data_selection": {"include_trigger_data": true, "days_lookback": 7}
#   }
# ]