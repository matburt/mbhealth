import api from './api';
import { AIAnalysisCreate, AIAnalysisResponse } from '../types/aiAnalysis';

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

  async getHealthDataForAnalysis(): Promise<any[]> {
    const response = await api.get<any[]>('/health-data/');
    return response.data;
  }
}; 