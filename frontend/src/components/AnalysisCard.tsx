import React, { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIAnalysisResponse } from '../types/aiAnalysis';

interface AnalysisCardProps {
  analysis: AIAnalysisResponse;
  onAnalysisDeleted: () => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onAnalysisDeleted }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;

    setIsDeleting(true);
    try {
      await aiAnalysisService.deleteAnalysis(analysis.id);
      toast.success('Analysis deleted successfully');
      onAnalysisDeleted();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete analysis');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAnalysisTypeIcon = (type: string) => {
    switch (type) {
      case 'trends':
        return '📈';
      case 'insights':
        return '💡';
      case 'recommendations':
        return '🎯';
      case 'anomalies':
        return '⚠️';
      default:
        return '🤖';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return '🤖';
      case 'openrouter':
        return '🔗';
      case 'google':
        return '🔍';
      default:
        return '🤖';
    }
  };

  const formatResponse = (content: string) => {
    // Simple formatting for markdown-like content
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('## ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2">{line.substring(3)}</h3>;
        } else if (line.startsWith('# ')) {
          return <h2 key={index} className="text-xl font-bold mt-6 mb-3">{line.substring(2)}</h2>;
        } else if (line.startsWith('- ') || line.startsWith('• ')) {
          return <li key={index} className="ml-4">{line.substring(2)}</li>;
        } else if (line.trim() === '') {
          return <br key={index} />;
        } else {
          return <p key={index} className="mb-2">{line}</p>;
        }
      });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl">{getAnalysisTypeIcon(analysis.analysis_type)}</span>
              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                {analysis.analysis_type.replace('_', ' ')} Analysis
              </h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(analysis.status)}`}>
                {analysis.status}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center">
                {getProviderIcon(analysis.provider)} {analysis.provider.toUpperCase()}
              </span>
              <span>{analysis.health_data_ids.length} data points</span>
              <span>Created {format(new Date(analysis.created_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
            {analysis.completed_at && (
              <p className="text-xs text-gray-500">
                Completed {format(new Date(analysis.completed_at), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {isExpanded ? 'Hide Details' : 'View Details'}
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6">
          {analysis.status === 'completed' ? (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Analysis Results</h4>
              <div className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none">
                {formatResponse(analysis.response_content)}
              </div>
            </div>
          ) : analysis.status === 'failed' ? (
            <div>
              <h4 className="font-medium text-red-900 mb-4">Analysis Failed</h4>
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-red-800">
                  {analysis.error_message || 'An error occurred during analysis. Please try again.'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h4 className="font-medium text-gray-900 mb-4">Analysis in Progress</h4>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-blue-800">Your analysis is being processed. This may take a few minutes.</p>
                </div>
              </div>
            </div>
          )}

          {analysis.request_prompt && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-2">Analysis Request</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{analysis.request_prompt}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AnalysisCard; 