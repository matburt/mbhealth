import { 
  AnalysisWorkflow, 
  WorkflowExecution, 
  WorkflowStepResult, 
  AnalysisStep,
  ComparativeAnalysisConfig,
  FollowUpSuggestion,
  WORKFLOW_TEMPLATES,
  WorkflowTemplate
} from '../types/analysisWorkflow';
import { aiAnalysisService } from './aiAnalysis';
import { AIAnalysisCreate, AIAnalysisResponse } from '../types/aiAnalysis';
import { HealthData } from '../types/health';
import { findAnomalousData, findTrendingData } from '../utils/dataAnalysis';

const STORAGE_KEYS = {
  WORKFLOWS: 'mbhealth_analysis_workflows',
  EXECUTIONS: 'mbhealth_workflow_executions'
};

class AnalysisWorkflowService {
  // Workflow Management
  getWorkflows(): AnalysisWorkflow[] {
    const stored = localStorage.getItem(STORAGE_KEYS.WORKFLOWS);
    return stored ? JSON.parse(stored) : [];
  }

  getWorkflow(id: string): AnalysisWorkflow | null {
    const workflows = this.getWorkflows();
    return workflows.find(w => w.id === id) || null;
  }

  createWorkflow(template: WorkflowTemplate, name?: string): AnalysisWorkflow {
    const workflows = this.getWorkflows();
    const workflow: AnalysisWorkflow = {
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || template.name,
      description: template.description,
      steps: template.steps.map((step, index) => ({
        ...step,
        id: `step_${index}`,
        depends_on: step.depends_on || []
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_template: false,
      usage_count: 0,
      tags: [template.category]
    };
    
    workflows.push(workflow);
    localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(workflows));
    return workflow;
  }

  deleteWorkflow(id: string): boolean {
    const workflows = this.getWorkflows();
    const filteredWorkflows = workflows.filter(w => w.id !== id);
    
    if (filteredWorkflows.length === workflows.length) return false;
    
    localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(filteredWorkflows));
    return true;
  }

  incrementWorkflowUsage(id: string): void {
    const workflows = this.getWorkflows();
    const workflow = workflows.find(w => w.id === id);
    if (workflow) {
      workflow.usage_count++;
      workflow.updated_at = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.WORKFLOWS, JSON.stringify(workflows));
    }
  }

  // Workflow Execution Management
  getExecutions(): WorkflowExecution[] {
    const stored = localStorage.getItem(STORAGE_KEYS.EXECUTIONS);
    return stored ? JSON.parse(stored) : [];
  }

  getExecution(id: string): WorkflowExecution | null {
    const executions = this.getExecutions();
    return executions.find(e => e.id === id) || null;
  }

  createExecution(workflowId: string, initialDataIds: number[]): WorkflowExecution {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const execution: WorkflowExecution = {
      id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflow_id: workflowId,
      workflow_name: workflow.name,
      status: 'pending',
      current_step: 0,
      total_steps: workflow.steps.length,
      started_at: new Date().toISOString(),
      results: workflow.steps.map(step => ({
        step_id: step.id,
        step_name: step.name,
        status: 'pending',
        selected_data_ids: [],
        started_at: new Date().toISOString()
      })),
      initial_data_ids: initialDataIds
    };

    const executions = this.getExecutions();
    executions.push(execution);
    localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executions));
    
    // Increment workflow usage
    this.incrementWorkflowUsage(workflowId);
    
    return execution;
  }

  updateExecution(execution: WorkflowExecution): void {
    const executions = this.getExecutions();
    const index = executions.findIndex(e => e.id === execution.id);
    if (index !== -1) {
      executions[index] = execution;
      localStorage.setItem(STORAGE_KEYS.EXECUTIONS, JSON.stringify(executions));
    }
  }

  // Workflow Execution Engine
  async executeWorkflow(
    workflowId: string, 
    initialDataIds: number[],
    healthData: HealthData[],
    onStepUpdate?: (execution: WorkflowExecution) => void
  ): Promise<WorkflowExecution> {
    const workflow = this.getWorkflow(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    const execution = this.createExecution(workflowId, initialDataIds);
    execution.status = 'running';
    this.updateExecution(execution);

    try {
      // Get available providers
      const providers = await aiAnalysisService.getProviders(true);
      if (providers.length === 0) {
        throw new Error('No AI providers available');
      }

      let currentDataIds = [...initialDataIds];

      // Execute each step
      for (let i = 0; i < workflow.steps.length; i++) {
        const step = workflow.steps[i];
        const stepResult = execution.results[i];

        // Check if step should be executed based on conditions
        if (!this.shouldExecuteStep(step, execution.results.slice(0, i))) {
          stepResult.status = 'skipped';
          stepResult.completed_at = new Date().toISOString();
          continue;
        }

        // Update execution status
        execution.current_step = i;
        stepResult.status = 'running';
        stepResult.started_at = new Date().toISOString();
        this.updateExecution(execution);
        onStepUpdate?.(execution);

        try {
          // Prepare data for this step
          const stepDataIds = this.prepareStepData(step, currentDataIds, healthData, execution.results.slice(0, i));
          stepResult.selected_data_ids = stepDataIds;

          // Create analysis request
          const analysisRequest: AIAnalysisCreate = {
            health_data_ids: stepDataIds,
            analysis_type: step.analysis_type,
            provider: step.provider_preference || providers[0].id,
            additional_context: this.buildStepContext(step, execution.results.slice(0, i))
          };

          // Execute analysis
          const analysisResult = await aiAnalysisService.createAnalysis(analysisRequest);
          stepResult.analysis_id = analysisResult.id;
          
          // Wait for analysis to complete (simplified - in real implementation, use WebSocket)
          await this.waitForAnalysisCompletion(analysisResult.id);
          
          const completedAnalysis = await aiAnalysisService.getAnalysis(analysisResult.id);
          stepResult.analysis_result = completedAnalysis;

          // Generate follow-up suggestions
          stepResult.follow_up_suggestions = this.generateFollowUpSuggestions(completedAnalysis, step);

          // Update data for next step if needed
          if (step.data_selection.type === 'filter') {
            currentDataIds = stepDataIds;
          }

          stepResult.status = 'completed';
          stepResult.completed_at = new Date().toISOString();

        } catch (error) {
          stepResult.status = 'failed';
          stepResult.error_message = error instanceof Error ? error.message : 'Unknown error';
          stepResult.completed_at = new Date().toISOString();
          
          // Decide whether to continue or stop the workflow
          if (step.condition?.type === 'always' || this.isCriticalStep(step)) {
            execution.status = 'failed';
            execution.error_message = `Critical step failed: ${stepResult.error_message}`;
            break;
          }
        }

        this.updateExecution(execution);
        onStepUpdate?.(execution);
      }

      // Mark execution as completed if not already failed
      if (execution.status !== 'failed') {
        execution.status = 'completed';
        execution.completed_at = new Date().toISOString();
      }

    } catch (error) {
      execution.status = 'failed';
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';
      execution.completed_at = new Date().toISOString();
    }

    this.updateExecution(execution);
    onStepUpdate?.(execution);
    return execution;
  }

  private shouldExecuteStep(step: AnalysisStep, previousResults: WorkflowStepResult[]): boolean {
    if (!step.condition || step.condition.type === 'always') {
      return true;
    }

    switch (step.condition.type) {
      case 'anomaly_found':
        return previousResults.some(result => 
          result.analysis_result?.response_content?.toLowerCase().includes('anomal')
        );
      case 'trend_detected':
        return previousResults.some(result => 
          result.analysis_result?.response_content?.toLowerCase().includes('trend')
        );
      case 'result_contains': {
        const searchTerm = step.condition.config?.search_term?.toLowerCase();
        return searchTerm ? previousResults.some(result => 
          result.analysis_result?.response_content?.toLowerCase().includes(searchTerm)
        ) : true;
      }
      default:
        return true;
    }
  }

  private prepareStepData(
    step: AnalysisStep, 
    currentDataIds: number[], 
    healthData: HealthData[], 
    
  ): number[] {
    const currentData = healthData.filter(d => currentDataIds.includes(d.id));

    switch (step.data_selection.type) {
      case 'inherit':
        return currentDataIds;

      case 'filter': {
        const config = step.data_selection.config;
        let filteredData = currentData;

        if (config?.filter_by?.metric_types) {
          filteredData = filteredData.filter(d => 
            config.filter_by!.metric_types!.includes(d.metric_type)
          );
        }

        if (config?.filter_by?.anomalies_only) {
          const anomalousData = findAnomalousData(currentData, 'low');
          filteredData = filteredData.filter(d => 
            anomalousData.some(a => a.id === d.id)
          );
        }

        if (config?.filter_by?.trending_only) {
          const trendingData = findTrendingData(currentData, 0.5, 'weak');
          filteredData = filteredData.filter(d => 
            trendingData.some(t => t.id === d.id)
          );
        }

        return filteredData.map(d => d.id);
      }

      case 'extend': {
        // Add more data based on extend configuration
        const extendedData = [...currentData];
        const extendConfig = step.data_selection.config?.extend_with;

        if (extendConfig?.metric_types) {
          const additionalData = healthData.filter(d => 
            !currentDataIds.includes(d.id) && 
            extendConfig.metric_types!.includes(d.metric_type)
          );
          extendedData.push(...additionalData);
        }

        return extendedData.map(d => d.id);
      }

      case 'custom':
        // Handle custom data selection logic
        return step.data_selection.config?.custom_selection?.health_data_ids || currentDataIds;

      default:
        return currentDataIds;
    }
  }

  private buildStepContext(step: AnalysisStep, previousResults: WorkflowStepResult[]): string {
    let context = step.additional_context || '';

    // Add context from previous steps if dependencies exist
    if (step.depends_on && step.depends_on.length > 0) {
      const dependentResults = previousResults.filter(result => 
        step.depends_on!.includes(result.step_id)
      );

      if (dependentResults.length > 0) {
        context += '\n\nContext from previous steps:\n';
        dependentResults.forEach(result => {
          if (result.analysis_result?.response_content) {
            const summary = result.analysis_result.response_content.slice(0, 200) + '...';
            context += `\n- ${result.step_name}: ${summary}`;
          }
        });
      }
    }

    return context;
  }

  private async waitForAnalysisCompletion(analysisId: number): Promise<void> {
    // Simplified polling - in production, use WebSocket
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max

    while (attempts < maxAttempts) {
      const status = await aiAnalysisService.getAnalysisStatus(analysisId);
      
      if (status.status === 'completed' || status.status === 'failed') {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;
    }

    throw new Error('Analysis timed out');
  }

  private generateFollowUpSuggestions(analysis: AIAnalysisResponse, step: AnalysisStep): FollowUpSuggestion[] {
    const suggestions: FollowUpSuggestion[] = [];
    const content = analysis.response_content?.toLowerCase() || '';

    // Generate suggestions based on analysis type and content
    if (step.analysis_type === 'anomalies' && content.includes('anomal')) {
      suggestions.push({
        type: 'analysis',
        title: 'Investigate Anomaly Patterns',
        description: 'Perform deeper analysis of the detected anomalies to understand their cause',
        priority: 'high',
        suggested_analysis: {
          analysis_type: 'insights',
          data_selection: { type: 'filter', config: { filter_by: { anomalies_only: true } } },
          context: 'Focus on the specific anomalous readings to understand patterns and potential causes'
        }
      });
    }

    if (step.analysis_type === 'trends' && (content.includes('increas') || content.includes('decreas'))) {
      suggestions.push({
        type: 'analysis',
        title: 'Predictive Trend Analysis',
        description: 'Analyze where current trends might lead in the future',
        priority: 'medium',
        suggested_analysis: {
          analysis_type: 'insights',
          data_selection: { type: 'inherit' },
          context: 'Based on detected trends, analyze potential future trajectory and implications'
        }
      });
    }

    if (content.includes('consult') || content.includes('doctor') || content.includes('medical')) {
      suggestions.push({
        type: 'consultation',
        title: 'Medical Consultation Recommended',
        description: 'Consider discussing these findings with a healthcare provider',
        priority: 'high',
        action_items: [
          'Schedule appointment with primary care physician',
          'Prepare summary of recent health data',
          'List any symptoms or concerns'
        ]
      });
    }

    return suggestions;
  }

  private isCriticalStep(step: AnalysisStep): boolean {
    // Define which steps are critical for workflow continuation
    return step.analysis_type === 'anomalies' || 
           step.name.toLowerCase().includes('critical') ||
           step.name.toLowerCase().includes('risk');
  }

  // Comparative Analysis
  async executeComparativeAnalysis(config: ComparativeAnalysisConfig): Promise<AIAnalysisResponse> {
    const currentAnalysis = await aiAnalysisService.getAnalysis(config.current_analysis_id);
    let comparisonAnalysis: AIAnalysisResponse | null = null;

    // Get comparison analysis based on type
    switch (config.comparison_type) {
      case 'previous_analysis':
        if (config.comparison_config.previous_analysis_id) {
          comparisonAnalysis = await aiAnalysisService.getAnalysis(
            config.comparison_config.previous_analysis_id
          );
        }
        break;
      
      case 'time_period':
        // Find analysis from specified time period
        // Implementation would filter by time period based on config
        break;
      
      case 'similar_data':
        // Find analysis with similar data characteristics
        // Implementation would match based on criteria
        break;
    }

    // Create comparative analysis request
    const providers = await aiAnalysisService.getProviders(true);
    if (providers.length === 0) throw new Error('No AI providers available');

    const comparativeRequest: AIAnalysisCreate = {
      health_data_ids: currentAnalysis.health_data_ids,
      analysis_type: 'insights',
      provider: providers[0].id,
      additional_context: this.buildComparativeContext(currentAnalysis, comparisonAnalysis, config)
    };

    return await aiAnalysisService.createAnalysis(comparativeRequest);
  }

  private buildComparativeContext(
    current: AIAnalysisResponse, 
    comparison: AIAnalysisResponse | null, 
    config: ComparativeAnalysisConfig
  ): string {
    let context = 'COMPARATIVE ANALYSIS REQUEST:\n\n';
    
    context += `Current Analysis (${current.created_at}):\n`;
    context += `Type: ${current.analysis_type}\n`;
    context += `Data points: ${current.health_data_ids.length}\n`;
    if (current.response_content) {
      context += `Key findings: ${current.response_content.slice(0, 300)}...\n\n`;
    }

    if (comparison) {
      context += `Comparison Analysis (${comparison.created_at}):\n`;
      context += `Type: ${comparison.analysis_type}\n`;
      context += `Data points: ${comparison.health_data_ids.length}\n`;
      if (comparison.response_content) {
        context += `Key findings: ${comparison.response_content.slice(0, 300)}...\n\n`;
      }
    }

    context += `Please compare these analyses focusing on: ${config.focus_areas.join(', ')}\n`;
    context += 'Highlight key differences, improvements, deteriorations, and patterns.';

    return context;
  }

  // Templates
  getWorkflowTemplates(): WorkflowTemplate[] {
    return WORKFLOW_TEMPLATES;
  }

  getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return WORKFLOW_TEMPLATES.filter(t => t.category === category);
  }
}

export const analysisWorkflowService = new AnalysisWorkflowService();