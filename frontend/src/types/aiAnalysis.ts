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
  status: 'pending' | 'completed' | 'failed';
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

export interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  available_models: string[];
}

export interface AnalysisType {
  id: string;
  name: string;
  description: string;
  icon: string;
  examples: string[];
} 