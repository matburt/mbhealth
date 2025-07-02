import React, { useState } from 'react';
import workflowsService, { Workflow, WorkflowTemplate } from '../services/workflowsService';

interface WorkflowTemplatesModalProps {
  templates: WorkflowTemplate[];
  onClose: () => void;
  onWorkflowCreated: (workflow: Workflow) => void;
}

const WorkflowTemplatesModal: React.FC<WorkflowTemplatesModalProps> = ({
  templates,
  onClose,
  onWorkflowCreated
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [customName, setCustomName] = useState('');

  const handleCreateFromTemplate = async (template: WorkflowTemplate) => {
    try {
      setIsCreating(true);
      const workflow = await workflowsService.createWorkflowFromTemplate({
        template_id: template.id,
        name: customName || template.name
      });
      onWorkflowCreated(workflow);
      onClose();
    } catch (err) {
      console.error('Error creating workflow from template:', err);
      alert('Failed to create workflow from template');
    } finally {
      setIsCreating(false);
    }
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'anomaly_detection':
        return '🚨';
      case 'health_monitoring':
        return '📊';
      case 'health_alerts':
        return '⚠️';
      case 'onboarding':
        return '👋';
      default:
        return '🔄';
    }
  };

  {const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'anomaly_detection':
        return 'Anomaly Detection';
      case 'health_monitoring':
        return 'Health Monitoring';
      case 'health_alerts':
        return 'Health Alerts';
      case 'onboarding':
        return 'User Onboarding';
      default:
        return category;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Workflow Templates</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
              <p className="text-gray-600">
                Workflow templates will be loaded when the backend service is configured.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-gray-600">
                  Choose from predefined workflow templates to quickly set up common analysis patterns.
                  You can customize the workflow after creation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {/* Template Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCategoryIcon(template.category || '')}</span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          <p className="text-sm text-gray-500">
                            {getCategoryLabel(template.category || '')}
                          </p>
                        </div>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {template.usage_count} uses
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4">{template.description}</p>

                    {/* Trigger Info */}
                    <div className="mb-4">
                      <span className="text-xs text-gray-500">Triggers on:</span>
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        {getAnalysisTypeLabel(template.trigger_analysis_type)}
                      </span>
                    </div>

                    {/* Steps Preview */}
                    <div className="mb-4">
                      <span className="text-xs text-gray-500 block mb-2">Workflow Steps:</span>
                      <div className="space-y-1">
                        {template.workflow_steps.slice(0, 3).map((step, index) => (
                          <div key={index} className="text-xs bg-gray-50 rounded p-2">
                            <span className="font-medium">{index + 1}. {step.name}</span>
                            <span className="text-gray-500 ml-2">
                              ({getAnalysisTypeLabel(step.analysis_type)})
                            </span>
                          </div>
                        ))}
                        {template.workflow_steps.length > 3 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{template.workflow_steps.length - 3} more steps
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Use Template Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTemplate(template);
                      }}
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                      Use This Template
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Selected Template Details */}
        {selectedTemplate && (
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Create workflow from "{selectedTemplate.name}"
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Name (optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={selectedTemplate.name}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use the template name: "{selectedTemplate.name}"
              </p>
            </div>

            {/* Template Details */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Template Details</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Triggers on:</span>
                  <span className="ml-2 font-medium">
                    {getAnalysisTypeLabel(selectedTemplate.trigger_analysis_type)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Steps:</span>
                  <span className="ml-2 font-medium">{selectedTemplate.workflow_steps.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Conditions:</span>
                  <span className="ml-2 font-medium">
                    {selectedTemplate.trigger_conditions.length === 0 
                      ? 'None (always triggers)' 
                      : `${selectedTemplate.trigger_conditions.length} condition(s)`
                    }
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setCustomName('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCreateFromTemplate(selectedTemplate)}
                disabled={isCreating}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Workflow'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowTemplatesModal;