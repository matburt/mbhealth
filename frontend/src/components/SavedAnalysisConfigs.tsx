import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { analysisConfigService } from '../services/analysisConfig';
import { AnalysisConfig, AnalysisCollection } from '../types/analysisConfig';

interface SavedAnalysisConfigsProps {
  onConfigSelect: (config: AnalysisConfig) => void;
  showCollections?: boolean;
}

const SavedAnalysisConfigs: React.FC<SavedAnalysisConfigsProps> = ({ 
  onConfigSelect, 
  showCollections = true 
}) => {
  const [configs, setConfigs] = useState<AnalysisConfig[]>([]);
  const [collections, setCollections] = useState<AnalysisCollection[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites' | 'popular' | 'collections'>('favorites');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      analysisConfigService.initializeDefaults();
      setConfigs(analysisConfigService.getConfigs());
      setCollections(analysisConfigService.getCollections());
    } catch (error) {
      toast.error('Failed to load saved configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = (configId: string) => {
    const updatedConfig = analysisConfigService.toggleFavorite(configId);
    if (updatedConfig) {
      loadData(); // Refresh data
      toast.success(
        updatedConfig.is_favorite 
          ? 'Added to favorites' 
          : 'Removed from favorites'
      );
    }
  };

  const handleDeleteConfig = (configId: string, configName: string) => {
    if (confirm(`Are you sure you want to delete "${configName}"?`)) {
      const success = analysisConfigService.deleteConfig(configId);
      if (success) {
        loadData();
        toast.success('Configuration deleted');
      } else {
        toast.error('Failed to delete configuration');
      }
    }
  };

  const handleSelectConfig = (config: AnalysisConfig) => {
    // Increment usage count
    analysisConfigService.incrementUsage(config.id);
    onConfigSelect(config);
    toast.success(`Applied "${config.name}" configuration`);
  };

  const getDisplayConfigs = (): AnalysisConfig[] => {
    switch (activeTab) {
      case 'favorites':
        return analysisConfigService.getFavoriteConfigs();
      case 'popular':
        return analysisConfigService.getPopularConfigs();
      case 'collections':
        if (selectedCollection) {
          return configs.filter(config => config.collection_id === selectedCollection);
        }
        return [];
      case 'all':
      default:
        return configs;
    }
  };

  const getDataSelectionSummary = (config: AnalysisConfig): string => {
    const { type, config: selectionConfig } = config.data_selection;
    
    switch (type) {
      case 'preset':
        return `Preset: ${selectionConfig.preset_id || 'Unknown'}`;
      case 'smart': {
        const parts = [];
        if (selectionConfig.metric_types?.length) {
          parts.push(`${selectionConfig.metric_types.join(', ')}`);
        }
        if (selectionConfig.time_range) {
          parts.push(`${selectionConfig.time_range}`);
        }
        return `Smart: ${parts.join(', ') || 'Custom selection'}`;
      }
      case 'advanced': {
        const advancedParts = [];
        if (selectionConfig.trending_data?.enabled) {
          advancedParts.push('Trending data');
        }
        if (selectionConfig.anomalous_data?.enabled) {
          advancedParts.push('Anomalous data');
        }
        if (selectionConfig.time_of_day) {
          advancedParts.push(`${selectionConfig.time_of_day} readings`);
        }
        return `Advanced: ${advancedParts.join(', ') || 'Custom filters'}`;
      }
      case 'visualization':
        return `From visualization: ${selectionConfig.filters?.metric_type || 'Mixed data'}`;
      case 'manual':
        return `Manual: ${selectionConfig.health_data_ids?.length || 0} selected`;
      default:
        return 'Custom selection';
    }
  };

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'trends': return '📈';
      case 'insights': return '💡';
      case 'recommendations': return '🎯';
      case 'anomalies': return '⚠️';
      default: return '🤖';
    }
  };

  const getCollectionColor = (collectionId?: string): string => {
    if (!collectionId) return '#6B7280'; // gray
    const collection = collections.find(c => c.id === collectionId);
    return collection?.color || '#6B7280';
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading configurations...</p>
      </div>
    );
  }

  const displayConfigs = getDisplayConfigs();

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'favorites', label: 'Favorites', count: analysisConfigService.getFavoriteConfigs().length },
            { id: 'popular', label: 'Popular', count: analysisConfigService.getPopularConfigs().length },
            { id: 'all', label: 'All', count: configs.length },
            ...(showCollections ? [{ id: 'collections', label: 'Collections', count: collections.length }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as 'all' | 'favorites' | 'popular' | 'collections');
                setSelectedCollection(null);
              }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Collections Selection */}
      {activeTab === 'collections' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {collections.map(collection => (
            <button
              key={collection.id}
              onClick={() => setSelectedCollection(collection.id)}
              className={`text-left p-4 rounded-lg border-2 transition-colors ${
                selectedCollection === collection.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: collection.color }}
                ></div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{collection.name}</h4>
                  <p className="text-sm text-gray-600">{collection.configs.length} configurations</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Configuration List */}
      {(activeTab !== 'collections' || selectedCollection) && (
        <div className="space-y-3">
          {displayConfigs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="mb-2">No configurations found</p>
              <p className="text-sm">
                {activeTab === 'favorites' && 'Mark configurations as favorites to see them here'}
                {activeTab === 'popular' && 'Use configurations to see popular ones here'}
                {activeTab === 'collections' && selectedCollection && 'No configurations in this collection'}
                {activeTab === 'all' && 'Create your first analysis configuration'}
              </p>
            </div>
          ) : (
            displayConfigs.map(config => (
              <div
                key={config.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getAnalysisTypeIcon(config.analysis_type)}</span>
                      <h4 className="font-medium text-gray-900 truncate">{config.name}</h4>
                      {config.is_favorite && (
                        <span className="text-yellow-500">⭐</span>
                      )}
                      {config.collection_id && (
                        <span 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: getCollectionColor(config.collection_id) }}
                        ></span>
                      )}
                    </div>
                    
                    {config.description && (
                      <p className="text-sm text-gray-600 mb-2">{config.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="capitalize">{config.analysis_type} Analysis</span>
                      <span>{getDataSelectionSummary(config)}</span>
                      <span>Used {config.usage_count} times</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleFavorite(config.id)}
                      className={`p-1 rounded hover:bg-gray-100 ${
                        config.is_favorite ? 'text-yellow-500' : 'text-gray-400'
                      }`}
                      title={config.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      ⭐
                    </button>
                    
                    <button
                      onClick={() => handleSelectConfig(config)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      Use
                    </button>
                    
                    <button
                      onClick={() => handleDeleteConfig(config.id, config.name)}
                      className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete configuration"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SavedAnalysisConfigs;