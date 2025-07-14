import api from './api';

interface AnalysisHistoryItem {
  id: number;
  action: string;
  created_at: string;
  [key: string]: unknown; // Allow additional properties
}

export interface AnalysisSchedule {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  schedule_type: 'recurring' | 'one_time' | 'data_threshold';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval_value?: number;
  interval_unit?: 'days' | 'weeks' | 'months';
  time_of_day?: string; // HH:MM format
  days_of_week?: string[];
  day_of_month?: number;
  data_threshold_count?: number;
  data_threshold_metric?: string;
  analysis_types: string[];
  data_selection_config: {
    metric_types?: string[];
    date_range?: {
      type: 'last_n_days' | 'custom';
      days?: number;
      start_date?: string;
      end_date?: string;
    };
    limit?: number;
  };
  provider_id?: string;
  additional_context?: string;
  enabled: boolean;
  next_run_at?: string;
  last_run_at?: string;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface AnalysisScheduleCreate {
  name: string;
  description?: string;
  schedule_type: 'recurring' | 'one_time' | 'data_threshold';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval_value?: number;
  interval_unit?: 'days' | 'weeks' | 'months';
  time_of_day?: string;
  days_of_week?: string[];
  day_of_month?: number;
  data_threshold_count?: number;
  data_threshold_metric?: string;
  analysis_types: string[];
  data_selection_config: {
    metric_types?: string[];
    date_range?: {
      type: 'last_n_days' | 'custom';
      days?: number;
      start_date?: string;
      end_date?: string;
    };
    limit?: number;
  };
  provider_id?: string;
  additional_context?: string;
  enabled?: boolean;
}

export interface AnalysisScheduleUpdate {
  name?: string;
  description?: string;
  schedule_type?: 'recurring' | 'one_time' | 'data_threshold';
  frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval_value?: number;
  interval_unit?: 'days' | 'weeks' | 'months';
  time_of_day?: string;
  days_of_week?: string[];
  day_of_month?: number;
  data_threshold_count?: number;
  data_threshold_metric?: string;
  analysis_types?: string[];
  data_selection_config?: {
    metric_types?: string[];
    date_range?: {
      type: 'last_n_days' | 'custom';
      days?: number;
      start_date?: string;
      end_date?: string;
    };
    limit?: number;
  };
  provider_id?: string;
  additional_context?: string;
  enabled?: boolean;
}

export interface AnalysisScheduleExecution {
  id: string;
  schedule_id: string;
  user_id: number;
  started_at: string;
  completed_at?: string;
  status: 'running' | 'completed' | 'failed';
  execution_type: 'scheduled' | 'manual' | 'data_triggered';
  trigger_data?: Record<string, unknown>;
  analyses_created?: number[];
  analyses_count: number;
  success_count: number;
  failure_count: number;
  error_message?: string;
  retry_count: number;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  schedule_type: string;
  frequency?: string;
  time_of_day?: string;
  days_of_week?: string[];
  day_of_month?: number;
  data_threshold_count?: number;
  data_threshold_metric?: string;
  analysis_types: string[];
  data_selection_config: Record<string, unknown>;
  parameters?: Record<string, {
    type: 'string' | 'number' | 'select' | 'array' | 'time' | 'boolean';
    description: string;
    default: unknown;
    options?: string[];
    min?: number;
    max?: number;
  }>;
}

export interface ScheduleListResponse {
  schedules: AnalysisSchedule[];
  total_count: number;
  active_count: number;
  next_executions: Array<{
    schedule_id: string;
    schedule_name: string;
    next_run_at: string;
    analysis_types: string[];
  }>;
}

// Schedule Management
export const getSchedules = async (enabledOnly: boolean = false): Promise<ScheduleListResponse> => {
  const response = await api.get(`/analysis-schedules/?enabled_only=${enabledOnly}`);
  return response.data;
};

export const getSchedule = async (scheduleId: string): Promise<AnalysisSchedule> => {
  const response = await api.get(`/analysis-schedules/${scheduleId}`);
  return response.data;
};

export const createSchedule = async (scheduleData: AnalysisScheduleCreate): Promise<AnalysisSchedule> => {
  const response = await api.post('/analysis-schedules/', scheduleData);
  return response.data;
};

export const updateSchedule = async (
  scheduleId: string,
  scheduleData: AnalysisScheduleUpdate
): Promise<AnalysisSchedule> => {
  const response = await api.put(`/analysis-schedules/${scheduleId}`, scheduleData);
  return response.data;
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  await api.delete(`/analysis-schedules/${scheduleId}`);
};

export const enableSchedule = async (scheduleId: string): Promise<void> => {
  await api.post(`/analysis-schedules/${scheduleId}/enable`);
};

export const disableSchedule = async (scheduleId: string): Promise<void> => {
  await api.post(`/analysis-schedules/${scheduleId}/disable`);
};

export const executeScheduleNow = async (
  scheduleId: string,
  executionType: string = 'manual'
): Promise<AnalysisScheduleExecution> => {
  const response = await api.post(`/analysis-schedules/${scheduleId}/execute`, {
    schedule_id: scheduleId,
    execution_type: executionType,
  });
  return response.data;
};

// Execution History
export const getScheduleExecutions = async (
  scheduleId: string,
  limit: number = 50
): Promise<AnalysisScheduleExecution[]> => {
  const response = await api.get(`/analysis-schedules/${scheduleId}/executions?limit=${limit}`);
  return response.data;
};

export const getAllExecutions = async (limit: number = 100): Promise<AnalysisScheduleExecution[]> => {
  const response = await api.get(`/analysis-schedules/executions/all?limit=${limit}`);
  return response.data;
};

// Templates
export const getScheduleTemplates = async (): Promise<ScheduleTemplate[]> => {
  const response = await api.get('/analysis-schedules/templates/');
  return response.data;
};

export const createFromTemplate = async (
  templateId: string,
  customizations?: Record<string, unknown>
): Promise<AnalysisSchedule> => {
  const response = await api.post(`/analysis-schedules/templates/${templateId}`, customizations);
  return response.data;
};

// History and Analytics
export const getUserAnalysisHistory = async (
  limit: number = 100,
  actionFilter?: string
): Promise<AnalysisHistoryItem[]> => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (actionFilter) params.append('action_filter', actionFilter);
  
  const response = await api.get(`/analysis-schedules/history/user?${params}`);
  return response.data;
};

export const getAnalysisHistory = async (analysisId: number): Promise<AnalysisHistoryItem[]> => {
  const response = await api.get(`/analysis-schedules/history/analysis/${analysisId}`);
  return response.data;
};

export const getRecentActivity = async (days: number = 7): Promise<AnalysisHistoryItem[]> => {
  const response = await api.get(`/analysis-schedules/history/recent?days=${days}`);
  return response.data;
};

export const getActivityStats = async (days: number = 30): Promise<Record<string, unknown>> => {
  const response = await api.get(`/analysis-schedules/history/stats?days=${days}`);
  return response.data;
};

export const getAnalysisInteractionSummary = async (analysisId: number): Promise<Record<string, unknown>> => {
  const response = await api.get(`/analysis-schedules/history/analysis/${analysisId}/summary`);
  return response.data;
};