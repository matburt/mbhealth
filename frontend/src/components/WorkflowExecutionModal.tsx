import React, { useState, useEffect } from 'react';
import { WorkflowExecution, WorkflowStepResult, FollowUpSuggestion } from '../types/analysisWorkflow';
import { analysisWorkflowService } from '../services/analysisWorkflow';
import { useTimezone } from '../contexts/TimezoneContext';

interface WorkflowExecutionModalProps {
  execution: WorkflowExecution | null;
  isOpen: boolean;
  onClose: () => void;
  onViewAnalysis: (analysisId: number) => void;
}

const WorkflowExecutionModal: React.FC<WorkflowExecutionModalProps> = ({
  execution,
  isOpen,
  onClose,
  onViewAnalysis
}) => {
  const [currentExecution, setCurrentExecution] = useState<WorkflowExecution | null>(execution);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    setCurrentExecution(execution);
  }, [execution]);

  // Auto-refresh execution status if still running
  useEffect(() => {
    if (!currentExecution || currentExecution.status === 'completed' || currentExecution.status === 'failed') {
      return;
    }

    const interval = setInterval(() => {
      if (currentExecution) {
        const updated = analysisWorkflowService.getExecution(currentExecution.id);
        if (updated) {
          setCurrentExecution(updated);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentExecution]);

  const getStepStatusIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'skipped': return '⏭️';
      default: return '❓';
    }
  };

  const getStepStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'skipped': return 'text-yellow-600';
      default: return 'text-gray-400';
    }
  };

  const getExecutionStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (): number => {
    if (!currentExecution) return 0;
    const completedSteps = currentExecution.results.filter(r => 
      r.status === 'completed' || r.status === 'skipped'
    ).length;
    return Math.round((completedSteps / currentExecution.total_steps) * 100);
  };

  const renderFollowUpSuggestions = (suggestions: FollowUpSuggestion[]) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
      <div className="mt-4 space-y-3">
        <h5 className="text-sm font-medium text-gray-900">Follow-up Suggestions:</h5>
        {suggestions.map((suggestion, index) => (
          <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start space-x-3">
              <span className="text-lg">
                {suggestion.type === 'analysis' ? '🔬' : 
                 suggestion.type === 'consultation' ? '🩺' :
                 suggestion.type === 'data_collection' ? '📊' : '💡'}
              </span>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h6 className="font-medium text-blue-900">{suggestion.title}</h6>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    suggestion.priority === 'high' ? 'bg-red-100 text-red-800' :
                    suggestion.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {suggestion.priority}
                  </span>
                </div>
                <p className="text-sm text-blue-700 mt-1">{suggestion.description}</p>
                
                {suggestion.action_items && suggestion.action_items.length > 0 && (
                  <ul className="text-xs text-blue-600 mt-2 list-disc list-inside">
                    {suggestion.action_items.map((item, itemIndex) => (
                      <li key={itemIndex}>{item}</li>
                    ))}
                  </ul>
                )}

                {suggestion.suggested_analysis && (
                  <button className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                    Run Suggested Analysis
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStepResult = (result: WorkflowStepResult) => {
    const isExpanded = expandedStep === result.step_id;

    return (
      <div key={result.step_id} className="border border-gray-200 rounded-lg">
        <button
          onClick={() => setExpandedStep(isExpanded ? null : result.step_id)}
          className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`text-lg ${getStepStatusColor(result.status)}`}>
                {getStepStatusIcon(result.status)}
              </span>
              <div>
                <h4 className="font-medium text-gray-900">{result.step_name}</h4>
                <p className="text-sm text-gray-600">
                  {result.selected_data_ids.length} data points • Status: {result.status}
                </p>
              </div>
            </div>
            <span className="text-gray-400">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="mt-3 space-y-3">
              {/* Timing Info */}
              <div className="text-xs text-gray-500">
                <p>Started: {formatDateTime(result.started_at, 'datetime')}</p>
                {result.completed_at && (
                  <p>Completed: {formatDateTime(result.completed_at, 'datetime')}</p>
                )}
              </div>

              {/* Error Message */}
              {result.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700">{result.error_message}</p>
                </div>
              )}

              {/* Analysis Result */}
              {result.analysis_result && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="text-sm font-medium text-gray-900">Analysis Result:</h5>
                    <button
                      onClick={() => onViewAnalysis(result.analysis_result!.id)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      View Full Analysis
                    </button>
                  </div>
                  <div className="bg-gray-50 rounded p-3 max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-700">
                      {result.analysis_result.response_content?.slice(0, 300)}
                      {result.analysis_result.response_content && result.analysis_result.response_content.length > 300 && '...'}
                    </p>
                  </div>
                </div>
              )}

              {/* Follow-up Suggestions */}
              {result.follow_up_suggestions && renderFollowUpSuggestions(result.follow_up_suggestions)}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen || !currentExecution) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{currentExecution.workflow_name}</h2>
            <div className="flex items-center space-x-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getExecutionStatusColor(currentExecution.status)}`}>
                {currentExecution.status}
              </span>
              <span className="text-sm text-gray-600">
                Step {currentExecution.current_step + 1} of {currentExecution.total_steps}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-600">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">
          {/* Execution Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Started:</span>
                <p className="font-medium">{formatDateTime(currentExecution.started_at, 'datetime')}</p>
              </div>
              {currentExecution.completed_at && (
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <p className="font-medium">{formatDateTime(currentExecution.completed_at, 'datetime')}</p>
                </div>
              )}
              <div>
                <span className="text-gray-600">Data Points:</span>
                <p className="font-medium">{currentExecution.initial_data_ids.length}</p>
              </div>
              <div>
                <span className="text-gray-600">Steps:</span>
                <p className="font-medium">{currentExecution.total_steps}</p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {currentExecution.error_message && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-2">Execution Error</h4>
              <p className="text-sm text-red-700">{currentExecution.error_message}</p>
            </div>
          )}

          {/* Steps */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Steps</h3>
            <div className="space-y-3">
              {currentExecution.results.map(renderStepResult)}
            </div>
          </div>

          {/* Summary Actions */}
          {currentExecution.status === 'completed' && (
            <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-900 mb-3">Workflow Complete! 🎉</h4>
              <div className="flex flex-wrap gap-2">
                <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
                  Generate Summary Report
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                  Run Comparative Analysis
                </button>
                <button className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors">
                  Save as Template
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Execution ID: {currentExecution.id}
            </div>
            <div className="flex space-x-3">
              {currentExecution.status === 'running' && (
                <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors">
                  Cancel Workflow
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowExecutionModal;