import React, { useState } from 'react';
import workflowsService, { Workflow } from '../services/workflowsService';

interface WorkflowCardProps {
  workflow: Workflow;
  onUpdate: (workflow: Workflow) => void;
  onDelete: (workflowId: string) => void;
  onToggle: (workflow: Workflow) => void;
  onViewExecutions: (workflow: Workflow) => void;
}

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onUpdate: _onUpdate,
  onDelete,
  onToggle,
  onViewExecutions
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the workflow "${workflow.name}"?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      await workflowsService.deleteWorkflow(workflow.id);
      onDelete(workflow.id);
    } catch (err) {
      console.error('Error deleting workflow:', err);
      alert('Failed to delete workflow');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSuccessRate = () => {
    if (workflow.total_executions === 0) return '—';
    return Math.round((workflow.successful_executions / workflow.total_executions) * 100);
  };

  const getAnalysisTypeLabel = (type: string) => {
    const labels = {
      'trends': 'Trends Analysis',
      'insights': 'Health Insights', 
      'recommendations': 'Recommendations',
      'anomalies': 'Anomaly Detection'
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className={`bg-white rounded-lg shadow border-l-4 ${
      workflow.enabled ? 'border-l-green-500' : 'border-l-gray-400'
    }`}>
      {/* Main Card Content */}
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                workflow.enabled 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {workflow.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            {workflow.description && (
              <p className="text-gray-600 mt-1">{workflow.description}</p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggle(workflow)}
              className={`px-3 py-1 text-sm font-medium rounded ${
                workflow.enabled
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              } transition-colors`}
            >
              {workflow.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              onClick={() => onViewExecutions(workflow)}
              className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
            >
              View History
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-1 text-sm font-medium text-red-800 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{workflow.total_executions}</p>
            <p className="text-xs text-gray-500">Total Runs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{getSuccessRate()}%</p>
            <p className="text-xs text-gray-500">Success Rate</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{workflow.workflow_steps.length}</p>
            <p className="text-xs text-gray-500">Steps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{workflow.max_concurrent_executions}</p>
            <p className="text-xs text-gray-500">Max Concurrent</p>
          </div>
        </div>

        {/* Trigger Info */}
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">Triggers on:</span>
            <span className="ml-2 font-medium text-gray-900">
              {getAnalysisTypeLabel(workflow.trigger_analysis_type)}
            </span>
          </div>
          <div>
            {workflow.last_executed_at ? (
              <span className="text-gray-500">
                Last run: {formatDate(workflow.last_executed_at)}
              </span>
            ) : (
              <span className="text-gray-500">Never executed</span>
            )}
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>{isExpanded ? 'Hide' : 'Show'} Details</span>
            <svg
              className={`ml-2 h-4 w-4 transform transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          {/* Trigger Conditions */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Trigger Conditions</h4>
            {workflow.trigger_conditions.length === 0 ? (
              <p className="text-sm text-gray-600">No specific conditions (always triggers)</p>
            ) : (
              <div className="space-y-2">
                {workflow.trigger_conditions.map((condition, index) => (
                  <div key={index} className="bg-white rounded p-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{condition.type}</span>
                      <span className="text-gray-500">{condition.operator}</span>
                      <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                        {typeof condition.value === 'string' ? condition.value : JSON.stringify(condition.value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Workflow Steps</h4>
            <div className="space-y-3">
              {workflow.workflow_steps.map((step, index) => (
                <div key={index} className="bg-white rounded p-4 border-l-4 border-l-blue-500">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        {index + 1}. {step.name}
                      </h5>
                      <p className="text-sm text-gray-600">
                        {getAnalysisTypeLabel(step.analysis_type)}
                      </p>
                    </div>
                    {step.delay_minutes > 0 && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                        {step.delay_minutes}m delay
                      </span>
                    )}
                  </div>
                  {step.additional_context && (
                    <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 mt-2">
                      {step.additional_context}
                    </p>
                  )}
                  {step.conditions && step.conditions.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Conditions: </span>
                      {step.conditions.map((condition, condIndex) => (
                        <span key={condIndex} className="text-xs bg-gray-100 px-1 py-0.5 rounded mr-1">
                          {condition.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Settings */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Settings</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Auto Execute:</span>
                <span className="ml-2 font-medium">
                  {workflow.auto_execute ? 'Yes' : 'No (Manual approval required)'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Max Concurrent:</span>
                <span className="ml-2 font-medium">{workflow.max_concurrent_executions}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowCard;