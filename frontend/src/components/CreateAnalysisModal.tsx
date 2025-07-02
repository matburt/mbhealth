import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIAnalysisCreate, AIProvider, AnalysisType } from '../types/aiAnalysis';
import { HealthData } from '../types/health';
import AnalysisPresets from './AnalysisPresets';
import SaveAnalysisConfigModal from './SaveAnalysisConfigModal';
import SavedAnalysisConfigs from './SavedAnalysisConfigs';
import AnalysisHelpGuide from './AnalysisHelpGuide';
import { 
  findTrendingData, 
  findAnomalousData, 
  filterByTimeOfDay, 
  getDataStatistics 
} from '../utils/dataAnalysis';
import { AnalysisConfig } from '../types/analysisConfig';

interface CreateAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisCreated: () => void;
  preSelectedData?: HealthData[];
  analysisContext?: string;
}

interface CreateAnalysisFormData {
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider: string; // Can be provider ID or legacy provider name
  additional_context: string;
}

const CreateAnalysisModal: React.FC<CreateAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  onAnalysisCreated,
  preSelectedData,
  analysisContext 
}) => {
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [selectedDataIds, setSelectedDataIds] = useState<number[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSmartSelection, setShowSmartSelection] = useState(true);
  const [showPresets, setShowPresets] = useState(true);
  const [showAdvancedSelection, setShowAdvancedSelection] = useState(true);
  const [showSavedConfigs, setShowSavedConfigs] = useState(true);
  const [showSaveConfigModal, setShowSaveConfigModal] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [lastAnalysisDate, setLastAnalysisDate] = useState<Date | null>(null);
  const [dataStats, setDataStats] = useState<{ 
    total: number; 
    trending: number; 
    anomalous: number; 
    morning: number; 
    afternoon: number; 
    evening: number; 
    count?: number; 
    dateRange?: { start: Date; end: Date } | null; 
    metricTypes?: string[] 
  } | null>(null);
  const [currentSelectionMethod, setCurrentSelectionMethod] = useState<'preset' | 'smart' | 'advanced' | 'manual' | 'visualization'>('manual');
  const [currentSelectionConfig, setCurrentSelectionConfig] = useState<Record<string, unknown>>({});

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<CreateAnalysisFormData>({
    defaultValues: {
      analysis_type: 'insights',
      provider: '',
      additional_context: analysisContext || ''
    }
  });

  const selectedAnalysisType = watch('analysis_type');
  const selectedProvider = watch('provider');

  // Generate dynamic context suggestions based on analysis type and selected data
  const generateContextSuggestions = (analysisType: string, selectedData: HealthData[]): string => {
    if (!selectedData || selectedData.length === 0) {
      return getDefaultContextForAnalysisType(analysisType);
    }

    const metricTypes = [...new Set(selectedData.map(d => d.metric_type))];
    const dateRange = selectedData.length > 0 ? {
      start: new Date(Math.min(...selectedData.map(d => new Date(d.recorded_at).getTime()))),
      end: new Date(Math.max(...selectedData.map(d => new Date(d.recorded_at).getTime())))
    } : null;

    switch (analysisType) {
      case 'trends':
        return generateTrendContextSuggestions(metricTypes, selectedData, dateRange);
      case 'insights':
        return generateInsightContextSuggestions(metricTypes, selectedData, dateRange);
      case 'recommendations':
        return generateRecommendationContextSuggestions(metricTypes, selectedData, dateRange);
      case 'anomalies':
        return generateAnomalyContextSuggestions(metricTypes, selectedData, dateRange);
      default:
        return getDefaultContextForAnalysisType(analysisType);
    }
  };

  const getDefaultContextForAnalysisType = (analysisType: string): string => {
    switch (analysisType) {
      case 'trends':
        return 'Analyze trends and patterns in my health data. Focus on identifying improvements, deteriorations, or significant changes over time.';
      case 'insights':
        return 'Provide insights about my health status. Look for correlations between different metrics and assess my overall health patterns.';
      case 'recommendations':
        return 'Give me personalized recommendations based on my health data. Focus on actionable advice for improving my health outcomes.';
      case 'anomalies':
        return 'Identify any unusual readings or patterns that might need attention. Help me understand if any values are concerning.';
      default:
        return 'Analyze my health data and provide relevant insights based on the selected information.';
    }
  };

  const generateTrendContextSuggestions = (metricTypes: string[], _: HealthData[], dateRange: { start: Date; end: Date } | null): string => {
    const suggestions = [];
    
    if (metricTypes.includes('blood_pressure')) {
      suggestions.push('Are my blood pressure readings improving or getting worse over time?');
    }
    if (metricTypes.includes('weight')) {
      suggestions.push('What is my weight loss/gain trend and is it at a healthy rate?');
    }
    if (metricTypes.includes('blood_sugar')) {
      suggestions.push('How have my blood sugar levels changed and are they becoming more stable?');
    }
    if (metricTypes.includes('heart_rate')) {
      suggestions.push('Is my resting heart rate improving with exercise or medication?');
    }
    
    if (suggestions.length === 0) {
      suggestions.push('What trends can you identify in my health metrics over this time period?');
    }
    
    if (dateRange) {
      const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
      suggestions.push(`Focus on the ${days}-day period from ${dateRange.start.toLocaleDateString()} to ${dateRange.end.toLocaleDateString()}.`);
    }
    
    return suggestions.join(' ');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateInsightContextSuggestions = (metricTypes: string[], _selectedData: HealthData[], _dateRange: { start: Date; end: Date } | null): string => {
    const suggestions = [];
    
    if (metricTypes.length > 1) {
      suggestions.push('Are there any correlations between my different health metrics?');
    }
    
    if (metricTypes.includes('blood_pressure')) {
      suggestions.push('What factors might be influencing my blood pressure readings?');
    }
    if (metricTypes.includes('weight')) {
      suggestions.push('How does my weight relate to my other health metrics?');
    }
    if (metricTypes.includes('blood_sugar')) {
      suggestions.push('What patterns do you see in my blood sugar management?');
    }
    
    suggestions.push('What is my overall health status based on this data?');
    
    return suggestions.join(' ');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateRecommendationContextSuggestions = (metricTypes: string[], _selectedData: HealthData[], _dateRange: { start: Date; end: Date } | null): string => {
    const suggestions = [];
    
    if (metricTypes.includes('blood_pressure')) {
      suggestions.push('What lifestyle changes could help improve my blood pressure?');
    }
    if (metricTypes.includes('weight')) {
      suggestions.push('What strategies would you recommend for healthy weight management?');
    }
    if (metricTypes.includes('blood_sugar')) {
      suggestions.push('How can I better manage my blood sugar levels?');
    }
    
    suggestions.push('When should I consider consulting with my healthcare provider?');
    suggestions.push('What preventive measures should I focus on?');
    
    return suggestions.join(' ');
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateAnomalyContextSuggestions = (metricTypes: string[], _selectedData: HealthData[], _dateRange: { start: Date; end: Date } | null): string => {
    const suggestions = [];
    
    suggestions.push('Are there any readings that appear unusual or concerning?');
    
    if (metricTypes.includes('blood_pressure')) {
      suggestions.push('Have I had any blood pressure spikes or drops that need attention?');
    }
    if (metricTypes.includes('weight')) {
      suggestions.push('Are there any sudden weight changes that might be significant?');
    }
    if (metricTypes.includes('blood_sugar')) {
      suggestions.push('Do any of my blood sugar readings indicate potential issues?');
    }
    
    suggestions.push('Help me understand which values are within normal ranges and which might need medical attention.');
    
    return suggestions.join(' ');
  };

  // Define fetchData before any useEffect that uses it
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthDataResult, providersResult, analysesResult] = await Promise.all([
        preSelectedData ? Promise.resolve(preSelectedData) : aiAnalysisService.getHealthDataForAnalysis(),
        aiAnalysisService.getProviders(true), // Only enabled providers
        aiAnalysisService.getAnalysisHistory() // Get last analysis date
      ]);
      
      if (!preSelectedData) {
        setHealthData(healthDataResult);
        // Calculate data statistics for advanced selection
        setDataStats(getDataStatistics(healthDataResult));
      } else {
        setDataStats(getDataStatistics(preSelectedData));
      }
      setProviders(providersResult);
      
      // Find the most recent analysis date
      if (analysesResult.length > 0) {
        const sortedAnalyses = analysesResult.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setLastAnalysisDate(new Date(sortedAnalyses[0].created_at));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [preSelectedData]);


  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // Update additional context when analysis type or selected data changes
  useEffect(() => {
    if (selectedAnalysisType && !analysisContext) { // Don't override pre-filled context
      const selectedData = healthData.filter(d => selectedDataIds.includes(d.id));
      const suggestions = generateContextSuggestions(selectedAnalysisType, selectedData);
      setValue('additional_context', suggestions);
    }
  }, [selectedAnalysisType, selectedDataIds, healthData, analysisContext, setValue, generateContextSuggestions]);

  // Handle pre-selected data
  useEffect(() => {
    if (preSelectedData && preSelectedData.length > 0) {
      setHealthData(preSelectedData);
      setSelectedDataIds(preSelectedData.map(data => data.id));
      setShowSmartSelection(false); // Hide smart selection since data is pre-selected
      setShowPresets(false); // Hide presets since data is pre-selected
      setShowAdvancedSelection(false); // Hide advanced selection since data is pre-selected
      setShowSavedConfigs(false); // Hide saved configs since data is pre-selected
      setCurrentSelectionMethod('visualization');
      setCurrentSelectionConfig({ filters: { metric_type: 'mixed', time_range: 'filtered' } });
    }
    if (analysisContext) {
      setValue('additional_context', analysisContext);
    }
  }, [preSelectedData, analysisContext, setValue]);

  // Moved fetchData definition before useEffect

  // Smart selection functions
  const selectDataByMetric = (metricType: string) => {
    const filteredData = healthData.filter(data => data.metric_type === metricType);
    const ids = filteredData.map(data => data.id);
    setSelectedDataIds(ids);
    setCurrentSelectionMethod('smart');
    setCurrentSelectionConfig({ metric_types: [metricType] });
    toast.success(`Selected ${ids.length} ${metricType.replace('_', ' ')} readings`);
  };

  const selectDataByTimeRange = (days: number) => {
    const cutoffDate = subDays(new Date(), days);
    const filteredData = healthData.filter(data => 
      new Date(data.recorded_at) >= cutoffDate
    );
    const ids = filteredData.map(data => data.id);
    setSelectedDataIds(ids);
    setCurrentSelectionMethod('smart');
    setCurrentSelectionConfig({ time_range: `${days}d` });
    toast.success(`Selected ${ids.length} readings from the last ${days} days`);
  };

  const selectDataByPeriod = (period: 'week' | 'month') => {
    let startDate: Date;
    let endDate: Date;
    
    if (period === 'week') {
      startDate = startOfWeek(new Date());
      endDate = endOfWeek(new Date());
    } else {
      startDate = startOfMonth(new Date());
      endDate = endOfMonth(new Date());
    }
    
    const filteredData = healthData.filter(data => {
      const dataDate = new Date(data.recorded_at);
      return dataDate >= startDate && dataDate <= endDate;
    });
    
    const ids = filteredData.map(data => data.id);
    setSelectedDataIds(ids);
    toast.success(`Selected ${ids.length} readings from this ${period}`);
  };

  const selectDataSinceLastAnalysis = () => {
    if (!lastAnalysisDate) {
      toast.error('No previous analysis found');
      return;
    }
    
    const filteredData = healthData.filter(data => 
      new Date(data.recorded_at) > lastAnalysisDate
    );
    const ids = filteredData.map(data => data.id);
    setSelectedDataIds(ids);
    toast.success(`Selected ${ids.length} readings since last analysis`);
  };

  const selectMostRecentReadings = (count: number) => {
    const sortedData = [...healthData].sort((a, b) => 
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    );
    const recentData = sortedData.slice(0, count);
    const ids = recentData.map(data => data.id);
    setSelectedDataIds(ids);
    toast.success(`Selected ${ids.length} most recent readings`);
  };

  const clearSelection = () => {
    setSelectedDataIds([]);
    toast.success('Selection cleared');
  };

  const handlePresetSelect = (preset: { name: string; analysisType: string; context: string }, selectedData: HealthData[]) => {
    setSelectedDataIds(selectedData.map(d => d.id));
    setValue('analysis_type', preset.analysisType as 'trends' | 'insights' | 'recommendations' | 'anomalies');
    setValue('additional_context', preset.context);
    toast.success(`Selected ${preset.name} preset with ${selectedData.length} readings`);
    setShowPresets(false);
    setShowSmartSelection(false);
    setShowAdvancedSelection(false);
  };

  // Advanced selection functions
  const selectTrendingData = (minStrength: 'weak' | 'moderate' | 'strong' = 'moderate') => {
    const trendingData = findTrendingData(healthData, 0.6, minStrength);
    const ids = trendingData.map(data => data.id);
    setSelectedDataIds(ids);
    setCurrentSelectionMethod('advanced');
    setCurrentSelectionConfig({ trending_data: { enabled: true, min_strength: minStrength } });
    toast.success(`Selected ${ids.length} data points with ${minStrength}+ trends`);
  };

  const selectAnomalousData = (minSeverity: 'low' | 'medium' | 'high' = 'medium') => {
    const anomalousData = findAnomalousData(healthData, minSeverity);
    const ids = anomalousData.map(data => data.id);
    setSelectedDataIds(ids);
    setCurrentSelectionMethod('advanced');
    setCurrentSelectionConfig({ anomalous_data: { enabled: true, min_severity: minSeverity } });
    toast.success(`Selected ${ids.length} anomalous readings (${minSeverity}+ severity)`);
  };

  const selectByTimeOfDay = (timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    const filteredData = filterByTimeOfDay(healthData, timeOfDay);
    const ids = filteredData.map(data => data.id);
    setSelectedDataIds(ids);
    setCurrentSelectionMethod('advanced');
    setCurrentSelectionConfig({ time_of_day: timeOfDay });
    toast.success(`Selected ${ids.length} ${timeOfDay} readings`);
  };

  // Saved configuration handlers
  const handleSaveConfiguration = () => {
    if (selectedDataIds.length === 0) {
      toast.error('Please select some data before saving configuration');
      return;
    }
    setShowSaveConfigModal(true);
  };

  const handleConfigSaved = (config: AnalysisConfig) => {
    toast.success(`Configuration "${config.name}" saved successfully`);
  };

  const handleLoadConfiguration = (config: AnalysisConfig) => {
    // Apply the saved configuration
    setValue('analysis_type', config.analysis_type);
    setValue('additional_context', config.additional_context || '');
    if (config.provider_id) {
      setValue('provider', config.provider_id);
    }

    // Apply data selection based on config
    const { type, config: selectionConfig } = config.data_selection;
    setCurrentSelectionMethod(type);
    setCurrentSelectionConfig(selectionConfig);

    // Apply data selection
    let filteredData: HealthData[] = [];
    switch (type) {
      case 'smart':
        if (selectionConfig.metric_types?.length) {
          filteredData = healthData.filter(d => selectionConfig.metric_types!.includes(d.metric_type));
        }
        if (selectionConfig.time_range) {
          const days = parseInt(selectionConfig.time_range.replace('d', ''));
          if (!isNaN(days)) {
            const cutoffDate = subDays(new Date(), days);
            filteredData = filteredData.length > 0 
              ? filteredData.filter(d => new Date(d.recorded_at) >= cutoffDate)
              : healthData.filter(d => new Date(d.recorded_at) >= cutoffDate);
          }
        }
        break;
      case 'advanced':
        if (selectionConfig.trending_data?.enabled) {
          filteredData = findTrendingData(healthData, 0.6, selectionConfig.trending_data.min_strength);
        }
        if (selectionConfig.anomalous_data?.enabled) {
          const anomalousData = findAnomalousData(healthData, selectionConfig.anomalous_data.min_severity);
          filteredData = filteredData.length > 0 
            ? filteredData.filter(d => anomalousData.some(a => a.id === d.id))
            : anomalousData;
        }
        if (selectionConfig.time_of_day) {
          const timeFilteredData = filterByTimeOfDay(healthData, selectionConfig.time_of_day);
          filteredData = filteredData.length > 0 
            ? filteredData.filter(d => timeFilteredData.some(t => t.id === d.id))
            : timeFilteredData;
        }
        break;
      case 'manual':
        if (selectionConfig.health_data_ids?.length) {
          filteredData = healthData.filter(d => selectionConfig.health_data_ids!.includes(d.id));
        }
        break;
      default:
        filteredData = healthData;
    }

    setSelectedDataIds(filteredData.map(d => d.id));
    
    // Hide other selection methods since we're using a saved config
    setShowPresets(false);
    setShowSmartSelection(false);
    setShowAdvancedSelection(false);
  };

  // Get available metric types
  const availableMetrics = Array.from(new Set(healthData.map(data => data.metric_type)));
  
  // Get metric counts
  const getMetricCount = (metricType: string) => {
    return healthData.filter(data => data.metric_type === metricType).length;
  };

  const analysisTypes: AnalysisType[] = [
    {
      id: 'trends',
      name: 'Trend Analysis',
      description: 'Identify patterns and trends in your health data over time',
      icon: '📈',
      examples: ['Blood pressure trends over the last month', 'Weight loss progression', 'Blood sugar patterns']
    },
    {
      id: 'insights',
      name: 'Health Insights',
      description: 'Get personalized insights about your health data',
      icon: '💡',
      examples: ['Correlations between different metrics', 'Health status assessment', 'Lifestyle impact analysis']
    },
    {
      id: 'recommendations',
      name: 'Recommendations',
      description: 'Receive personalized health recommendations',
      icon: '🎯',
      examples: ['Lifestyle improvement suggestions', 'When to consult a doctor', 'Preventive measures']
    },
    {
      id: 'anomalies',
      name: 'Anomaly Detection',
      description: 'Identify unusual patterns or concerning values',
      icon: '⚠️',
      examples: ['Unusual blood pressure readings', 'Sudden weight changes', 'Abnormal blood sugar levels']
    }
  ];

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai': return '🤖';
      case 'anthropic': return '🔮';
      case 'google': return '🔍';
      case 'custom': return '⚙️';
      default: return '🤖';
    }
  };

  const onSubmit = async (data: CreateAnalysisFormData) => {
    if (selectedDataIds.length === 0) {
      toast.error('Please select at least one health data entry to analyze');
      return;
    }

    try {
      // Find the selected provider to get its type
      const selectedProviderData = providers.find(p => p.id === data.provider);
      if (!selectedProviderData) {
        toast.error('Selected provider not found');
        return;
      }

      const analysisData: AIAnalysisCreate = {
        health_data_ids: selectedDataIds,
        analysis_type: data.analysis_type,
        provider: data.provider, // Send the provider ID, not the type
        additional_context: data.additional_context.trim() || undefined,
      };

      await aiAnalysisService.createAnalysis(analysisData);
      toast.success('Analysis request created successfully');
      reset();
      setSelectedDataIds([]);
      onClose();
      onAnalysisCreated();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Failed to create analysis'
        : 'Failed to create analysis';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedDataIds([]);
    setShowSmartSelection(true);
    setShowPresets(true);
    setShowAdvancedSelection(true);
    setShowSavedConfigs(true);
    setCurrentSelectionMethod('manual');
    setCurrentSelectionConfig({});
    onClose();
  };

  const toggleDataSelection = (id: number) => {
    setSelectedDataIds(prev => 
      prev.includes(id) 
        ? prev.filter(dataId => dataId !== id)
        : [...prev, id]
    );
  };

  const getMetricDisplay = (data: HealthData) => {
    switch (data.metric_type) {
      case 'blood_pressure':
        return `${data.systolic}/${data.diastolic} ${data.unit}`;
      default:
        return `${data.value} ${data.unit}`;
    }
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return '🩸';
      case 'blood_sugar':
        return '🩸';
      case 'weight':
        return '⚖️';
      case 'heart_rate':
        return '❤️';
      case 'temperature':
        return '🌡️';
      default:
        return '📊';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create AI Analysis</h2>
            <p className="text-sm text-gray-600 mt-1">Analyze your health data with artificial intelligence</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowHelpGuide(true)}
              className="flex items-center space-x-2 px-3 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
              title="Help & Guide"
            >
              <span className="text-lg">❓</span>
              <span className="text-sm font-medium">Help</span>
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Analysis Type */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Analysis Type *
                  </label>
                  <span className="text-xs text-blue-600 cursor-pointer" onClick={() => setShowHelpGuide(true)}>
                    What's the difference? →
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {analysisTypes.map((type) => (
                    <label
                      key={type.id}
                      className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedAnalysisType === type.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        {...register('analysis_type', { required: 'Analysis type is required' })}
                        type="radio"
                        value={type.id}
                        className="sr-only"
                      />
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{type.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500 font-medium">Examples:</p>
                            <ul className="text-xs text-gray-500 mt-1 space-y-1">
                              {type.examples.map((example, index) => (
                                <li key={index}>• {example}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  AI Provider *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {providers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p className="mb-2">No AI providers configured</p>
                      <p className="text-sm">
                        <a href="/ai-providers" className="text-blue-600 hover:text-blue-800">
                          Configure AI providers
                        </a> to enable analysis
                      </p>
                    </div>
                  ) : (
                    providers.map((provider) => (
                    <label
                      key={provider.id}
                      className={`relative flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedProvider === provider.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        {...register('provider', { required: 'Provider is required' })}
                        type="radio"
                        value={provider.id}
                        className="sr-only"
                      />
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{getProviderIcon(provider.type)}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{provider.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{provider.type}</p>
                          {provider.default_model && (
                            <p className="text-xs text-gray-500 mt-1">
                              Default Model: {provider.default_model}
                            </p>
                          )}
                          {provider.models?.available && (
                            <p className="text-xs text-gray-500 mt-1">
                              Available: {provider.models.available.slice(0, 3).join(', ')}
                              {provider.models.available.length > 3 && ` +${provider.models.available.length - 3} more`}
                            </p>
                          )}
                        </div>
                      </div>
                    </label>
                    ))
                  )}
                </div>
              </div>

              {/* Additional Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Context
                </label>
                <textarea
                  {...register('additional_context')}
                  className="input-field w-full"
                  rows={3}
                  placeholder={`Context suggestions are auto-populated based on your analysis type and selected data. Feel free to modify or add specific questions...`}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Smart suggestions are automatically generated based on your analysis type and selected health data. You can modify them or add your own questions.
                </p>
              </div>
            </div>

            {/* Right Column - Health Data Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Health Data to Analyze * ({selectedDataIds.length} selected)
                </label>
                <span className="text-xs text-blue-600 cursor-pointer" onClick={() => setShowHelpGuide(true)}>
                  How to select data? →
                </span>
              </div>
              
              {/* Quick Tips */}
              {!preSelectedData && selectedDataIds.length === 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 mb-2">💡 <strong>Quick Start:</strong></p>
                  <ul className="text-xs text-blue-600 space-y-1">
                    <li>• Try an <span className="font-medium">Analysis Preset</span> for common scenarios</li>
                    <li>• Use <span className="font-medium">Smart Selection</span> for quick data filtering</li>
                    <li>• Start a <span className="font-medium">Workflow</span> for comprehensive analysis</li>
                  </ul>
                </div>
              )}
              
              {/* Data Selected Success Message */}
              {!preSelectedData && selectedDataIds.length > 0 && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-700">
                    <span className="text-lg">✅</span>
                    <div>
                      <p className="text-sm font-medium">Great! You've selected {selectedDataIds.length} data points</p>
                      <p className="text-xs text-green-600">
                        {selectedDataIds.length >= 10 ? 'Perfect amount for comprehensive analysis' : 
                         selectedDataIds.length >= 5 ? 'Good amount for basic analysis' : 
                         'Consider adding more data for better insights'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Pre-selected Data Info */}
              {preSelectedData && preSelectedData.length > 0 && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-green-900">Data Pre-selected from Visualization</h4>
                      <p className="text-xs text-green-700 mt-1">
                        {preSelectedData.length} readings selected from your current visualization filters
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setHealthData([]);
                        setSelectedDataIds([]);
                        setShowSmartSelection(true);
                        setShowPresets(true);
                        setShowAdvancedSelection(true);
                        // Fetch all data instead of pre-selected
                        setLoading(true);
                        try {
                          const healthDataResult = await aiAnalysisService.getHealthDataForAnalysis();
                          setHealthData(healthDataResult);
                          setDataStats(getDataStatistics(healthDataResult));
                        } catch (error) {
                          console.error('Failed to fetch data:', error);
                          toast.error('Failed to load data');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="text-xs text-green-600 hover:text-green-800 font-medium"
                    >
                      Choose Different Data
                    </button>
                  </div>
                </div>
              )}
              
              {/* Saved Configurations */}
              {showSavedConfigs && !preSelectedData && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-medium text-gray-900">Saved Configurations</h4>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={handleSaveConfiguration}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium"
                      >
                        Save Current
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSavedConfigs(false)}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Hide
                      </button>
                    </div>
                  </div>
                  <SavedAnalysisConfigs 
                    onConfigSelect={handleLoadConfiguration}
                    showCollections={false}
                  />
                </div>
              )}
              
              {/* Show Saved Configs button when hidden */}
              {!showSavedConfigs && !preSelectedData && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowSavedConfigs(true)}
                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                  >
                    + Show Saved Configurations
                  </button>
                </div>
              )}
              
              {/* Analysis Presets */}
              {showPresets && !preSelectedData && healthData.length > 0 && (
                <div className="mb-4">
                  <AnalysisPresets 
                    healthData={healthData} 
                    onPresetSelect={handlePresetSelect}
                  />
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowPresets(false)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Hide Presets
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show Presets button when hidden */}
              {!showPresets && !preSelectedData && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowPresets(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Show Analysis Presets
                  </button>
                </div>
              )}

              {/* Advanced Selection Options */}
              {showAdvancedSelection && healthData.length > 0 && !preSelectedData && dataStats && (
                <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-medium text-purple-900 mb-3">Advanced Selection</h4>
                  
                  {/* Trending Data */}
                  <div className="mb-3">
                    <p className="text-xs text-purple-700 mb-2">Trending Data:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectTrendingData('weak')}
                        disabled={dataStats.trending === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        📈 All Trends ({dataStats.trending})
                      </button>
                      <button
                        type="button"
                        onClick={() => selectTrendingData('moderate')}
                        disabled={dataStats.trending === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        📊 Strong Trends
                      </button>
                    </div>
                  </div>
                  
                  {/* Anomalous Data */}
                  <div className="mb-3">
                    <p className="text-xs text-purple-700 mb-2">Anomalous Data:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectAnomalousData('low')}
                        disabled={dataStats.anomalous === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ⚠️ All Anomalies ({dataStats.anomalous})
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAnomalousData('medium')}
                        disabled={dataStats.anomalous === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🚨 Significant Anomalies
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAnomalousData('high')}
                        disabled={dataStats.anomalous === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🔴 Critical Anomalies
                      </button>
                    </div>
                  </div>
                  
                  {/* Time of Day */}
                  <div className="mb-3">
                    <p className="text-xs text-purple-700 mb-2">By Time of Day:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectByTimeOfDay('morning')}
                        disabled={dataStats.morning === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🌅 Morning ({dataStats.morning})
                      </button>
                      <button
                        type="button"
                        onClick={() => selectByTimeOfDay('afternoon')}
                        disabled={dataStats.afternoon === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        ☀️ Afternoon ({dataStats.afternoon})
                      </button>
                      <button
                        type="button"
                        onClick={() => selectByTimeOfDay('evening')}
                        disabled={dataStats.evening === 0}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-purple-300 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        🌙 Evening ({dataStats.evening})
                      </button>
                    </div>
                  </div>
                  
                  {/* Control buttons */}
                  <div className="flex justify-between items-center pt-2 border-t border-purple-200">
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSelection(false)}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Hide Advanced
                    </button>
                  </div>
                </div>
              )}
              
              {/* Show Advanced Selection button when hidden */}
              {!showAdvancedSelection && !preSelectedData && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedSelection(true)}
                    className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                  >
                    + Show Advanced Selection
                  </button>
                </div>
              )}
              
              {/* Smart Selection Options */}
              {showSmartSelection && healthData.length > 0 && !preSelectedData && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-3">Quick Selection</h4>
                  
                  {/* Metric-based selection */}
                  <div className="mb-3">
                    <p className="text-xs text-blue-700 mb-2">By Metric Type:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableMetrics.map((metric) => (
                        <button
                          key={metric}
                          type="button"
                          onClick={() => selectDataByMetric(metric)}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          {getMetricIcon(metric)} {metric.replace('_', ' ')} ({getMetricCount(metric)})
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time-based selection */}
                  <div className="mb-3">
                    <p className="text-xs text-blue-700 mb-2">By Time Period:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectDataByPeriod('week')}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        This Week
                      </button>
                      <button
                        type="button"
                        onClick={() => selectDataByPeriod('month')}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        This Month
                      </button>
                      <button
                        type="button"
                        onClick={() => selectDataByTimeRange(7)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Last 7 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => selectDataByTimeRange(30)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Last 30 Days
                      </button>
                      {lastAnalysisDate && (
                        <button
                          type="button"
                          onClick={selectDataSinceLastAnalysis}
                          className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          Since Last Analysis
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Recent readings */}
                  <div className="mb-3">
                    <p className="text-xs text-blue-700 mb-2">Recent Readings:</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectMostRecentReadings(10)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Last 10
                      </button>
                      <button
                        type="button"
                        onClick={() => selectMostRecentReadings(25)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Last 25
                      </button>
                      <button
                        type="button"
                        onClick={() => selectMostRecentReadings(50)}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-white border border-blue-300 text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        Last 50
                      </button>
                    </div>
                  </div>
                  
                  {/* Control buttons */}
                  <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSmartSelection(false)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Manual Selection Only
                    </button>
                  </div>
                </div>
              )}
              
              {/* Toggle to show smart selection if hidden */}
              {!showSmartSelection && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowSmartSelection(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + Show Quick Selection Options
                  </button>
                </div>
              )}
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-12 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {healthData.map((data) => (
                    <label
                      key={data.id}
                      className={`relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedDataIds.includes(data.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedDataIds.includes(data.id)}
                        onChange={() => toggleDataSelection(data.id)}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-lg">{getMetricIcon(data.metric_type)}</span>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 capitalize">
                            {data.metric_type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {getMetricDisplay(data)} • {format(new Date(data.recorded_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-gray-200 mt-6">
            {/* Action Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-xs text-gray-600">
              <div className="bg-purple-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-purple-600">🔄</span>
                  <span className="font-medium text-purple-900">Workflows</span>
                </div>
                <p>Run multiple related analyses automatically for comprehensive insights</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-blue-600">🤖</span>
                  <span className="font-medium text-blue-900">Single Analysis</span>
                </div>
                <p>Create one focused analysis with your selected data and settings</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-gray-600">💾</span>
                  <span className="font-medium text-gray-900">Save Config</span>
                </div>
                <p>Save your current setup to reuse for future analyses</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSaveConfiguration}
                  disabled={selectedDataIds.length === 0}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  title="Save current configuration for reuse"
                >
                  💾 Save Config
                </button>
              </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedDataIds.length === 0}
                  className="btn-primary"
                  title="Create a single AI analysis"
                >
                  🤖 Create Analysis
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Save Configuration Modal */}
      <SaveAnalysisConfigModal
        isOpen={showSaveConfigModal}
        onClose={() => setShowSaveConfigModal(false)}
        onSaved={handleConfigSaved}
        analysisData={{
          analysis_type: watch('analysis_type'),
          provider_id: watch('provider'),
          additional_context: watch('additional_context'),
          selectedDataIds,
          selectionMethod: currentSelectionMethod,
          selectionConfig: currentSelectionConfig
        }}
      />

      {/* Help Guide Modal */}
      <AnalysisHelpGuide
        isOpen={showHelpGuide}
        onClose={() => setShowHelpGuide(false)}
      />
    </div>
  );
};

export default CreateAnalysisModal; 