import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIAnalysisCreate, AIProvider, AnalysisType } from '../types/aiAnalysis';
import { HealthData } from '../types/health';

interface CreateAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisCreated: () => void;
}

interface CreateAnalysisFormData {
  analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  provider: 'openai' | 'openrouter' | 'google';
  additional_context: string;
}

const CreateAnalysisModal: React.FC<CreateAnalysisModalProps> = ({ 
  isOpen, 
  onClose, 
  onAnalysisCreated 
}) => {
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [selectedDataIds, setSelectedDataIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
  } = useForm<CreateAnalysisFormData>({
    defaultValues: {
      analysis_type: 'insights',
      provider: 'openai',
      additional_context: ''
    }
  });

  const selectedAnalysisType = watch('analysis_type');
  const selectedProvider = watch('provider');

  useEffect(() => {
    if (isOpen) {
      fetchHealthData();
    }
  }, [isOpen]);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const data = await aiAnalysisService.getHealthDataForAnalysis();
      setHealthData(data);
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
    }
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

  const providers: AIProvider[] = [
    {
      id: 'openai',
      name: 'OpenAI GPT-4',
      description: 'Advanced AI model with deep medical knowledge',
      icon: '🤖',
      available_models: ['GPT-4', 'GPT-4 Turbo']
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      description: 'Access to multiple AI models and providers',
      icon: '🔗',
      available_models: ['Claude', 'Gemini', 'GPT-4']
    },
    {
      id: 'google',
      name: 'Google Gemini',
      description: 'Google\'s advanced AI with medical expertise',
      icon: '🔍',
      available_models: ['Gemini Pro', 'Gemini Ultra']
    }
  ];

  const onSubmit = async (data: CreateAnalysisFormData) => {
    if (selectedDataIds.length === 0) {
      toast.error('Please select at least one health data entry to analyze');
      return;
    }

    try {
      const analysisData: AIAnalysisCreate = {
        health_data_ids: selectedDataIds,
        analysis_type: data.analysis_type,
        provider: data.provider,
        additional_context: data.additional_context.trim() || undefined,
      };

      await aiAnalysisService.createAnalysis(analysisData);
      toast.success('Analysis request created successfully');
      reset();
      setSelectedDataIds([]);
      onClose();
      onAnalysisCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create analysis');
    }
  };

  const handleCancel = () => {
    reset();
    setSelectedDataIds([]);
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
          <h2 className="text-xl font-semibold text-gray-900">Create AI Analysis</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Analysis Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Analysis Type *
                </label>
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
                  {providers.map((provider) => (
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
                        <span className="text-2xl">{provider.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{provider.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Models: {provider.available_models.join(', ')}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
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
                  placeholder="Add any specific questions or context for the analysis..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional: Provide additional context or specific questions for more targeted analysis
                </p>
              </div>
            </div>

            {/* Right Column - Health Data Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Health Data to Analyze * ({selectedDataIds.length} selected)
              </label>
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
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
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
            >
              Create Analysis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAnalysisModal; 