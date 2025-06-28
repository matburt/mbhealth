import React from 'react';
import { AIProvider, SupportedProviderType } from '../types/aiAnalysis';

interface ProviderCardProps {
  provider: AIProvider;
  supportedType?: SupportedProviderType;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onToggle: () => void;
  testing: boolean;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  supportedType,
  onEdit,
  onDelete,
  onTest,
  onToggle,
  testing
}) => {
  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai':
        return '🧠';
      case 'anthropic':
        return '🔮';
      case 'google':
        return '🌟';
      case 'custom':
        return '⚙️';
      default:
        return '🤖';
    }
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled 
      ? 'bg-green-100 text-green-800' 
      : 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className={`card relative ${!provider.enabled ? 'opacity-75' : ''}`}>
      {/* Status Badge */}
      <div className="absolute top-4 right-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(provider.enabled)}`}>
          {provider.enabled ? 'Active' : 'Disabled'}
        </span>
      </div>

      {/* Provider Header */}
      <div className="flex items-start space-x-3 mb-4">
        <div className="text-3xl">{getProviderIcon(provider.type)}</div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 pr-16">
            {provider.name}
          </h3>
          <p className="text-sm text-gray-600">
            {supportedType?.name || provider.type}
          </p>
        </div>
      </div>

      {/* Provider Details */}
      <div className="space-y-2 mb-4">
        {provider.endpoint && (
          <div>
            <span className="text-sm font-medium text-gray-500">Endpoint:</span>
            <p className="text-sm text-gray-900 truncate">{provider.endpoint}</p>
          </div>
        )}
        
        {provider.default_model && (
          <div>
            <span className="text-sm font-medium text-gray-500">Default Model:</span>
            <p className="text-sm text-gray-900">{provider.default_model}</p>
          </div>
        )}

        <div>
          <span className="text-sm font-medium text-gray-500">Priority:</span>
          <span className="text-sm text-gray-900 ml-2">{provider.priority}</span>
        </div>

        <div>
          <span className="text-sm font-medium text-gray-500">Created:</span>
          <span className="text-sm text-gray-900 ml-2">{formatDate(provider.created_at)}</span>
        </div>

        {provider.models?.available && (
          <div>
            <span className="text-sm font-medium text-gray-500">Available Models:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {provider.models.available.slice(0, 3).map((model: string, index: number) => (
                <span 
                  key={index}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                >
                  {model}
                </span>
              ))}
              {provider.models.available.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  +{provider.models.available.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onToggle}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            provider.enabled
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {provider.enabled ? 'Disable' : 'Enable'}
        </button>

        <button
          onClick={onTest}
          disabled={testing || !provider.enabled}
          className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testing ? 'Testing...' : 'Test'}
        </button>

        <button
          onClick={onEdit}
          className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
        >
          Edit
        </button>

        <button
          onClick={onDelete}
          className="px-3 py-1 text-sm font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Provider Type Info */}
      {supportedType && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>API Key Required: {supportedType.requires_api_key ? 'Yes' : 'No'}</span>
            <span>Cost Tracking: {supportedType.cost_estimation ? 'Yes' : 'No'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderCard;