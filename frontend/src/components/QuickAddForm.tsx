import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { healthService } from '../services/health';
import { HealthDataCreate } from '../types/health';

interface QuickAddFormData {
  metric_type: string;
  value: string;
  systolic?: string;
  diastolic?: string;
  notes?: string;
}

const metricTypes = [
  { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
  { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL' },
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'temperature', label: 'Temperature', unit: '°C' },
];

const QuickAddForm: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuickAddFormData>();

  const selectedMetric = watch('metric_type');
  const currentMetric = metricTypes.find(m => m.value === selectedMetric);

  const onSubmit = async (data: QuickAddFormData) => {
    setIsLoading(true);
    try {
      const healthData: HealthDataCreate = {
        metric_type: data.metric_type,
        value: parseFloat(data.value),
        unit: currentMetric?.unit || '',
        notes: data.notes,
        recorded_at: new Date().toISOString(),
      };

      // Handle blood pressure special case
      if (data.metric_type === 'blood_pressure') {
        if (data.systolic && data.diastolic) {
          healthData.systolic = parseFloat(data.systolic);
          healthData.diastolic = parseFloat(data.diastolic);
          healthData.value = parseFloat(data.systolic); // Use systolic as main value
        }
      }

      await healthService.createHealthData(healthData);
      toast.success('Health data added successfully!');
      reset();
      setIsOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add health data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="btn-primary w-full"
      >
        + Quick Add Health Data
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Quick Add Health Data</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metric Type
          </label>
          <select
            {...register('metric_type', { required: 'Metric type is required' })}
            className="input-field"
          >
            <option value="">Select a metric</option>
            {metricTypes.map((metric) => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
          {errors.metric_type && (
            <p className="mt-1 text-sm text-red-600">{errors.metric_type.message}</p>
          )}
        </div>

        {selectedMetric === 'blood_pressure' ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Systolic (mmHg)
              </label>
              <input
                {...register('systolic', { 
                  required: 'Systolic is required',
                  pattern: { value: /^\d+$/, message: 'Must be a number' }
                })}
                type="number"
                className="input-field"
                placeholder="120"
              />
              {errors.systolic && (
                <p className="mt-1 text-sm text-red-600">{errors.systolic.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diastolic (mmHg)
              </label>
              <input
                {...register('diastolic', { 
                  required: 'Diastolic is required',
                  pattern: { value: /^\d+$/, message: 'Must be a number' }
                })}
                type="number"
                className="input-field"
                placeholder="80"
              />
              {errors.diastolic && (
                <p className="mt-1 text-sm text-red-600">{errors.diastolic.message}</p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value {currentMetric && `(${currentMetric.unit})`}
            </label>
            <input
              {...register('value', { 
                required: 'Value is required',
                pattern: { value: /^\d+(\.\d+)?$/, message: 'Must be a valid number' }
              })}
              type="number"
              step="0.1"
              className="input-field"
              placeholder={currentMetric ? `Enter ${currentMetric.label.toLowerCase()}` : 'Enter value'}
            />
            {errors.value && (
              <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            {...register('notes')}
            className="input-field"
            rows={2}
            placeholder="Any additional notes..."
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex-1"
          >
            {isLoading ? 'Adding...' : 'Add Data'}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuickAddForm; 