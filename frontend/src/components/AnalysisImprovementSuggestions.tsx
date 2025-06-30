import React, { useState, useEffect } from 'react';
import { analysisComparisonService, AnalysisImprovementSuggestion, AnalysisImprovementSuggestionCreate, AnalysisImprovementSuggestionUpdate } from '../services/analysisComparison';
import { useTimezone } from '../contexts/TimezoneContext';

interface AnalysisImprovementSuggestionsProps {
  analysisId?: number;
  autoLoad?: boolean;
}

const AnalysisImprovementSuggestions: React.FC<AnalysisImprovementSuggestionsProps> = ({
  analysisId,
  autoLoad = true
}) => {
  const [suggestions, setSuggestions] = useState<AnalysisImprovementSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSuggestion, setNewSuggestion] = useState({
    priority_level: 'medium' as 'high' | 'medium' | 'low',
    suggestion_type: 'improvement',
    category: 'general',
    title: '',
    description: '',
    action_steps_text: ''
  });
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    if (autoLoad) {
      loadSuggestions();
    }
  }, [statusFilter, priorityFilter, categoryFilter, autoLoad]);

  const loadSuggestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const suggestionsData = await analysisComparisonService.getImprovementSuggestions(
        statusFilter || undefined,
        priorityFilter || undefined,
        categoryFilter || undefined,
        50
      );
      setSuggestions(suggestionsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load improvement suggestions');
      console.error('Error loading suggestions:', err);
    } finally {
      setLoading(false);
    }
  };

  const createSuggestion = async () => {
    if (!newSuggestion.title || !newSuggestion.description) {
      setError('Title and description are required');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const suggestionData: AnalysisImprovementSuggestionCreate = {
        analysis_id: analysisId,
        suggestion_type: newSuggestion.suggestion_type!,
        priority_level: newSuggestion.priority_level! as 'high' | 'medium' | 'low',
        category: newSuggestion.category!,
        title: newSuggestion.title!,
        description: newSuggestion.description!,
        detailed_explanation: undefined,
        action_steps: newSuggestion.action_steps_text
          ? newSuggestion.action_steps_text.split('\n').filter((step: string) => step.trim())
          : undefined
      };

      await analysisComparisonService.createImprovementSuggestion(suggestionData);
      setShowCreateForm(false);
      setNewSuggestion({
        priority_level: 'medium',
        suggestion_type: 'improvement',
        category: 'general',
        title: '',
        description: '',
        action_steps_text: ''
      });
      await loadSuggestions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create suggestion');
      console.error('Error creating suggestion:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateSuggestionStatus = async (suggestionId: string, status: string, feedback?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const update: AnalysisImprovementSuggestionUpdate = {
        status: status as any,
        user_feedback: feedback
      };

      await analysisComparisonService.updateImprovementSuggestion(suggestionId, update);
      await loadSuggestions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update suggestion');
      console.error('Error updating suggestion:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      case 'low': return '💡';
      default: return '📝';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'acknowledged': return '👀';
      case 'implemented': return '✅';
      case 'dismissed': return '❌';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'implemented': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'data_quality': return '📊';
      case 'provider_selection': return '🔧';
      case 'analysis_frequency': return '📅';
      case 'context_optimization': return '📝';
      case 'cost_optimization': return '💰';
      case 'performance': return '⚡';
      default: return '💡';
    }
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    if (analysisId && suggestion.analysis_id !== analysisId) return false;
    return true;
  });

  const groupedSuggestions = filteredSuggestions.reduce((acc, suggestion) => {
    const category = suggestion.category || 'general';
    if (!acc[category]) acc[category] = [];
    acc[category].push(suggestion);
    return acc;
  }, {} as Record<string, AnalysisImprovementSuggestion[]>);

  if (loading && suggestions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading improvement suggestions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analysis Improvement Suggestions</h2>
          <p className="text-gray-600 mt-1">
            Actionable recommendations to enhance your AI analysis effectiveness
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Add Suggestion
          </button>
          <button
            onClick={loadSuggestions}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="implemented">Implemented</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="data_quality">Data Quality</option>
              <option value="provider_selection">Provider Selection</option>
              <option value="analysis_frequency">Analysis Frequency</option>
              <option value="context_optimization">Context Optimization</option>
              <option value="cost_optimization">Cost Optimization</option>
              <option value="performance">Performance</option>
              <option value="general">General</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadSuggestions}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 w-full"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Create Suggestion Form */}
      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Suggestion</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority Level
                </label>
                <select
                  value={newSuggestion.priority_level}
                  onChange={(e) => setNewSuggestion({...newSuggestion, priority_level: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newSuggestion.category}
                  onChange={(e) => setNewSuggestion({...newSuggestion, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="general">General</option>
                  <option value="data_quality">Data Quality</option>
                  <option value="provider_selection">Provider Selection</option>
                  <option value="analysis_frequency">Analysis Frequency</option>
                  <option value="context_optimization">Context Optimization</option>
                  <option value="cost_optimization">Cost Optimization</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Suggestion Type
                </label>
                <select
                  value={newSuggestion.suggestion_type}
                  onChange={(e) => setNewSuggestion({...newSuggestion, suggestion_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="improvement">Improvement</option>
                  <option value="optimization">Optimization</option>
                  <option value="best_practice">Best Practice</option>
                  <option value="troubleshooting">Troubleshooting</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newSuggestion.title}
                onChange={(e) => setNewSuggestion({...newSuggestion, title: e.target.value})}
                placeholder="Brief title for the suggestion..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={newSuggestion.description}
                onChange={(e) => setNewSuggestion({...newSuggestion, description: e.target.value})}
                placeholder="Detailed description of the suggestion..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action Steps (one per line)
              </label>
              <textarea
                value={newSuggestion.action_steps_text}
                onChange={(e) => setNewSuggestion({...newSuggestion, action_steps_text: e.target.value})}
                placeholder="Step 1: Do this...&#10;Step 2: Then do this..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={createSuggestion}
                disabled={loading || !newSuggestion.title || !newSuggestion.description}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Suggestion'}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Suggestions Display */}
      {Object.keys(groupedSuggestions).length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No improvement suggestions available.
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Create your first suggestion to track improvements and best practices.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
            <div key={category} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <span>{getCategoryIcon(category)}</span>
                  <span className="capitalize">{category.replace(/_/g, ' ')}</span>
                  <span className="text-sm text-gray-500">({categorySuggestions.length})</span>
                </h3>
              </div>
              
              <div className="divide-y divide-gray-200">
                {categorySuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(suggestion.priority_level)}`}>
                            {getPriorityIcon(suggestion.priority_level)} {suggestion.priority_level}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(suggestion.status)}`}>
                            {getStatusIcon(suggestion.status)} {suggestion.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(suggestion.created_at, 'date')}
                          </span>
                        </div>
                        
                        <h4 className="font-medium text-gray-900 mb-2">{suggestion.title}</h4>
                        <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>
                        
                        {suggestion.action_steps && suggestion.action_steps.length > 0 && (
                          <div className="mb-3">
                            <div className="text-sm font-medium text-gray-700 mb-1">Action Steps:</div>
                            <div className="space-y-1">
                              {suggestion.action_steps.map((step, index) => (
                                <div key={index} className="text-sm text-gray-600 flex items-start space-x-2">
                                  <span className="text-gray-400">{index + 1}.</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {suggestion.expected_improvement && (
                          <div className="text-sm text-green-700 bg-green-50 rounded px-3 py-2 mb-3">
                            <strong>Expected Improvement:</strong> {suggestion.expected_improvement}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {suggestion.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateSuggestionStatus(suggestion.id, 'acknowledged')}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => updateSuggestionStatus(suggestion.id, 'implemented')}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Mark Implemented
                        </button>
                        <button
                          onClick={() => updateSuggestionStatus(suggestion.id, 'dismissed')}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                    
                    {suggestion.status === 'acknowledged' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateSuggestionStatus(suggestion.id, 'implemented')}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Mark Implemented
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalysisImprovementSuggestions;