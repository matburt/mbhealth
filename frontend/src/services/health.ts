import api from './api';
import { HealthData, HealthDataCreate, HealthDataUpdate, HealthDataFilters } from '../types/health';

export const healthService = {
  async getHealthData(filters?: HealthDataFilters): Promise<HealthData[]> {
    const params = new URLSearchParams();
    if (filters?.metric_type) params.append('metric_type', filters.metric_type);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await api.get<HealthData[]>(`/health-data/?${params.toString()}`);
    return response.data;
  },

  async getHealthDataById(id: number): Promise<HealthData> {
    const response = await api.get<HealthData>(`/health-data/${id}`);
    return response.data;
  },

  async createHealthData(data: HealthDataCreate): Promise<HealthData> {
    const response = await api.post<HealthData>('/health-data/', data);
    return response.data;
  },

  async updateHealthData(id: number, data: HealthDataUpdate): Promise<HealthData> {
    const response = await api.put<HealthData>(`/health-data/${id}`, data);
    return response.data;
  },

  async deleteHealthData(id: number): Promise<void> {
    await api.delete(`/health-data/${id}`);
  },

  async getRecentHealthData(limit: number = 5): Promise<HealthData[]> {
    return this.getHealthData({ limit });
  },

  async getHealthDataByType(metricType: string, limit?: number): Promise<HealthData[]> {
    return this.getHealthData({ metric_type: metricType, limit });
  }
}; 