import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { analysisConfigService } from '../services/analysisConfig';
import { AnalysisConfig, AnalysisCollection } from '../types/analysisConfig';

interface SaveAnalysisConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (config: AnalysisConfig) => void;
  analysisData: {
    analysis_type: 'trends' | 'insights' | 'recommendations' | 'anomalies';
    provider_id?: string;
    additional_context?: string;
    selectedDataIds: number[];
    selectionMethod: 'preset' | 'smart' | 'advanced' | 'manual' | 'visualization';
    selectionConfig: unknown;
  };
}

interface SaveConfigFormData {
  name: string;
  description: string;
  collection_id: string;
  is_favorite: boolean;
}

const SaveAnalysisConfigModal: React.FC<SaveAnalysisConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  analysisData
}) => {
  const [collections, setCollections] = useState<AnalysisCollection[]>([]);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<SaveConfigFormData>({
    defaultValues: {
      name: '',
      description: '',
      collection_id: '',
      is_favorite: false
    }
  });

  useEffect(() => {
    if (isOpen) {
      // Initialize defaults and load collections
      analysisConfigService.initializeDefaults();
      setCollections(analysisConfigService.getCollections());
      
      // Generate suggested name
      const suggestedName = generateSuggestedName();
      reset({
        name: suggestedName,
        description: '',
        collection_id: '',
        is_favorite: false
      });
    }
  }, [isOpen, reset]);

  const generateSuggestedName = (): string => {
    const { analysis_type, selectionMethod } = analysisData;
    const timestamp = new Date().toLocaleDateString();
    
    let prefix = '';
    switch (analysis_type) {
      case 'trends': prefix = 'Trend Analysis'; break;
      case 'insights': prefix = 'Health Insights'; break;
      case 'recommendations': prefix = 'Recommendations'; break;
      case 'anomalies': prefix = 'Anomaly Detection'; break;
    }
    
    let suffix = '';
    switch (selectionMethod) {
      case 'preset': suffix = 'Preset'; break;
      case 'smart': suffix = 'Smart Selection'; break;
      case 'advanced': suffix = 'Advanced Selection'; break;
      case 'manual': suffix = 'Manual Selection'; break;
      case 'visualization': suffix = 'From Visualization'; break;
    }
    
    return `${prefix} - ${suffix} (${timestamp})`;
  };

  const onSubmit = async (data: SaveConfigFormData) => {
    setLoading(true);
    try {
      const config = analysisConfigService.createConfig({
        name: data.name,
        description: data.description || undefined,
        analysis_type: analysisData.analysis_type,
        provider_id: analysisData.provider_id,
        additional_context: analysisData.additional_context,
        data_selection: {
          type: analysisData.selectionMethod,
          config: analysisData.selectionConfig
        },
        collection_id: data.collection_id || undefined
      });

      // Set as favorite if requested
      if (data.is_favorite) {
        analysisConfigService.toggleFavorite(config.id);
      }

      toast.success(`Analysis configuration "${data.name}" saved successfully`);
      onSaved(config);
      reset();
      onClose();
    } catch (error) {
      toast.error('Failed to save analysis configuration');
      console.error('Save config error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Save Analysis Configuration</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          <div className="space-y-4">
            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Name *
              </label>
              <input
                {...register('name', { 
                  required: 'Configuration name is required',
                  minLength: { value: 3, message: 'Name must be at least 3 characters' }
                })}
                type="text"
                className="input-field w-full"
                placeholder="Enter a descriptive name"
              />
              {errors.name && (
                <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                className="input-field w-full"
                rows={3}
                placeholder="Optional description of this configuration"
              />
            </div>

            {/* Collection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Collection
              </label>
              <select
                {...register('collection_id')}
                className="input-field w-full"
              >
                <option value="">No Collection</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Group this configuration with similar analyses
              </p>
            </div>

            {/* Favorite */}
            <div>
              <label className="flex items-center space-x-2">
                <input
                  {...register('is_favorite')}
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Add to favorites</span>
              </label>
            </div>

            {/* Analysis Preview */}
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration Preview</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <p><span className="font-medium">Type:</span> {analysisData.analysis_type}</p>
                <p><span className="font-medium">Selection:</span> {analysisData.selectionMethod}</p>
                <p><span className="font-medium">Data Points:</span> {analysisData.selectedDataIds.length}</p>
                {analysisData.additional_context && (
                  <p><span className="font-medium">Context:</span> {analysisData.additional_context.slice(0, 50)}...</p>
                )}
              </div>
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
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaveAnalysisConfigModal;