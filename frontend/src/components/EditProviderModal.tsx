import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIProvider, AIProviderUpdate, SupportedProviderType, ProviderTestRequest } from '../types/aiAnalysis';

interface EditProviderModalProps {
  provider: AIProvider;
  supportedTypes: Record<string, SupportedProviderType>;
  onClose: () => void;
  onProviderUpdated: () => void;
}

const EditProviderModal: React.FC<EditProviderModalProps> = ({
  provider,
  supportedTypes,
  onClose,
  onProviderUpdated
}) => {
  const [formData, setFormData] = useState<AIProviderUpdate>({
    name: provider.name,
    type: provider.type,
    endpoint: provider.endpoint || '',
    api_key: '',
    default_model: provider.default_model || '',
    enabled: provider.enabled,
    priority: provider.priority,
    parameters: provider.parameters || {}
  });
  const [testing, setTesting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>(provider.models?.available || []);
  const [showApiKeyField, setShowApiKeyField] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    // Clear test result when form changes
    setTestResult(null);
  };

  const handleParameterChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value
      }
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      let result;
      
      // If user provided a new API key, test the configuration
      if (formData.api_key) {
        const testRequest: ProviderTestRequest = {
          type: formData.type || provider.type,
          endpoint: formData.endpoint || undefined,
          api_key: formData.api_key
        };
        result = await aiAnalysisService.testProviderConfig(testRequest);
      } else {
        // If no new API key provided, test the saved provider
        result = await aiAnalysisService.testProvider(provider.id);
      }
      
      setTestResult(result);
      
      if (result.success && result.available_models) {
        setAvailableModels(result.available_models);
      }
      
      if (result.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      toast.error('Connection test failed');
      setTestResult({ success: false, message: 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Provider name is required');
      return;
    }

    setUpdating(true);

    try {
      // Only include API key if it was changed
      const updateData = { ...formData };
      if (!showApiKeyField || !formData.api_key) {
        delete updateData.api_key;
      }

      await aiAnalysisService.updateProvider(provider.id, updateData);
      toast.success('Provider updated successfully');
      onProviderUpdated();
    } catch (error: any) {
      console.error('Failed to update provider:', error);
      toast.error(error.response?.data?.detail || 'Failed to update provider');
    } finally {
      setUpdating(false);
    }
  };

  const selectedType = formData.type ? supportedTypes[formData.type] : undefined;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit AI Provider</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Provider Type (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Type
              </label>
              <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                {selectedType?.name || formData.type} - {selectedType?.description}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Provider type cannot be changed after creation
              </p>
            </div>

            {/* Provider Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Provider Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., My OpenAI Provider"
                required
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* API Key */}
            {selectedType?.requires_api_key && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiKeyField(!showApiKeyField)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showApiKeyField ? 'Cancel Change' : 'Change API Key'}
                  </button>
                </div>
                
                {showApiKeyField ? (
                  <input
                    type="password"
                    name="api_key"
                    value={formData.api_key}
                    onChange={handleInputChange}
                    placeholder="Enter new API key"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-600">
                    ••••••••••••••••••••••••
                  </div>
                )}
              </div>
            )}

            {/* Endpoint */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint URL
              </label>
              <input
                type="url"
                name="endpoint"
                value={formData.endpoint}
                onChange={handleInputChange}
                placeholder={selectedType?.default_endpoint || "https://api.example.com/v1"}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {selectedType?.default_endpoint && (
                <p className="text-xs text-gray-500 mt-1">
                  Default: {selectedType.default_endpoint}
                </p>
              )}
            </div>

            {/* Test Connection */}
            <div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {testing ? 'Testing Connection...' : 'Test Connection'}
              </button>
              
              {testResult && (
                <div className={`mt-3 p-3 rounded-md ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="text-sm font-medium">
                    {testResult.success ? '✓ Connection successful' : '✗ Connection failed'}
                  </p>
                  <p className="text-sm">{testResult.message}</p>
                </div>
              )}
            </div>

            {/* Default Model */}
            {availableModels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Model
                </label>
                <select
                  name="default_model"
                  value={formData.default_model}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a model</option>
                  {availableModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleInputChange}
                min="0"
                max="100"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher priority providers are used first (0-100)
              </p>
            </div>

            {/* Parameters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parameters (Optional)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Temperature</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={formData.parameters?.temperature || ''}
                    onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value) || 0.7)}
                    placeholder="0.7"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="32000"
                    value={formData.parameters?.max_tokens || ''}
                    onChange={(e) => handleParameterChange('max_tokens', parseInt(e.target.value) || 2000)}
                    placeholder="2000"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Enabled */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="enabled"
                checked={formData.enabled}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Provider is enabled
              </label>
            </div>

            {/* Provider Info */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Provider Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(provider.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 text-gray-900">
                    {new Date(provider.updated_at).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">ID:</span>
                  <span className="ml-2 text-gray-900 font-mono text-xs">
                    {provider.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updating}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {updating ? 'Updating...' : 'Update Provider'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProviderModal;