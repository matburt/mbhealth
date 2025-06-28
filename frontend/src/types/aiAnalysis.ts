export interface AIAnalysisRequest {
  health_data_ids: number[];
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider: 'openai' | 'openrouter' | 'google';
  additional_context?: string;
}

export interface AIAnalysisResponse {
  id: number;
  user_id: number;
  health_data_ids: number[];
  analysis_type: string;
  provider: string;
  request_prompt: string;
  response_content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface AIAnalysisCreate {
  health_data_ids: number[];
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider: 'openai' | 'openrouter' | 'google';
  additional_context?: string;
}

// AI Provider Types (matching backend schemas)
export interface AIProvider {
  id: string;
  user_id: number;
  name: string;
  type: string;
  endpoint?: string;
  models?: any;
  default_model?: string;
  parameters?: any;
  enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface AIProviderCreate {
  name: string;
  type: string;
  endpoint?: string;
  api_key?: string;
  models?: any;
  default_model?: string;
  parameters?: any;
  enabled?: boolean;
  priority?: number;
}

export interface AIProviderUpdate {
  name?: string;
  type?: string;
  endpoint?: string;
  api_key?: string;
  models?: any;
  default_model?: string;
  parameters?: any;
  enabled?: boolean;
  priority?: number;
}

export interface ProviderTestRequest {
  type: string;
  endpoint?: string;
  api_key: string;
  model?: string;
}

export interface ProviderTestResponse {
  success: boolean;
  message: string;
  available_models?: string[];
  response_time?: number;
}

export interface SupportedProviderType {
  name: string;
  description: string;
  default_endpoint?: string;
  requires_api_key: boolean;
  supports_models: string[];
  cost_estimation: boolean;
}

export interface AnalysisType {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: string[];
} 