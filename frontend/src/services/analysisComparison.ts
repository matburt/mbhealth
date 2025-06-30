import api from './api';

// Comparison Types
export interface ComparisonRequest {
  analysis_ids: number[];
  comparison_type: 'side_by_side' | 'temporal_trend' | 'provider_performance';
  include_statistical_analysis?: boolean;
  focus_areas?: string[];
  save_comparison?: boolean;
  comparison_name?: string;
}

export interface ComparisonResult {
  comparison_id: string;
  analysis_ids: number[];
  comparison_type: string;
  summary: Record<string, any>;
  differences: ComparisonDifference[];
  similarities: ComparisonSimilarity[];
  statistical_analysis?: Record<string, any>;
  recommendations: string[];
  confidence_score?: number;
}

export interface ComparisonDifference {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ComparisonSimilarity {
  type: string;
  description: string;
  strength: 'low' | 'medium' | 'high';
}

// Trend Analysis Types
export interface TrendAnalysisRequest {
  analysis_type?: string;
  metric_focus?: string;
  period_start: string;
  period_end: string;
  min_data_points?: number;
  include_projections?: boolean;
  statistical_tests?: string[];
}

export interface TrendAnalysisResult {
  trend_id: string;
  analysis_ids: number[];
  time_period: { start: string; end: string };
  trend_direction: string;
  trend_strength: number;
  key_insights: string[];
  statistical_data: Record<string, any>;
  projections?: Record<string, any>;
  improvement_metrics?: Record<string, any>;
}

// Provider Performance Types
export interface ProviderPerformanceRequest {
  provider_ids?: string[];
  period_start: string;
  period_end: string;
  metrics?: string[];
  include_recommendations?: boolean;
  analysis_type_filter?: string;
}

export interface ProviderComparisonResult {
  providers: ProviderInfo[];
  comparison_period: { start: string; end: string };
  metrics: Record<string, Record<string, number>>;
  rankings: Record<string, string[]>;
  recommendations: Record<string, string>;
  cost_analysis: Record<string, any>;
  efficiency_analysis: Record<string, any>;
}

export interface ProviderInfo {
  name: string;
  analysis_count: number;
}

// Saved Comparison Types
export interface AnalysisComparison {
  id: string;
  user_id: number;
  name: string;
  description?: string;
  analysis_ids: number[];
  comparison_type: string;
  comparison_criteria?: Record<string, any>;
  comparison_results?: Record<string, any>;
  key_differences?: Record<string, any>;
  statistical_insights?: Record<string, any>;
  trend_analysis?: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_shared: boolean;
}

export interface AnalysisComparisonCreate {
  name: string;
  description?: string;
  analysis_ids: number[];
  comparison_type: string;
  comparison_criteria?: Record<string, any>;
}

export interface AnalysisComparisonUpdate {
  name?: string;
  description?: string;
  comparison_criteria?: Record<string, any>;
  is_shared?: boolean;
}

// Provider Performance Metrics Types
export interface ProviderPerformanceMetrics {
  id: string;
  provider_id: string;
  user_id: number;
  period_start: string;
  period_end: string;
  period_type: string;
  total_analyses: number;
  successful_analyses: number;
  failed_analyses: number;
  avg_processing_time?: number;
  total_cost?: number;
  avg_cost_per_analysis?: number;
  avg_response_length?: number;
  avg_token_usage?: number;
  user_satisfaction_score?: number;
  analysis_type_breakdown?: Record<string, number>;
  success_rate?: number;
  efficiency_score?: number;
  reliability_score?: number;
  calculated_at: string;
}

// Analysis Trend Types
export interface AnalysisTrend {
  id: string;
  user_id: number;
  trend_type: string;
  analysis_type?: string;
  metric_focus?: string;
  period_start: string;
  period_end: string;
  data_points_count: number;
  trend_direction?: string;
  trend_strength?: number;
  confidence_level?: number;
  correlation_coefficient?: number;
  regression_data?: Record<string, any>;
  seasonal_patterns?: Record<string, any>;
  outliers?: Record<string, any>[];
  key_insights?: string[];
  improvement_suggestions?: string[];
  next_analysis_suggestions?: string[];
  improvement_percentage?: number;
  rate_of_change?: number;
  calculated_at: string;
  last_updated: string;
  is_significant: boolean;
}

// Improvement Suggestion Types
export interface AnalysisImprovementSuggestion {
  id: string;
  user_id: number;
  analysis_id?: number;
  suggestion_type: string;
  priority_level: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  detailed_explanation?: string;
  action_steps?: string[];
  expected_improvement?: string;
  effort_level?: 'low' | 'medium' | 'high';
  implementation_time?: string;
  supporting_data?: Record<string, any>;
  related_analyses?: number[];
  success_examples?: Record<string, any>[];
  status: 'pending' | 'acknowledged' | 'implemented' | 'dismissed';
  user_feedback?: string;
  implementation_notes?: string;
  implemented_at?: string;
  effectiveness_score?: number;
  follow_up_analysis_ids?: number[];
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface AnalysisImprovementSuggestionCreate {
  analysis_id?: number;
  suggestion_type: string;
  priority_level: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  detailed_explanation?: string;
  action_steps?: string[];
}

export interface AnalysisImprovementSuggestionUpdate {
  status?: 'pending' | 'acknowledged' | 'implemented' | 'dismissed';
  user_feedback?: string;
  implementation_notes?: string;
  effectiveness_score?: number;
}

class AnalysisComparisonService {
  // Real-time Comparison Methods
  async compareAnalyses(request: ComparisonRequest): Promise<ComparisonResult> {
    const response = await api.post('/analysis-comparison/compare', request);
    return response.data;
  }

  async analyzeTrends(request: TrendAnalysisRequest): Promise<TrendAnalysisResult> {
    const response = await api.post('/analysis-comparison/trends/analyze', request);
    return response.data;
  }

  async analyzeProviderPerformance(request: ProviderPerformanceRequest): Promise<ProviderComparisonResult> {
    const response = await api.post('/analysis-comparison/providers/performance', request);
    return response.data;
  }

  // Saved Comparisons Management
  async createComparison(comparison: AnalysisComparisonCreate): Promise<AnalysisComparison> {
    const response = await api.post('/analysis-comparison/', comparison);
    return response.data;
  }

  async getComparisons(limit: number = 50): Promise<AnalysisComparison[]> {
    const response = await api.get('/analysis-comparison/', { params: { limit } });
    return response.data;
  }

  async getComparison(comparisonId: string): Promise<AnalysisComparison> {
    const response = await api.get(`/analysis-comparison/${comparisonId}`);
    return response.data;
  }

  async updateComparison(comparisonId: string, update: AnalysisComparisonUpdate): Promise<AnalysisComparison> {
    const response = await api.put(`/analysis-comparison/${comparisonId}`, update);
    return response.data;
  }

  async deleteComparison(comparisonId: string): Promise<void> {
    await api.delete(`/analysis-comparison/${comparisonId}`);
  }

  // Provider Performance Metrics
  async getProviderMetrics(
    providerId?: string,
    periodType: string = 'monthly',
    limit: number = 12
  ): Promise<ProviderPerformanceMetrics[]> {
    const params: any = { period_type: periodType, limit };
    if (providerId) params.provider_id = providerId;
    
    const response = await api.get('/analysis-comparison/providers/metrics', { params });
    return response.data;
  }

  // Analysis Trends
  async getAnalysisTrends(
    trendType?: string,
    analysisType?: string,
    significantOnly: boolean = false,
    limit: number = 20
  ): Promise<AnalysisTrend[]> {
    const params: any = { significant_only: significantOnly, limit };
    if (trendType) params.trend_type = trendType;
    if (analysisType) params.analysis_type = analysisType;
    
    const response = await api.get('/analysis-comparison/trends/', { params });
    return response.data;
  }

  // Improvement Suggestions
  async createImprovementSuggestion(suggestion: AnalysisImprovementSuggestionCreate): Promise<AnalysisImprovementSuggestion> {
    const response = await api.post('/analysis-comparison/suggestions/', suggestion);
    return response.data;
  }

  async getImprovementSuggestions(
    statusFilter?: string,
    priorityFilter?: string,
    categoryFilter?: string,
    limit: number = 50
  ): Promise<AnalysisImprovementSuggestion[]> {
    const params: any = { limit };
    if (statusFilter) params.status_filter = statusFilter;
    if (priorityFilter) params.priority_filter = priorityFilter;
    if (categoryFilter) params.category_filter = categoryFilter;
    
    const response = await api.get('/analysis-comparison/suggestions/', { params });
    return response.data;
  }

  async updateImprovementSuggestion(
    suggestionId: string, 
    update: AnalysisImprovementSuggestionUpdate
  ): Promise<AnalysisImprovementSuggestion> {
    const response = await api.put(`/analysis-comparison/suggestions/${suggestionId}`, update);
    return response.data;
  }

  // Analytics Summary
  async getAnalyticsSummary(): Promise<{
    total_comparisons: number;
    significant_trends: number;
    pending_suggestions: number;
    recent_provider_metrics: number;
    has_comparison_data: boolean;
  }> {
    const response = await api.get('/analysis-comparison/analytics/summary');
    return response.data;
  }
}

export const analysisComparisonService = new AnalysisComparisonService();