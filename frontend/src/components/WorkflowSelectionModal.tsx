import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { analysisWorkflowService } from '../services/analysisWorkflow';
import { WorkflowTemplate, AnalysisWorkflow, WorkflowExecution } from '../types/analysisWorkflow';
import { HealthData } from '../types/health';

interface WorkflowSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowStart: (execution: WorkflowExecution) => void;
  selectedDataIds: number[];
  healthData: HealthData[];
}

const WorkflowSelectionModal: React.FC<WorkflowSelectionModalProps> = ({
  isOpen,
  onClose,
  onWorkflowStart,
  selectedDataIds,
  healthData
}) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<AnalysisWorkflow[]>([]);
  const [activeTab, setActiveTab] = useState<'templates' | 'saved'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTemplates(analysisWorkflowService.getWorkflowTemplates());
      setSavedWorkflows(analysisWorkflowService.getWorkflows());
    }
  }, [isOpen]);

  const getFilteredTemplates = (): WorkflowTemplate[] => {
    if (selectedCategory === 'all') return templates;
    return templates.filter(t => t.category === selectedCategory);
  };

  const checkDataRequirements = (template: WorkflowTemplate): { 
    canRun: boolean; 
    issues: string[] 
  } => {
    const issues: string[] = [];
    const selectedData = healthData.filter(d => selectedDataIds.includes(d.id));
    
    if (selectedData.length < template.data_requirements.min_data_points) {
      issues.push(`Needs ${template.data_requirements.min_data_points} data points (you have ${selectedData.length})`);
    }

    const availableMetrics = new Set(selectedData.map(d => d.metric_type));
    const missingMetrics = template.data_requirements.required_metrics.filter(
      metric => !availableMetrics.has(metric)
    );
    
    if (missingMetrics.length > 0) {
      issues.push(`Missing required metrics: ${missingMetrics.join(', ')}`);
    }

    // Check time span
    if (selectedData.length > 0) {
      const dates = selectedData.map(d => new Date(d.recorded_at));
      const earliest = Math.min(...dates.map(d => d.getTime()));
      const latest = Math.max(...dates.map(d => d.getTime()));
      const spanDays = (latest - earliest) / (1000 * 60 * 60 * 24);
      
      if (spanDays < template.data_requirements.time_span_days) {
        issues.push(`Needs ${template.data_requirements.time_span_days} days of data (you have ${Math.round(spanDays)} days)`);
      }
    }

    return { canRun: issues.length === 0, issues };
  };

  const handleTemplateSelect = async (template: WorkflowTemplate) => {
    const requirements = checkDataRequirements(template);
    
    if (!requirements.canRun) {
      toast.error(`Cannot run workflow: ${requirements.issues[0]}`);
      return;
    }

    setLoading(true);
    try {
      // Create workflow from template
      const workflow = analysisWorkflowService.createWorkflow(template);
      
      // Start execution
      const execution = await analysisWorkflowService.executeWorkflow(
        workflow.id,
        selectedDataIds,
        healthData,
        (updatedExecution) => {
          // This callback would update a progress modal in a real implementation
          console.log('Workflow progress:', updatedExecution);
        }
      );

      toast.success(`Started workflow: ${template.name}`);
      onWorkflowStart(execution);
      onClose();
    } catch (error) {
      toast.error(`Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSavedWorkflowSelect = async (workflow: AnalysisWorkflow) => {
    setLoading(true);
    try {
      const execution = await analysisWorkflowService.executeWorkflow(
        workflow.id,
        selectedDataIds,
        healthData
      );

      toast.success(`Started workflow: ${workflow.name}`);
      onWorkflowStart(execution);
      onClose();
    } catch (error) {
      toast.error(`Failed to start workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case 'health_monitoring': return '🏥';
      case 'diagnostic': return '🔍';
      case 'preventive': return '🛡️';
      case 'research': return '🧪';
      default: return '📋';
    }
  };

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'health_monitoring', name: 'Health Monitoring' },
    { id: 'diagnostic', name: 'Diagnostic' },
    { id: 'preventive', name: 'Preventive' },
    { id: 'research', name: 'Research' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Analysis Workflows</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'templates', label: 'Workflow Templates' },
              { id: 'saved', label: 'Saved Workflows' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'templates' && (
            <div>
              {/* Category Filter */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {getFilteredTemplates().map(template => {
                  const requirements = checkDataRequirements(template);
                  return (
                    <div
                      key={template.id}
                      className={`border rounded-lg p-6 transition-all ${
                        requirements.canRun
                          ? 'border-gray-200 hover:border-blue-300 hover:shadow-sm'
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-start space-x-4">
                        <span className="text-3xl">{template.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{template.name}</h3>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {getCategoryIcon(template.category)} {template.category.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          
                          <div className="space-y-2 text-xs text-gray-500">
                            <div className="flex justify-between">
                              <span>Steps:</span>
                              <span>{template.steps.length}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duration:</span>
                              <span>{template.estimated_duration}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Min. data points:</span>
                              <span>{template.data_requirements.min_data_points}</span>
                            </div>
                          </div>

                          {!requirements.canRun && (
                            <div className="mt-3 p-2 bg-red-100 rounded">
                              <p className="text-xs text-red-700 font-medium">Requirements not met:</p>
                              <ul className="text-xs text-red-600 list-disc list-inside">
                                {requirements.issues.map((issue, index) => (
                                  <li key={index}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <button
                            onClick={() => handleTemplateSelect(template)}
                            disabled={!requirements.canRun || loading}
                            className={`mt-4 w-full py-2 px-4 rounded text-sm font-medium transition-colors ${
                              requirements.canRun && !loading
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {loading ? 'Starting...' : 'Start Workflow'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div>
              {savedWorkflows.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-2">No saved workflows found</p>
                  <p className="text-sm">Create workflows from templates to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedWorkflows.map(workflow => (
                    <div
                      key={workflow.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{workflow.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">{workflow.description}</p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>{workflow.steps.length} steps</span>
                            <span>Used {workflow.usage_count} times</span>
                            <span>Created {new Date(workflow.created_at).toLocaleDateString()}</span>
                          </div>

                          {workflow.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {workflow.tags.map(tag => (
                                <span
                                  key={tag}
                                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                                >
                                  {tag.replace('_', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleSavedWorkflowSelect(workflow)}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300"
                          >
                            {loading ? 'Starting...' : 'Start'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <div>
              Selected: {selectedDataIds.length} data points from {healthData.length} total
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowSelectionModal;