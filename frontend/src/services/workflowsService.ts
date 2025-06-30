import api from './api';

export interface WorkflowCondition {
  type: string;
  field?: string;
  value: any;
  operator: string;
}

export interface WorkflowStep {
  name: string;
  analysis_type: string;
  delay_minutes: number;
  additional_context: string;
  conditions: WorkflowCondition[];
  continue_on_failure?: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  trigger_analysis_type: string;
  trigger_conditions: WorkflowCondition[];
  workflow_steps: WorkflowStep[];
  auto_execute: boolean;
  max_concurrent_executions: number;
  enabled: boolean;
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  last_executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  execution_type: string;
  current_step: number;
  total_steps: number;
  step_results: any[];
  created_analyses: number[];
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category?: string;
  trigger_analysis_type: string;
  trigger_conditions: WorkflowCondition[];
  workflow_steps: WorkflowStep[];
  usage_count: number;
  created_at: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger_analysis_type: string;
  trigger_conditions?: WorkflowCondition[];
  workflow_steps: WorkflowStep[];
  auto_execute?: boolean;
  max_concurrent_executions?: number;
  enabled?: boolean;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  trigger_conditions?: WorkflowCondition[];
  workflow_steps?: WorkflowStep[];
  auto_execute?: boolean;
  max_concurrent_executions?: number;
  enabled?: boolean;
}

export interface CreateFromTemplateRequest {
  template_id: string;
  name?: string;
  description?: string;
  trigger_conditions?: WorkflowCondition[];
  workflow_steps?: WorkflowStep[];
  auto_execute?: boolean;
  enabled?: boolean;
}

export interface WorkflowStatistics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  active_workflows: number;
  total_workflows: number;
  analyses_created: number;
  period_days: number;
}

const workflowsService = {
  // Workflow management
  async getWorkflows(enabledOnly: boolean = false): Promise<Workflow[]> {
    const params = enabledOnly ? '?enabled_only=true' : '';
    const response = await api.get(`/analysis-workflows/${params}`);
    return response.data;
  },

  async getWorkflow(workflowId: string): Promise<Workflow> {
    const response = await api.get(`/analysis-workflows/${workflowId}`);
    return response.data;
  },

  async createWorkflow(workflowData: CreateWorkflowRequest): Promise<Workflow> {
    const response = await api.post('/analysis-workflows/', workflowData);
    return response.data;
  },

  async updateWorkflow(workflowId: string, workflowData: UpdateWorkflowRequest): Promise<Workflow> {
    const response = await api.put(`/analysis-workflows/${workflowId}`, workflowData);
    return response.data;
  },

  async deleteWorkflow(workflowId: string): Promise<void> {
    await api.delete(`/analysis-workflows/${workflowId}`);
  },

  // Workflow templates
  async getWorkflowTemplates(): Promise<WorkflowTemplate[]> {
    const response = await api.get('/analysis-workflows/templates/');
    return response.data;
  },

  async createWorkflowFromTemplate(templateData: CreateFromTemplateRequest): Promise<Workflow> {
    const response = await api.post('/analysis-workflows/from-template/', templateData);
    return response.data;
  },

  // Workflow executions
  async getWorkflowExecutions(workflowId: string, limit: number = 50): Promise<WorkflowExecution[]> {
    const response = await api.get(`/analysis-workflows/${workflowId}/executions?limit=${limit}`);
    return response.data;
  },

  async getAllWorkflowExecutions(limit: number = 50): Promise<WorkflowExecution[]> {
    const response = await api.get(`/analysis-workflows/executions/?limit=${limit}`);
    return response.data;
  },

  // Statistics
  async getWorkflowStatistics(days: number = 30): Promise<WorkflowStatistics> {
    const response = await api.get(`/analysis-workflows/statistics/?days=${days}`);
    return response.data;
  },

  // Utility functions
  getAnalysisTypeOptions(): { value: string; label: string }[] {
    return [
      { value: 'trends', label: 'Trends Analysis' },
      { value: 'insights', label: 'Health Insights' },
      { value: 'recommendations', label: 'Recommendations' },
      { value: 'anomalies', label: 'Anomaly Detection' }
    ];
  },

  getConditionTypeOptions(): { value: string; label: string }[] {
    return [
      { value: 'analysis_status', label: 'Analysis Status' },
      { value: 'content_contains', label: 'Content Contains' },
      { value: 'analysis_completed', label: 'Analysis Completed' },
      { value: 'error_occurred', label: 'Error Occurred' },
      { value: 'processing_time', label: 'Processing Time' }
    ];
  },

  getOperatorOptions(conditionType: string): { value: string; label: string }[] {
    switch (conditionType) {
      case 'analysis_status':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'not_equals', label: 'Not Equals' },
          { value: 'in', label: 'In' }
        ];
      case 'content_contains':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'not_contains', label: 'Does Not Contain' },
          { value: 'starts_with', label: 'Starts With' },
          { value: 'ends_with', label: 'Ends With' }
        ];
      case 'processing_time':
        return [
          { value: 'greater_than', label: 'Greater Than' },
          { value: 'less_than', label: 'Less Than' },
          { value: 'equals', label: 'Equals' },
          { value: 'greater_equal', label: 'Greater Than or Equal' },
          { value: 'less_equal', label: 'Less Than or Equal' }
        ];
      default:
        return [{ value: 'equals', label: 'Equals' }];
    }
  },

  formatExecutionStatus(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'running':
        return 'Running';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  },

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'running':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'cancelled':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }
};

export default workflowsService;