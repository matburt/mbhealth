import React from 'react';

interface DefaultModelFieldProps {
  value: string | undefined;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  availableModels: string[];
  name?: string;
}

const DefaultModelField: React.FC<DefaultModelFieldProps> = ({ 
  value, 
  onChange, 
  availableModels,
  name = "default_model"
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Default Model <span className="text-gray-500 text-sm font-normal">(Optional)</span>
      </label>
      
      {availableModels.length > 0 ? (
        <>
          <select
            name={name}
            value={value || ''}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            aria-describedby="default-model-help"
          >
            <option value="">Select a model or enter custom model name below</option>
            {availableModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
          <div className="mt-2">
            <input
              type="text"
              name={name}
              value={value || ''}
              onChange={onChange}
              placeholder="Or enter a custom model name (e.g., gpt-4, claude-3-sonnet, gemini-pro)"
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="default-model-help"
            />
          </div>
        </>
      ) : (
        <input
          type="text"
          name={name}
          value={value || ''}
          onChange={onChange}
          placeholder="Enter model name (e.g., gpt-4, claude-3-sonnet, gemini-pro) - Test connection to see available models"
          className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-describedby="default-model-help"
        />
      )}
      
      <p id="default-model-help" className="text-xs text-gray-500 mt-1">
        Specify which model to use by default for this provider. If not set, the provider will use its own default model.
      </p>
    </div>
  );
};

export default DefaultModelField;