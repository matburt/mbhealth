import React, { useState } from 'react';

interface TemplateParameter {
  type: 'string' | 'number' | 'select' | 'array' | 'time' | 'boolean';
  description: string;
  default: unknown;
  options?: string[];
  min?: number;
  max?: number;
}

interface TemplateParametersModalProps {
  templateName: string;
  parameters: Record<string, TemplateParameter>;
  onConfirm: (customizations: Record<string, unknown>) => void;
  onCancel: () => void;
  loading?: boolean;
}

const TemplateParametersModal: React.FC<TemplateParametersModalProps> = ({
  templateName,
  parameters,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initialValues: Record<string, unknown> = {};
    Object.entries(parameters).forEach(([key, param]) => {
      initialValues[key] = param.default;
    });
    return initialValues;
  });

  const handleInputChange = (key: string, value: unknown) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(values);
  };

  const renderInput = (key: string, param: TemplateParameter) => {
    const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

    switch (param.type) {
      case 'number':
        return (
          <input
            type="number"
            value={values[key] || param.default}
            onChange={(e) => handleInputChange(key, parseInt(e.target.value))}
            min={param.min}
            max={param.max}
            className={baseClasses}
          />
        );
      
      case 'time':
        return (
          <input
            type="time"
            value={values[key] || param.default}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className={baseClasses}
          />
        );
      
      case 'select':
        return (
          <select
            value={values[key] || param.default}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className={baseClasses}
          >
            {param.options?.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
              </option>
            ))}
          </select>
        );
      
      case 'array':
        return (
          <div className="space-y-2">
            {param.options?.map(option => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  checked={(values[key] || param.default || []).includes(option)}
                  onChange={(e) => {
                    {const currentArray = values[key] || param.default || [];
                    if (e.target.checked) {
                      handleInputChange(key, [...currentArray, option]);
                    } else {
                      handleInputChange(key, currentArray.filter((item: string) => item !== option));
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">
                  {option.charAt(0).toUpperCase() + option.slice(1).replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={values[key] !== undefined ? values[key] : param.default}
              onChange={(e) => handleInputChange(key, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Enable</span>
          </label>
        );
      
      default:
        return (
          <input
            type="text"
            value={values[key] || param.default}
            onChange={(e) => handleInputChange(key, e.target.value)}
            className={baseClasses}
          />
        );
    }
  };

  {const hasParameters = Object.keys(parameters).length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Customize Template: {templateName}
          </h2>
          <p className="text-gray-600 mt-1">
            {hasParameters ? 'Adjust the parameters below or use the defaults' : 'This template will be created with default settings'}
          </p>
        </div>

        <div className="p-6">
          {hasParameters ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {Object.entries(parameters).map(([key, param]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')}
                  </label>
                  <p className="text-sm text-gray-600 mb-2">{param.description}</p>
                  {renderInput(key, param)}
                </div>
              ))}

              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600">
                This template doesn't have customizable parameters. It will be created with the default configuration.
              </p>
              
              <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={() => onConfirm({})}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Schedule'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateParametersModal;