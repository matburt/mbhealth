import React, { useState, useEffect } from 'react';
import { 
  createSchedule,
  getScheduleTemplates,
  createFromTemplate,
  AnalysisScheduleCreate,
  ScheduleTemplate 
} from '../services/analysisSchedules';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIProvider } from '../types/aiAnalysis';
import TemplateParametersModal from './TemplateParametersModal';

interface CreateScheduleModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateScheduleModal: React.FC<CreateScheduleModalProps> = ({ onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState<'custom' | 'template'>('template');
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateParams, setShowTemplateParams] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [formData, setFormData] = useState<AnalysisScheduleCreate>({
    name: '',
    description: '',
    schedule_type: 'recurring',
    frequency: 'daily',
    time_of_day: '09:00',
    analysis_types: ['insights'],
    data_selection_config: {
      date_range: { type: 'last_n_days', days: 7 },
      limit: 50
    },
    enabled: true
  });

  useEffect(() => {
    loadTemplates();
    loadProviders();
  }, []);

  const loadTemplates = async () => {
    try {
      const templateData = await getScheduleTemplates();
      setTemplates(templateData);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadProviders = async () => {
    try {
      const providerData = await aiAnalysisService.getProviders();
      setProviders(providerData);
    } catch (err) {
      console.error('Error loading providers:', err);
    }
  };

  const handleInputChange = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDataConfigChange = (field: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      data_selection_config: {
        ...prev.data_selection_config,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Schedule name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createSchedule(formData);
      onSuccess();
    } catch (err: unknown) {
      setError(err.response?.data?.detail || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleUseTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setShowTemplateParams(true);
  };

  const handleTemplateParametersConfirm = async (customizations: Record<string, unknown>) => {
    if (!selectedTemplate) return;
    
    try {
      setLoading(true);
      setError(null);
      await createFromTemplate(selectedTemplate.id, customizations);
      onSuccess();
    } catch (err: unknown) {
      setError(err.response?.data?.detail || 'Failed to create schedule from template');
    } finally {
      setLoading(false);
      setShowTemplateParams(false);
      setSelectedTemplate(null);
    }
  };

  const handleTemplateParametersCancel = () => {
    setShowTemplateParams(false);
    setSelectedTemplate(null);
  };

  const analysisTypeOptions = [
    { value: 'insights', label: 'Health Insights' },
    { value: 'trends', label: 'Trend Analysis' },
    { value: 'recommendations', label: 'Recommendations' },
    { value: 'anomalies', label: 'Anomaly Detection' }
  ];

  const metricTypeOptions = [
    { value: 'blood_pressure', label: 'Blood Pressure' },
    { value: 'blood_sugar', label: 'Blood Sugar' },
    { value: 'weight', label: 'Weight' },
    { value: 'heart_rate', label: 'Heart Rate' },
    { value: 'temperature', label: 'Temperature' },
    { value: 'exercise', label: 'Exercise' },
    { value: 'sleep', label: 'Sleep' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Create Analysis Schedule</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Tabs */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'template'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('template')}
              >
                Use Template
              </button>
              <button
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'custom'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('custom')}
              >
                Custom Schedule
              </button>
            </nav>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {activeTab === 'template' && (
            <div className="space-y-4">
              <p className="text-gray-600">Choose from predefined schedule templates for quick setup:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300">
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      Analysis types: {template.analysis_types.join(', ')}
                    </div>
                    {template.parameters && Object.keys(template.parameters).length > 0 && (
                      <div className="mt-1 text-xs text-blue-600">
                        ⚙️ {Object.keys(template.parameters).length} customizable parameters
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          {template.schedule_type}
                        </span>
                        {template.frequency && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                            {template.frequency}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleUseTemplate(template)}
                        disabled={loading}
                        className="px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded disabled:opacity-50"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Daily Health Summary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Schedule Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule Type *
                </label>
                <select
                  value={formData.schedule_type}
                  onChange={(e) => handleInputChange('schedule_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="recurring">Recurring</option>
                  <option value="one_time">One Time</option>
                  <option value="data_threshold">Data Threshold</option>
                </select>
              </div>

              {/* Recurring Options */}
              {formData.schedule_type === 'recurring' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => handleInputChange('frequency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time of Day
                    </label>
                    <input
                      type="time"
                      value={formData.time_of_day}
                      onChange={(e) => handleInputChange('time_of_day', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {formData.frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Days of Week
                      </label>
                      <select
                        multiple
                        value={formData.days_of_week || []}
                        onChange={(e) => handleInputChange('days_of_week', Array.from(e.target.selectedOptions, option => option.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </div>
                  )}
                  {formData.frequency === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Day of Month
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.day_of_month || 1}
                        onChange={(e) => handleInputChange('day_of_month', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Data Threshold Options */}
              {formData.schedule_type === 'data_threshold' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Count Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.data_threshold_count || 5}
                      onChange={(e) => handleInputChange('data_threshold_count', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Metric Type
                    </label>
                    <select
                      value={formData.data_threshold_metric || ''}
                      onChange={(e) => handleInputChange('data_threshold_metric', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Any metric</option>
                      {metricTypeOptions.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Analysis Configuration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Analysis Types *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {analysisTypeOptions.map(option => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.analysis_types.includes(option.value)}
                        onChange={(e) => {
                          const currentTypes = formData.analysis_types;
                          if (e.target.checked) {
                            handleInputChange('analysis_types', [...currentTypes, option.value]);
                          } else {
                            handleInputChange('analysis_types', currentTypes.filter(t => t !== option.value));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* AI Provider Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Provider (optional)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Choose which AI provider to use for analysis, or leave empty for auto-selection
                </p>
                <select
                  value={formData.provider_id || ''}
                  onChange={(e) => handleInputChange('provider_id', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Auto-select best provider</option>
                  {providers.filter(p => p.enabled).map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} ({provider.type})
                    </option>
                  ))}
                </select>
                {providers.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    No AI providers configured. Schedules will use system defaults.
                  </p>
                )}
              </div>

              {/* Additional Context */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  value={formData.additional_context || ''}
                  onChange={(e) => handleInputChange('additional_context', e.target.value || undefined)}
                  rows={3}
                  placeholder="Provide additional context for the AI analysis..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Data Selection</h3>
                
                {/* Metric Types Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Health Metrics (optional)
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Select specific metrics to analyze, or leave empty to include all metrics
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {metricTypeOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.data_selection_config.metric_types?.includes(option.value) || false}
                          onChange={(e) => {
                            const currentMetrics = formData.data_selection_config.metric_types || [];
                            if (e.target.checked) {
                              handleDataConfigChange('metric_types', [...currentMetrics, option.value]);
                            } else {
                              handleDataConfigChange('metric_types', currentMetrics.filter(m => m !== option.value));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time Range
                    </label>
                    <select
                      value={formData.data_selection_config.date_range?.type || 'last_n_days'}
                      onChange={(e) => handleDataConfigChange('date_range', {
                        type: e.target.value,
                        days: formData.data_selection_config.date_range?.days || 7
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="last_n_days">Last N Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.data_selection_config.date_range?.days || 7}
                      onChange={(e) => handleDataConfigChange('date_range', {
                        ...formData.data_selection_config.date_range,
                        days: parseInt(e.target.value)
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data Limit
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.data_selection_config.limit || 50}
                    onChange={(e) => handleDataConfigChange('limit', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Template Parameters Modal */}
        {showTemplateParams && selectedTemplate && (
          <TemplateParametersModal
            templateName={selectedTemplate.name}
            parameters={selectedTemplate.parameters || {}}
            onConfirm={handleTemplateParametersConfirm}
            onCancel={handleTemplateParametersCancel}
            loading={loading}
          />
        )}
      </div>
    </div>
  );
};

export default CreateScheduleModal;