export interface AnalysisConfig {
  id: string;
  name: string;
  description?: string;
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider_id?: string;
  additional_context?: string;
  data_selection: {
    type: 'preset' | 'smart' | 'advanced' | 'manual' | 'visualization';
    config: {
      // For preset selection
      preset_id?: string;
      
      // For smart selection
      metric_types?: string[];
      time_range?: 'week' | 'month' | '7d' | '30d' | '90d';
      since_last_analysis?: boolean;
      recent_count?: number;
      
      // For advanced selection
      trending_data?: {
        enabled: boolean;
        min_strength: 'weak' | 'moderate' | 'strong';
      };
      anomalous_data?: {
        enabled: boolean;
        min_severity: 'low' | 'medium' | 'high';
      };
      time_of_day?: 'morning' | 'afternoon' | 'evening';
      
      // For manual selection
      health_data_ids?: number[];
      
      // For visualization selection
      filters?: {
        metric_type?: string;
        time_range?: string;
      };
    };
  };
  created_at: string;
  updated_at: string;
  is_favorite: boolean;
  usage_count: number;
  collection_id?: string;
}

export interface AnalysisCollection {
  id: string;
  name: string;
  description?: string;
  color?: string;
  configs: AnalysisConfig[];
  created_at: string;
  updated_at: string;
  is_default?: boolean;
}

export interface AnalysisConfigCreate {
  name: string;
  description?: string;
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider_id?: string;
  additional_context?: string;
  data_selection: AnalysisConfig['data_selection'];
  collection_id?: string;
}

export interface AnalysisConfigUpdate {
  name?: string;
  description?: string;
  analysis_type?: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider_id?: string;
  additional_context?: string;
  data_selection?: AnalysisConfig['data_selection'];
  is_favorite?: boolean;
  collection_id?: string;
  usage_count?: number;
}

export interface AnalysisCollectionCreate {
  name: string;
  description?: string;
  color?: string;
}

export interface AnalysisCollectionUpdate {
  name?: string;
  description?: string;
  color?: string;
}