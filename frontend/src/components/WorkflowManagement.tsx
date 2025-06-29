import React, { useState, useEffect } from 'react';
import workflowsService, { Workflow, WorkflowTemplate, WorkflowStatistics } from '../services/workflowsService';
import WorkflowCard from './WorkflowCard';
import CreateWorkflowModal from './CreateWorkflowModal';
import WorkflowTemplatesModal from './WorkflowTemplatesModal';
import WorkflowExecutionsModal from './WorkflowExecutionsModal';

const WorkflowManagement: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [statistics, setStatistics] = useState<WorkflowStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showExecutionsModal, setShowExecutionsModal] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  
  // Filter states
  const [showEnabledOnly, setShowEnabledOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, [showEnabledOnly]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [workflowsData, templatesData, statsData] = await Promise.all([
        workflowsService.getWorkflows(showEnabledOnly),
        workflowsService.getWorkflowTemplates(),
        workflowsService.getWorkflowStatistics()
      ]);
      
      setWorkflows(workflowsData);
      setTemplates(templatesData);
      setStatistics(statsData);
      setError(null);
    } catch (err) {
      console.error('Error loading workflow data:', err);
      setError('Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkflowCreated = (workflow: Workflow) => {
    setWorkflows(prev => [workflow, ...prev]);
    setShowCreateModal(false);
    loadData(); // Refresh statistics
  };

  const handleWorkflowUpdated = (updatedWorkflow: Workflow) => {
    setWorkflows(prev => prev.map(w => w.id === updatedWorkflow.id ? updatedWorkflow : w));
    loadData(); // Refresh statistics
  };

  const handleWorkflowDeleted = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    loadData(); // Refresh statistics
  };

  const handleWorkflowToggled = async (workflow: Workflow) => {
    try {
      const updatedWorkflow = await workflowsService.updateWorkflow(workflow.id, {
        enabled: !workflow.enabled
      });
      handleWorkflowUpdated(updatedWorkflow);
    } catch (err) {
      console.error('Error toggling workflow:', err);
      setError('Failed to toggle workflow');
    }
  };

  const handleViewExecutions = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setShowExecutionsModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analysis Workflows</h1>
          <p className="text-gray-600 mt-1">
            Automate follow-up analyses based on triggers and conditions
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowTemplatesModal(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Browse Templates
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Create Workflow
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Active Workflows</h3>
            <p className="text-2xl font-bold text-gray-900 mt-2">
              {statistics.active_workflows}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {statistics.total_workflows} total
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Success Rate</h3>
            <p className="text-2xl font-bold text-green-600 mt-2">
              {statistics.success_rate}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Last {statistics.period_days} days
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Total Executions</h3>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              {statistics.total_executions}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {statistics.successful_executions} successful, {statistics.failed_executions} failed
            </p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500">Analyses Created</h3>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {statistics.analyses_created}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Via workflow automation
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={showEnabledOnly}
            onChange={(e) => setShowEnabledOnly(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          <span className="ml-2 text-sm text-gray-600">Show enabled only</span>
        </label>
      </div>

      {/* Workflows List */}
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-4xl mb-4">🔄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
            <p className="text-gray-600 mb-4">
              {showEnabledOnly ? 
                'No enabled workflows. Try unchecking the filter or create a new workflow.' :
                'Get started by creating your first analysis workflow or using a template.'
              }
            </p>
            <div className="space-x-3">
              <button
                onClick={() => setShowTemplatesModal(true)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Browse Templates
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Create Workflow
              </button>
            </div>
          </div>
        ) : (
          workflows.map(workflow => (
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onUpdate={handleWorkflowUpdated}
              onDelete={handleWorkflowDeleted}
              onToggle={handleWorkflowToggled}
              onViewExecutions={handleViewExecutions}
            />
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateWorkflowModal
          onClose={() => setShowCreateModal(false)}
          onWorkflowCreated={handleWorkflowCreated}
          templates={templates}
        />
      )}

      {showTemplatesModal && (
        <WorkflowTemplatesModal
          templates={templates}
          onClose={() => setShowTemplatesModal(false)}
          onWorkflowCreated={handleWorkflowCreated}
        />
      )}

      {showExecutionsModal && selectedWorkflow && (
        <WorkflowExecutionsModal
          workflow={selectedWorkflow}
          onClose={() => {
            setShowExecutionsModal(false);
            setSelectedWorkflow(null);
          }}
        />
      )}
    </div>
  );
};

export default WorkflowManagement;