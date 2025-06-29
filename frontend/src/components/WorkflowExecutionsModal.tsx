import React, { useState, useEffect } from 'react';
import workflowsService, { Workflow, WorkflowExecution } from '../services/workflowsService';
import { useTimezone } from '../contexts/TimezoneContext';

interface WorkflowExecutionsModalProps {
  workflow: Workflow;
  onClose: () => void;
}

const WorkflowExecutionsModal: React.FC<WorkflowExecutionsModalProps> = ({
  workflow,
  onClose
}) => {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null);
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    loadExecutions();
  }, [workflow.id]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const executionsData = await workflowsService.getWorkflowExecutions(workflow.id);
      setExecutions(executionsData);
      setError(null);
    } catch (err) {
      console.error('Error loading executions:', err);
      setError('Failed to load execution history');
    } finally {
      setLoading(false);
    }
  };


  const getDuration = (started: string, completed?: string) => {
    const startTime = new Date(started);
    const endTime = completed ? new Date(completed) : new Date();
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    
    if (diffMins < 1) return '< 1 min';
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = (status: string) => {
    return workflowsService.getStatusColor(status);
  };

  const formatStatus = (status: string) => {
    return workflowsService.formatExecutionStatus(status);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Execution History</h2>
            <p className="text-gray-600 mt-1">{workflow.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Executions List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Executions ({executions.length})
              </h3>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {executions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">📊</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Executions</h4>
                  <p className="text-gray-600">
                    This workflow hasn't been executed yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {executions.map(execution => (
                    <div
                      key={execution.id}
                      onClick={() => setSelectedExecution(execution)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedExecution?.id === execution.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Execution Header */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`font-medium ${getStatusColor(execution.status)}`}>
                            {formatStatus(execution.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {execution.execution_type}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDateTime(execution.started_at, 'datetime')}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                          <span>Step {execution.current_step + 1} of {execution.total_steps}</span>
                          <span>{getDuration(execution.started_at, execution.completed_at)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              execution.status === 'completed' ? 'bg-green-500' :
                              execution.status === 'failed' ? 'bg-red-500' :
                              execution.status === 'running' ? 'bg-blue-500' : 'bg-gray-400'
                            }`}
                            style={{
                              width: `${Math.max(10, ((execution.current_step + 1) / execution.total_steps) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="text-sm text-gray-600">
                        {execution.created_analyses.length > 0 && (
                          <span>Created {execution.created_analyses.length} analyses</span>
                        )}
                        {execution.error_message && (
                          <span className="text-red-600">Error occurred</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Execution Details */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-6">
              {selectedExecution ? (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Execution Details</h3>

                  {/* Status and Timing */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <span className={`ml-2 font-medium ${getStatusColor(selectedExecution.status)}`}>
                          {formatStatus(selectedExecution.status)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium">{selectedExecution.execution_type}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Started:</span>
                        <span className="ml-2 font-medium">{formatDateTime(selectedExecution.started_at, 'datetime')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">
                          {getDuration(selectedExecution.started_at, selectedExecution.completed_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {selectedExecution.error_message && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                      <h4 className="font-medium text-red-800 mb-2">Error</h4>
                      <p className="text-red-700 text-sm">{selectedExecution.error_message}</p>
                    </div>
                  )}

                  {/* Step Results */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Step Results</h4>
                    <div className="space-y-3">
                      {selectedExecution.step_results.map((result, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded-lg border-l-4 ${
                            result.status === 'completed' ? 'border-l-green-500 bg-green-50' :
                            result.status === 'failed' ? 'border-l-red-500 bg-red-50' :
                            result.status === 'running' ? 'border-l-blue-500 bg-blue-50' :
                            'border-l-gray-500 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-medium text-gray-900">
                              {result.step_name || `Step ${index + 1}`}
                            </h5>
                            <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                              {formatStatus(result.status)}
                            </span>
                          </div>
                          
                          {result.analysis_type && (
                            <p className="text-sm text-gray-600 mb-2">
                              Type: {result.analysis_type}
                            </p>
                          )}
                          
                          {result.analysis_id && (
                            <p className="text-sm text-gray-600 mb-2">
                              Analysis ID: {result.analysis_id}
                            </p>
                          )}
                          
                          {result.error && (
                            <p className="text-sm text-red-600">
                              Error: {result.error}
                            </p>
                          )}
                        </div>
                      ))}

                      {/* Pending Steps */}
                      {selectedExecution.current_step < selectedExecution.total_steps - 1 && (
                        <div className="text-sm text-gray-500 text-center py-4">
                          {selectedExecution.total_steps - selectedExecution.current_step - 1} more steps pending...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Created Analyses */}
                  {selectedExecution.created_analyses.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Created Analyses</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          This execution created {selectedExecution.created_analyses.length} analysis(es):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedExecution.created_analyses.map(analysisId => (
                            <span
                              key={analysisId}
                              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                            >
                              Analysis #{analysisId}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-4xl mb-4">👈</div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Select an Execution</h4>
                  <p className="text-gray-600">
                    Choose an execution from the list to view its details.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowExecutionsModal;