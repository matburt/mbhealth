import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import workflowsService, { 
  Workflow, 
  WorkflowTemplate, 
  CreateWorkflowRequest
} from '../services/workflowsService';

interface CreateWorkflowModalProps {
  onClose: () => void;
  onWorkflowCreated: (workflow: Workflow) => void;
  templates: WorkflowTemplate[];
}

interface FormData extends CreateWorkflowRequest {}

const CreateWorkflowModal: React.FC<CreateWorkflowModalProps> = ({
  onClose,
  onWorkflowCreated,
  templates
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      name: '',
      description: '',
      trigger_analysis_type: 'trends',
      trigger_conditions: [],
      workflow_steps: [{
        name: 'Follow-up Analysis',
        analysis_type: 'insights',
        delay_minutes: 0,
        additional_context: '',
        conditions: []
      }],
      auto_execute: true,
      max_concurrent_executions: 1,
      enabled: true
    }
  });

  const { fields: stepFields, append: appendStep, remove: removeStep } = useFieldArray({
    control,
    name: 'workflow_steps'
  });

  const { fields: conditionFields, append: appendCondition, remove: removeCondition } = useFieldArray({
    control,
    name: 'trigger_conditions'
  });

  const analysisTypeOptions = workflowsService.getAnalysisTypeOptions();
  const conditionTypeOptions = workflowsService.getConditionTypeOptions();

  const applyTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template);
    setValue('name', template.name);
    setValue('description', template.description);
    setValue('trigger_analysis_type', template.trigger_analysis_type);
    setValue('trigger_conditions', template.trigger_conditions);
    setValue('workflow_steps', template.workflow_steps);
  };

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      const workflow = await workflowsService.createWorkflow(data);
      onWorkflowCreated(workflow);
    } catch (err) {
      console.error('Error creating workflow:', err);
      alert('Failed to create workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Analysis Workflow</h2>
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Template Selection */}
            {templates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start from Template (Optional)
                </label>
                <select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value);
                    if (template) applyTemplate(template);
                  }}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select a template...</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.category})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name *
                </label>
                <input
                  {...register('name', { required: 'Name is required' })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="e.g., Blood Pressure Monitoring Workflow"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Analysis Type *
                </label>
                <select
                  {...register('trigger_analysis_type', { required: 'Trigger type is required' })}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  {analysisTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={3}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Describe what this workflow does..."
              />
            </div>

            {/* Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="flex items-center">
                  <input
                    {...register('auto_execute')}
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto Execute</span>
                </label>
              </div>
              
              <div>
                <label className="flex items-center">
                  <input
                    {...register('enabled')}
                    type="checkbox"
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enabled</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Concurrent
                </label>
                <input
                  {...register('max_concurrent_executions', { 
                    required: 'Required',
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 10, message: 'Must be 10 or less' }
                  })}
                  type="number"
                  min="1"
                  max="10"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Trigger Conditions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Trigger Conditions</h3>
                <button
                  type="button"
                  onClick={() => appendCondition({ type: 'analysis_status', operator: 'equals', value: 'completed' })}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Add Condition
                </button>
              </div>
              
              {conditionFields.length === 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  No conditions means the workflow will trigger on any analysis of the specified type.
                </p>
              )}

              <div className="space-y-3">
                {conditionFields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select
                          {...register(`trigger_conditions.${index}.type` as const)}
                          className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          {conditionTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                        <select
                          {...register(`trigger_conditions.${index}.operator` as const)}
                          className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greater_than">Greater Than</option>
                          <option value="less_than">Less Than</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                        <input
                          {...register(`trigger_conditions.${index}.value` as const)}
                          className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="e.g., completed, anomaly"
                        />
                      </div>
                      
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Workflow Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Workflow Steps</h3>
                <button
                  type="button"
                  onClick={() => appendStep({
                    name: `Step ${stepFields.length + 1}`,
                    analysis_type: 'insights',
                    delay_minutes: 0,
                    additional_context: '',
                    conditions: []
                  })}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                  Add Step
                </button>
              </div>

              <div className="space-y-4">
                {stepFields.map((field, index) => (
                  <div key={field.id} className="bg-gray-50 rounded-lg p-4 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">Step {index + 1}</h4>
                      {stepFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove Step
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Step Name</label>
                        <input
                          {...register(`workflow_steps.${index}.name` as const, { required: 'Name is required' })}
                          className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          placeholder="e.g., Detailed Analysis"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Type</label>
                        <select
                          {...register(`workflow_steps.${index}.analysis_type` as const)}
                          className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        >
                          {analysisTypeOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Delay (minutes)</label>
                        <input
                          {...register(`workflow_steps.${index}.delay_minutes` as const, { 
                            min: { value: 0, message: 'Must be 0 or greater' }
                          })}
                          type="number"
                          min="0"
                          className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Additional Context</label>
                      <textarea
                        {...register(`workflow_steps.${index}.additional_context` as const)}
                        rows={2}
                        className="w-full rounded border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Provide specific instructions for this analysis step..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkflowModal;