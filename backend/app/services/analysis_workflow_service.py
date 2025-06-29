"""
Analysis Workflow Service

Handles creation, execution, and management of analysis workflows.
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from app.models.analysis_workflow import (
    AnalysisWorkflow, AnalysisWorkflowExecution, WorkflowTemplate, WorkflowStepResult
)
from app.models.ai_analysis import AIAnalysis
from app.models.user import User
from app.services.ai_analysis_service import AIAnalysisService
from app.schemas.ai_analysis import AIAnalysisCreate

logger = logging.getLogger(__name__)


class AnalysisWorkflowService:
    """Service for managing analysis workflows"""
    
    def __init__(self, db: Session):
        self.db = db
        self.ai_analysis_service = AIAnalysisService(db)
    
    # Workflow Management
    async def create_workflow(self, user_id: int, workflow_data: Dict[str, Any]) -> AnalysisWorkflow:
        """Create a new analysis workflow"""
        logger.info(f"Creating analysis workflow for user {user_id}: {workflow_data.get('name')}")
        
        workflow = AnalysisWorkflow(
            user_id=user_id,
            name=workflow_data['name'],
            description=workflow_data.get('description'),
            trigger_analysis_type=workflow_data['trigger_analysis_type'],
            trigger_conditions=workflow_data.get('trigger_conditions', []),
            workflow_steps=workflow_data['workflow_steps'],
            auto_execute=workflow_data.get('auto_execute', True),
            max_concurrent_executions=workflow_data.get('max_concurrent_executions', 1),
            enabled=workflow_data.get('enabled', True)
        )
        
        self.db.add(workflow)
        self.db.commit()
        self.db.refresh(workflow)
        
        logger.info(f"Created workflow {workflow.id}")
        return workflow
    
    def get_workflows(self, user_id: int, enabled_only: bool = False) -> List[AnalysisWorkflow]:
        """Get all workflows for a user"""
        query = self.db.query(AnalysisWorkflow).filter(AnalysisWorkflow.user_id == user_id)
        if enabled_only:
            query = query.filter(AnalysisWorkflow.enabled == True)
        return query.order_by(desc(AnalysisWorkflow.created_at)).all()
    
    def get_workflow(self, user_id: int, workflow_id: str) -> Optional[AnalysisWorkflow]:
        """Get a specific workflow"""
        return self.db.query(AnalysisWorkflow).filter(
            and_(AnalysisWorkflow.id == workflow_id, AnalysisWorkflow.user_id == user_id)
        ).first()
    
    async def update_workflow(self, user_id: int, workflow_id: str, update_data: Dict[str, Any]) -> Optional[AnalysisWorkflow]:
        """Update a workflow"""
        workflow = self.get_workflow(user_id, workflow_id)
        if not workflow:
            return None
        
        for field, value in update_data.items():
            if hasattr(workflow, field):
                setattr(workflow, field, value)
        
        self.db.commit()
        self.db.refresh(workflow)
        return workflow
    
    def delete_workflow(self, user_id: int, workflow_id: str) -> bool:
        """Delete a workflow"""
        workflow = self.get_workflow(user_id, workflow_id)
        if not workflow:
            return False
        
        self.db.delete(workflow)
        self.db.commit()
        return True
    
    # Workflow Execution
    async def check_trigger_conditions(self, analysis: AIAnalysis) -> List[AnalysisWorkflow]:
        """Check if any workflows should be triggered by this analysis"""
        logger.info(f"Checking workflow triggers for analysis {analysis.id} (type: {analysis.analysis_type})")
        
        # Get workflows that could be triggered by this analysis type
        workflows = self.db.query(AnalysisWorkflow).filter(
            and_(
                AnalysisWorkflow.user_id == analysis.user_id,
                AnalysisWorkflow.enabled == True,
                AnalysisWorkflow.trigger_analysis_type == analysis.analysis_type
            )
        ).all()
        
        triggered_workflows = []
        
        for workflow in workflows:
            if await self._evaluate_trigger_conditions(workflow, analysis):
                # Check if we're within concurrent execution limits
                concurrent_executions = self.db.query(AnalysisWorkflowExecution).filter(
                    and_(
                        AnalysisWorkflowExecution.workflow_id == workflow.id,
                        AnalysisWorkflowExecution.status.in_(['pending', 'running'])
                    )
                ).count()
                
                if concurrent_executions < workflow.max_concurrent_executions:
                    triggered_workflows.append(workflow)
                    logger.info(f"Workflow {workflow.id} triggered by analysis {analysis.id}")
                else:
                    logger.warning(f"Workflow {workflow.id} skipped - too many concurrent executions")
        
        return triggered_workflows
    
    async def _evaluate_trigger_conditions(self, workflow: AnalysisWorkflow, analysis: AIAnalysis) -> bool:
        """Evaluate if the analysis meets the workflow's trigger conditions"""
        if not workflow.trigger_conditions:
            return True  # No conditions means always trigger
        
        for condition in workflow.trigger_conditions:
            if not await self._evaluate_single_condition(condition, analysis):
                return False  # All conditions must be met
        
        return True
    
    async def _evaluate_single_condition(self, condition: Dict[str, Any], analysis: AIAnalysis) -> bool:
        """Evaluate a single trigger condition"""
        condition_type = condition.get('type')
        
        if condition_type == 'analysis_status':
            return self._check_status_condition(condition, analysis.status)
        
        elif condition_type == 'content_contains':
            return self._check_content_condition(condition, analysis.response_content)
        
        elif condition_type == 'analysis_completed':
            return analysis.status == 'completed' and analysis.completed_at is not None
        
        elif condition_type == 'error_occurred':
            return analysis.status == 'failed' or analysis.error_message is not None
        
        elif condition_type == 'processing_time':
            if analysis.processing_time:
                return self._check_numeric_condition(condition, analysis.processing_time)
        
        # Add more condition types as needed
        logger.warning(f"Unknown condition type: {condition_type}")
        return True  # Default to triggering if we don't understand the condition
    
    def _check_status_condition(self, condition: Dict[str, Any], status: str) -> bool:
        """Check if status meets condition"""
        operator = condition.get('operator', 'equals')
        value = condition.get('value')
        
        if operator == 'equals':
            return status == value
        elif operator == 'not_equals':
            return status != value
        elif operator == 'in':
            return status in value if isinstance(value, list) else False
        
        return False
    
    def _check_content_condition(self, condition: Dict[str, Any], content: str) -> bool:
        """Check if content meets condition"""
        if not content:
            return False
        
        operator = condition.get('operator', 'contains')
        value = condition.get('value', '').lower()
        content_lower = content.lower()
        
        if operator == 'contains':
            return value in content_lower
        elif operator == 'not_contains':
            return value not in content_lower
        elif operator == 'starts_with':
            return content_lower.startswith(value)
        elif operator == 'ends_with':
            return content_lower.endswith(value)
        
        return False
    
    def _check_numeric_condition(self, condition: Dict[str, Any], value: float) -> bool:
        """Check if numeric value meets condition"""
        operator = condition.get('operator')
        threshold = condition.get('value')
        
        if operator == 'greater_than':
            return value > threshold
        elif operator == 'less_than':
            return value < threshold
        elif operator == 'equals':
            return value == threshold
        elif operator == 'greater_equal':
            return value >= threshold
        elif operator == 'less_equal':
            return value <= threshold
        
        return False
    
    async def execute_workflow(self, workflow: AnalysisWorkflow, trigger_analysis: AIAnalysis, execution_type: str = "automatic") -> AnalysisWorkflowExecution:
        """Execute a workflow"""
        logger.info(f"Executing workflow {workflow.id} triggered by analysis {trigger_analysis.id}")
        
        # Create execution record
        execution = AnalysisWorkflowExecution(
            workflow_id=workflow.id,
            user_id=workflow.user_id,
            trigger_analysis_id=trigger_analysis.id,
            trigger_analysis_result={
                'id': trigger_analysis.id,
                'analysis_type': trigger_analysis.analysis_type,
                'status': trigger_analysis.status,
                'response_content': trigger_analysis.response_content[:1000] if trigger_analysis.response_content else None,  # Truncate for storage
                'completed_at': trigger_analysis.completed_at.isoformat() if trigger_analysis.completed_at else None
            },
            execution_type=execution_type,
            status="running",
            total_steps=len(workflow.workflow_steps),
            step_results=[],
            created_analyses=[]
        )
        
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        
        try:
            # Execute each step in the workflow
            for step_index, step_config in enumerate(workflow.workflow_steps):
                execution.current_step = step_index
                self.db.commit()
                
                logger.info(f"Executing step {step_index + 1}/{len(workflow.workflow_steps)}: {step_config.get('name', 'Unnamed step')}")
                
                step_result = await self._execute_workflow_step(execution, step_index, step_config, trigger_analysis)
                
                # Update execution with step result
                execution.step_results.append(step_result)
                if step_result.get('analysis_id'):
                    execution.created_analyses.append(step_result['analysis_id'])
                
                self.db.commit()
                
                # Check if step failed and we should stop
                if step_result['status'] == 'failed' and not step_config.get('continue_on_failure', False):
                    execution.status = 'failed'
                    execution.error_message = f"Step {step_index + 1} failed: {step_result.get('error')}"
                    execution.completed_at = datetime.utcnow()
                    self.db.commit()
                    return execution
                
                # Apply delay if specified
                delay_minutes = step_config.get('delay_minutes', 0)
                if delay_minutes > 0 and step_index < len(workflow.workflow_steps) - 1:
                    logger.info(f"Waiting {delay_minutes} minutes before next step")
                    # In a real implementation, you'd schedule the next step rather than blocking
                    # For now, we'll just log the delay
            
            # Mark execution as completed
            execution.status = 'completed'
            execution.completed_at = datetime.utcnow()
            
            # Update workflow statistics
            workflow.total_executions += 1
            workflow.successful_executions += 1
            workflow.last_executed_at = datetime.utcnow()
            
            self.db.commit()
            
            logger.info(f"Workflow {workflow.id} execution completed successfully")
            
        except Exception as e:
            logger.error(f"Error executing workflow {workflow.id}: {str(e)}")
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            
            workflow.total_executions += 1
            workflow.failed_executions += 1
            
            self.db.commit()
        
        return execution
    
    async def _execute_workflow_step(self, execution: AnalysisWorkflowExecution, step_index: int, step_config: Dict[str, Any], trigger_analysis: AIAnalysis) -> Dict[str, Any]:
        """Execute a single workflow step"""
        step_name = step_config.get('name', f'Step {step_index + 1}')
        
        # Create step result record
        step_result = WorkflowStepResult(
            execution_id=execution.id,
            step_number=step_index,
            step_name=step_name,
            status='running',
            analysis_type=step_config.get('analysis_type'),
            input_data=step_config
        )
        
        self.db.add(step_result)
        self.db.commit()
        self.db.refresh(step_result)
        
        try:
            # Prepare analysis data for this step
            analysis_data = AIAnalysisCreate(
                health_data_ids=trigger_analysis.health_data_ids,  # Use same data as trigger
                analysis_type=step_config['analysis_type'],
                provider=step_config.get('provider', 'auto-selected'),
                additional_context=step_config.get('additional_context')
            )
            
            # Create and execute the analysis
            analysis = await self.ai_analysis_service.create_analysis(
                execution.user_id, analysis_data, background=True
            )
            
            step_result.analysis_id = analysis.id
            step_result.status = 'completed'
            step_result.completed_at = datetime.utcnow()
            step_result.output_data = {
                'analysis_id': analysis.id,
                'analysis_type': analysis.analysis_type,
                'status': analysis.status
            }
            
            self.db.commit()
            
            return {
                'status': 'completed',
                'analysis_id': analysis.id,
                'step_name': step_name,
                'analysis_type': analysis.analysis_type
            }
            
        except Exception as e:
            logger.error(f"Error executing workflow step {step_name}: {str(e)}")
            
            step_result.status = 'failed'
            step_result.error_message = str(e)
            step_result.completed_at = datetime.utcnow()
            self.db.commit()
            
            return {
                'status': 'failed',
                'error': str(e),
                'step_name': step_name
            }
    
    # Template Management
    def get_workflow_templates(self) -> List[WorkflowTemplate]:
        """Get all available workflow templates"""
        return self.db.query(WorkflowTemplate).filter(
            WorkflowTemplate.is_public == True
        ).order_by(WorkflowTemplate.usage_count.desc()).all()
    
    async def create_workflow_from_template(self, user_id: int, template_id: str, customizations: Dict[str, Any] = None) -> AnalysisWorkflow:
        """Create a workflow from a template"""
        template = self.db.query(WorkflowTemplate).filter(WorkflowTemplate.id == template_id).first()
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        workflow_data = {
            'name': customizations.get('name', template.name),
            'description': customizations.get('description', template.description),
            'trigger_analysis_type': template.trigger_analysis_type,
            'trigger_conditions': customizations.get('trigger_conditions', template.trigger_conditions),
            'workflow_steps': customizations.get('workflow_steps', template.workflow_steps),
            'auto_execute': customizations.get('auto_execute', True),
            'enabled': customizations.get('enabled', True)
        }
        
        workflow = await self.create_workflow(user_id, workflow_data)
        
        # Update template usage count
        template.usage_count += 1
        self.db.commit()
        
        return workflow
    
    # History and Analytics
    def get_workflow_executions(self, user_id: int, workflow_id: str = None, limit: int = 50) -> List[AnalysisWorkflowExecution]:
        """Get execution history"""
        query = self.db.query(AnalysisWorkflowExecution).filter(
            AnalysisWorkflowExecution.user_id == user_id
        )
        if workflow_id:
            query = query.filter(AnalysisWorkflowExecution.workflow_id == workflow_id)
        
        return query.order_by(desc(AnalysisWorkflowExecution.started_at)).limit(limit).all()
    
    def get_workflow_statistics(self, user_id: int, days: int = 30) -> Dict[str, Any]:
        """Get workflow statistics for a user"""
        since_date = datetime.utcnow() - timedelta(days=days)
        
        executions = self.db.query(AnalysisWorkflowExecution).filter(
            and_(
                AnalysisWorkflowExecution.user_id == user_id,
                AnalysisWorkflowExecution.started_at >= since_date
            )
        ).all()
        
        total_executions = len(executions)
        successful_executions = len([e for e in executions if e.status == 'completed'])
        failed_executions = len([e for e in executions if e.status == 'failed'])
        
        workflows = self.get_workflows(user_id)
        active_workflows = len([w for w in workflows if w.enabled])
        
        return {
            'total_executions': total_executions,
            'successful_executions': successful_executions,
            'failed_executions': failed_executions,
            'success_rate': round(successful_executions / total_executions * 100, 1) if total_executions > 0 else 0,
            'active_workflows': active_workflows,
            'total_workflows': len(workflows),
            'analyses_created': sum(len(e.created_analyses) for e in executions),
            'period_days': days
        }


# Service instance factory
def get_analysis_workflow_service(db: Session) -> AnalysisWorkflowService:
    """Get analysis workflow service instance"""
    return AnalysisWorkflowService(db)