export interface HealthData {
  id: number;
  user_id: number;
  metric_type: string;
  value: number;
  unit: string;
  systolic?: number;
  diastolic?: number;
  additional_data?: Record<string, unknown>;
  notes?: string;
  recorded_at: string;
  created_at: string;
  updated_at: string;
}

export interface HealthDataCreate {
  metric_type: string;
  value: number;
  unit: string;
  systolic?: number;
  diastolic?: number;
  additional_data?: Record<string, unknown>;
  notes?: string;
  recorded_at?: string;
}

export interface HealthDataUpdate {
  metric_type?: string;
  value?: number;
  unit?: string;
  systolic?: number;
  diastolic?: number;
  additional_data?: Record<string, unknown>;
  notes?: string;
  recorded_at?: string;
}

export interface HealthDataFilters {
  metric_type?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
} 