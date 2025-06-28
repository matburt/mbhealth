import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIProvider, SupportedProviderType } from '../types/aiAnalysis';
import ProviderCard from '../components/ProviderCard';
import CreateProviderModal from '../components/CreateProviderModal';
import EditProviderModal from '../components/EditProviderModal';

const AIProvidersPage: React.FC = () => {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [supportedTypes, setSupportedTypes] = useState<Record<string, SupportedProviderType>>({});
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(null);
  const [testingProviders, setTestingProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProviders();
    fetchSupportedTypes();
  }, []);

  const fetchProviders = async () => {
    try {
      const data = await aiAnalysisService.getProviders();
      setProviders(data);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      toast.error('Failed to load AI providers');
    }
  };

  const fetchSupportedTypes = async () => {
    try {
      const data = await aiAnalysisService.getSupportedProviderTypes();
      setSupportedTypes(data);
    } catch (error) {
      console.error('Failed to fetch supported types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProviderCreated = () => {
    fetchProviders();
    setCreateModalOpen(false);
  };

  const handleProviderUpdated = () => {
    fetchProviders();
    setEditModalOpen(false);
    setEditingProvider(null);
  };

  const handleEditProvider = (provider: AIProvider) => {
    setEditingProvider(provider);
    setEditModalOpen(true);
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this AI provider? This action cannot be undone.')) {
      return;
    }

    try {
      await aiAnalysisService.deleteProvider(providerId);
      toast.success('Provider deleted successfully');
      fetchProviders();
    } catch (error) {
      console.error('Failed to delete provider:', error);
      toast.error('Failed to delete provider');
    }
  };

  const handleTestProvider = async (providerId: string) => {
    setTestingProviders(prev => new Set(prev).add(providerId));
    
    try {
      const result = await aiAnalysisService.testProvider(providerId);
      
      if (result.success) {
        toast.success(`Provider test successful${result.response_time ? ` (${Math.round(result.response_time * 1000)}ms)` : ''}`);
      } else {
        toast.error(`Provider test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to test provider:', error);
      toast.error('Provider test failed');
    } finally {
      setTestingProviders(prev => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
    }
  };

  const handleToggleProvider = async (provider: AIProvider) => {
    try {
      await aiAnalysisService.updateProvider(provider.id, {
        enabled: !provider.enabled
      });
      toast.success(`Provider ${provider.enabled ? 'disabled' : 'enabled'}`);
      fetchProviders();
    } catch (error) {
      console.error('Failed to toggle provider:', error);
      toast.error('Failed to update provider status');
    }
  };

  const enabledProviders = providers.filter(p => p.enabled);
  const disabledProviders = providers.filter(p => !p.enabled);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Providers</h1>
          <p className="text-gray-600 mt-2">
            Manage your AI providers for health data analysis
          </p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Add Provider
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{providers.length}</h3>
              <p className="text-sm text-gray-600">Total Providers</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{enabledProviders.length}</h3>
              <p className="text-sm text-gray-600">Active Providers</p>
            </div>
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{Object.keys(supportedTypes).length}</h3>
              <p className="text-sm text-gray-600">Supported Types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Providers */}
      {enabledProviders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Active Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enabledProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                supportedType={supportedTypes[provider.type]}
                onEdit={() => handleEditProvider(provider)}
                onDelete={() => handleDeleteProvider(provider.id)}
                onTest={() => handleTestProvider(provider.id)}
                onToggle={() => handleToggleProvider(provider)}
                testing={testingProviders.has(provider.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Disabled Providers */}
      {disabledProviders.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Disabled Providers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disabledProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                supportedType={supportedTypes[provider.type]}
                onEdit={() => handleEditProvider(provider)}
                onDelete={() => handleDeleteProvider(provider.id)}
                onTest={() => handleTestProvider(provider.id)}
                onToggle={() => handleToggleProvider(provider)}
                testing={testingProviders.has(provider.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {providers.length === 0 && (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No AI providers configured
          </h3>
          <p className="text-gray-600 mb-4">
            Add your first AI provider to start generating health insights
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary"
          >
            Add Your First Provider
          </button>
        </div>
      )}

      {/* Modals */}
      {createModalOpen && (
        <CreateProviderModal
          supportedTypes={supportedTypes}
          onClose={() => setCreateModalOpen(false)}
          onProviderCreated={handleProviderCreated}
        />
      )}

      {editModalOpen && editingProvider && (
        <EditProviderModal
          provider={editingProvider}
          supportedTypes={supportedTypes}
          onClose={() => {
            setEditModalOpen(false);
            setEditingProvider(null);
          }}
          onProviderUpdated={handleProviderUpdated}
        />
      )}
    </div>
  );
};

export default AIProvidersPage;