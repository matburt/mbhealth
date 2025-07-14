import api from './api';
import { 
  AIAnalysisCreate, 
  AIAnalysisResponse,
  AIProvider,
  AIProviderCreate,
  AIProviderUpdate,
  ProviderTestRequest,
  ProviderTestResponse
} from '../types/aiAnalysis';
import { HealthData } from '../types/health';

interface SupportedProviderTypes {
  [key: string]: {
    name: string;
    description: string;
    required_config: string[];
  };
}

interface AnalysisStatus {
  id: number;
  status: string;
  progress?: number;
  error?: string;
  result?: any;
}

interface QueueStatus {
  pending: number;
  processing: number;
  failed: number;
  completed: number;
}

export const aiAnalysisService = {
  async getAnalysisHistory(): Promise<AIAnalysisResponse[]> {
    const response = await api.get<AIAnalysisResponse[]>('/ai-analysis/');
    return response.data;
  },

  async getAnalysis(id: number): Promise<AIAnalysisResponse> {
    const response = await api.get<AIAnalysisResponse>(`/ai-analysis/${id}`);
    return response.data;
  },

  async createAnalysis(analysis: AIAnalysisCreate): Promise<AIAnalysisResponse> {
    const response = await api.post<AIAnalysisResponse>('/ai-analysis/', analysis);
    return response.data;
  },

  async deleteAnalysis(id: number): Promise<void> {
    await api.delete(`/ai-analysis/${id}`);
  },

  async getHealthDataForAnalysis(): Promise<HealthData[]> {
    const response = await api.get<HealthData[]>('/health-data/');
    return response.data;
  },

  // AI Provider Management
  async getProviders(enabledOnly: boolean = false): Promise<AIProvider[]> {
    const params = enabledOnly ? '?enabled_only=true' : '';
    const response = await api.get<AIProvider[]>(`/ai-analysis/providers${params}`);
    return response.data;
  },

  async getProvider(id: string): Promise<AIProvider> {
    const response = await api.get<AIProvider>(`/ai-analysis/providers/${id}`);
    return response.data;
  },

  async createProvider(provider: AIProviderCreate): Promise<AIProvider> {
    const response = await api.post<AIProvider>('/ai-analysis/providers', provider);
    return response.data;
  },

  async updateProvider(id: string, provider: AIProviderUpdate): Promise<AIProvider> {
    const response = await api.put<AIProvider>(`/ai-analysis/providers/${id}`, provider);
    return response.data;
  },

  async deleteProvider(id: string): Promise<void> {
    await api.delete(`/ai-analysis/providers/${id}`);
  },

  async testProvider(id: string): Promise<ProviderTestResponse> {
    const response = await api.post<ProviderTestResponse>(`/ai-analysis/providers/${id}/test`);
    return response.data;
  },

  async testProviderConfig(config: ProviderTestRequest): Promise<ProviderTestResponse> {
    const response = await api.post<ProviderTestResponse>('/ai-analysis/providers/test', config);
    return response.data;
  },

  async getSupportedProviderTypes(): Promise<SupportedProviderTypes> {
    const response = await api.get('/ai-analysis/providers/types/supported');
    return response.data;
  },

  // Analysis Status and Jobs
  async getAnalysisStatus(id: number): Promise<AnalysisStatus> {
    const response = await api.get(`/ai-analysis/${id}/status`);
    return response.data;
  },

  async cancelAnalysis(id: number): Promise<void> {
    await api.post(`/ai-analysis/${id}/cancel`);
  },

  async getQueueStatus(): Promise<QueueStatus> {
    const response = await api.get('/ai-analysis/queue/status');
    return response.data;
  }
}; 