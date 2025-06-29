import { AIAnalysisResponse } from './aiAnalysis';

export interface AnalysisStep {
  id: string;
  name: string;
  description: string;
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  data_selection: {
    type: 'inherit' | 'filter' | 'extend' | 'custom';
    config?: {
      // For 'filter' - reduce data from previous step
      filter_by?: {
        metric_types?: string[];
        time_range?: string;
        anomalies_only?: boolean;
        trending_only?: boolean;
      };
      // For 'extend' - add more data to previous step
      extend_with?: {
        metric_types?: string[];
        time_range?: string;
      };
      // For 'custom' - completely new data selection
      custom_selection?: any;
    };
  };
  provider_preference?: string;
  additional_context?: string;
  depends_on?: string[]; // IDs of previous steps this depends on
  condition?: {
    // Only run this step if condition is met
    type: 'result_contains' | 'anomaly_found' | 'trend_detected' | 'always';
    config?: any;
  };
}

export interface AnalysisWorkflow {
  id: string;
  name: string;
  description: string;
  steps: AnalysisStep[];
  created_at: string;
  updated_at: string;
  is_template: boolean;
  usage_count: number;
  tags: string[];
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  total_steps: number;
  started_at: string;
  completed_at?: string;
  results: WorkflowStepResult[];
  initial_data_ids: number[];
  error_message?: string;
}

export interface WorkflowStepResult {
  step_id: string;
  step_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  analysis_id?: number;
  analysis_result?: AIAnalysisResponse;
  selected_data_ids: number[];
  started_at: string;
  completed_at?: string;
  error_message?: string;
  follow_up_suggestions?: FollowUpSuggestion[];
}

export interface FollowUpSuggestion {
  type: 'analysis' | 'data_collection' | 'consultation' | 'lifestyle';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  suggested_analysis?: {
    analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
    data_selection: any;
    context: string;
  };
  action_items?: string[];
}

export interface ComparativeAnalysisConfig {
  current_analysis_id: number;
  comparison_type: 'previous_analysis' | 'time_period' | 'similar_data';
  comparison_config: {
    // For 'previous_analysis'
    previous_analysis_id?: number;
    
    // For 'time_period'  
    time_period?: {
      period: 'week' | 'month' | 'quarter' | 'year';
      offset: number; // how many periods back
    };
    
    // For 'similar_data'
    similar_criteria?: {
      same_metrics: boolean;
      same_time_range: boolean;
      similar_anomaly_count: boolean;
    };
  };
  focus_areas: ('trends' | 'values' | 'patterns' | 'anomalies')[];
}

export interface PredictiveAnalysisConfig {
  historical_data_range: {
    start_date: string;
    end_date: string;
  };
  prediction_horizon: {
    period: 'days' | 'weeks' | 'months';
    count: number;
  };
  metrics_to_predict: string[];
  confidence_level: number; // 0.8, 0.9, 0.95
  factors_to_consider: {
    seasonal_patterns: boolean;
    trend_acceleration: boolean;
    anomaly_frequency: boolean;
    external_factors: string[];
  };
}

// Predefined workflow templates
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'health_monitoring' | 'diagnostic' | 'preventive' | 'research';
  icon: string;
  steps: Omit<AnalysisStep, 'id'>[];
  estimated_duration: string;
  data_requirements: {
    min_data_points: number;
    required_metrics: string[];
    time_span_days: number;
  };
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'comprehensive_health_assessment',
    name: 'Comprehensive Health Assessment',
    description: 'Complete health analysis with trends, anomalies, and recommendations',
    category: 'health_monitoring',
    icon: '🏥',
    estimated_duration: '5-10 minutes',
    data_requirements: {
      min_data_points: 20,
      required_metrics: ['blood_pressure', 'blood_sugar', 'weight'],
      time_span_days: 30
    },
    steps: [
      {
        name: 'Overall Health Trends',
        description: 'Analyze trends across all health metrics',
        analysis_type: 'trends',
        data_selection: { type: 'inherit' },
        additional_context: 'Analyze overall health trends across all available metrics over the selected time period.'
      },
      {
        name: 'Anomaly Detection',
        description: 'Identify concerning readings and patterns',
        analysis_type: 'anomalies',
        data_selection: { type: 'inherit' },
        additional_context: 'Focus on identifying any anomalous readings that may require attention or further investigation.',
        condition: { type: 'always' }
      },
      {
        name: 'Detailed Insights',
        description: 'Deep dive into health patterns and correlations',
        analysis_type: 'insights',
        data_selection: { type: 'inherit' },
        additional_context: 'Provide detailed insights into health patterns, correlations between metrics, and factors affecting health.',
        depends_on: ['0', '1']
      },
      {
        name: 'Personalized Recommendations',
        description: 'Generate actionable health recommendations',
        analysis_type: 'recommendations',
        data_selection: { type: 'inherit' },
        additional_context: 'Based on trends, anomalies, and insights, provide specific, actionable recommendations for health improvement.',
        depends_on: ['0', '1', '2']
      }
    ]
  },
  {
    id: 'blood_pressure_deep_dive',
    name: 'Blood Pressure Deep Dive',
    description: 'Comprehensive blood pressure analysis with predictive insights',
    category: 'diagnostic',
    icon: '🩸',
    estimated_duration: '3-7 minutes',
    data_requirements: {
      min_data_points: 15,
      required_metrics: ['blood_pressure'],
      time_span_days: 21
    },
    steps: [
      {
        name: 'Blood Pressure Trends',
        description: 'Analyze blood pressure trends and patterns',
        analysis_type: 'trends',
        data_selection: {
          type: 'filter',
          config: {
            filter_by: { metric_types: ['blood_pressure'] }
          }
        },
        additional_context: 'Analyze blood pressure trends including systolic and diastolic patterns, daily variations, and long-term trends.'
      },
      {
        name: 'Hypertension Risk Assessment',
        description: 'Assess risk factors and concerning patterns',
        analysis_type: 'anomalies',
        data_selection: { type: 'inherit' },
        additional_context: 'Identify readings that may indicate hypertension risk, evaluate consistency of elevated readings, and assess overall cardiovascular risk.',
        depends_on: ['0']
      },
      {
        name: 'Lifestyle Correlation Analysis',
        description: 'Correlate BP with timing and potential lifestyle factors',
        analysis_type: 'insights',
        data_selection: { type: 'inherit' },
        additional_context: 'Analyze blood pressure in relation to time of day, frequency of readings, and identify patterns that may correlate with lifestyle factors.',
        depends_on: ['0']
      },
      {
        name: 'BP Management Recommendations',
        description: 'Specific recommendations for blood pressure management',
        analysis_type: 'recommendations',
        data_selection: { type: 'inherit' },
        additional_context: 'Provide specific recommendations for blood pressure management, including lifestyle modifications, monitoring frequency, and when to seek medical attention.',
        depends_on: ['0', '1', '2']
      }
    ]
  },
  {
    id: 'anomaly_investigation',
    name: 'Anomaly Investigation Workflow',
    description: 'Deep investigation of detected anomalies with follow-up analysis',
    category: 'diagnostic',
    icon: '🔍',
    estimated_duration: '4-8 minutes',
    data_requirements: {
      min_data_points: 10,
      required_metrics: [],
      time_span_days: 14
    },
    steps: [
      {
        name: 'Anomaly Detection',
        description: 'Identify all anomalous readings',
        analysis_type: 'anomalies',
        data_selection: { type: 'inherit' },
        additional_context: 'Systematically identify all anomalous readings across all metrics, categorize by severity and potential significance.'
      },
      {
        name: 'Pattern Analysis Around Anomalies',
        description: 'Analyze patterns leading up to and following anomalies',
        analysis_type: 'insights',
        data_selection: {
          type: 'extend',
          config: {
            extend_with: { time_range: '7d' }
          }
        },
        additional_context: 'Analyze data patterns in the days leading up to and following each anomaly to identify potential triggers or consequences.',
        depends_on: ['0'],
        condition: { type: 'anomaly_found' }
      },
      {
        name: 'Risk Assessment',
        description: 'Assess health risks associated with detected anomalies',
        analysis_type: 'recommendations',
        data_selection: { type: 'inherit' },
        additional_context: 'Evaluate the health significance of detected anomalies and provide specific recommendations for addressing them.',
        depends_on: ['0', '1']
      }
    ]
  },
  {
    id: 'weekly_health_summary',
    name: 'Weekly Health Summary',
    description: 'Quick weekly health overview with key insights',
    category: 'health_monitoring',
    icon: '📅',
    estimated_duration: '2-4 minutes',
    data_requirements: {
      min_data_points: 5,
      required_metrics: [],
      time_span_days: 7
    },
    steps: [
      {
        name: 'Weekly Overview',
        description: 'High-level summary of the week\'s health data',
        analysis_type: 'insights',
        data_selection: { type: 'inherit' },
        additional_context: 'Provide a concise overview of this week\'s health data, highlighting key metrics, averages, and notable changes.'
      },
      {
        name: 'Week-over-Week Comparison',
        description: 'Compare this week to previous weeks',
        analysis_type: 'trends',
        data_selection: {
          type: 'extend',
          config: {
            extend_with: { time_range: '21d' }
          }
        },
        additional_context: 'Compare this week\'s health metrics to previous weeks, identifying improvements, concerns, or stability in health patterns.',
        depends_on: ['0']
      },
      {
        name: 'Weekly Action Items',
        description: 'Generate specific action items for the coming week',
        analysis_type: 'recommendations',
        data_selection: { type: 'inherit' },
        additional_context: 'Based on this week\'s data and trends, provide specific, actionable recommendations for the upcoming week.',
        depends_on: ['0', '1']
      }
    ]
  }
];