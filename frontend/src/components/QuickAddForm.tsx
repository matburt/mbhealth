import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { healthService } from '../services/health';
import { HealthDataCreate } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';
import { useAuth } from '../contexts/AuthContext';
import { createUnitConverter, getUnitLabel } from '../utils/units';

interface QuickAddFormData {
  metric_type: string;
  value: string;
  systolic?: string;
  diastolic?: string;
  notes?: string;
  recorded_at: string;
}

interface QuickAddFormProps {
  onDataAdded?: () => void;
}

const QuickAddForm: React.FC<QuickAddFormProps> = ({ onDataAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { getCurrentDateTimeLocal, convertToUTC } = useTimezone();
  const { user } = useAuth();
  
  // Create unit converter and metric types based on user preferences
  const unitConverter = useMemo(() => user ? createUnitConverter(user) : null, [user]);
  
  const metricTypes = useMemo(() => [
    { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
    { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL' },
    { 
      value: 'weight', 
      label: 'Weight', 
      unit: unitConverter ? getUnitLabel('weight', unitConverter.getUserUnitForMetric('weight')) : 'lbs'
    },
    { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
    { 
      value: 'temperature', 
      label: 'Temperature', 
      unit: unitConverter ? getUnitLabel('temperature', unitConverter.getUserUnitForMetric('temperature')) : '°F'
    },
  ], [unitConverter]);
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<QuickAddFormData>({
    defaultValues: {
      recorded_at: getCurrentDateTimeLocal(), // Current date/time in user's timezone
    }
  });

  const selectedMetric = watch('metric_type');
  const currentMetric = metricTypes.find(m => m.value === selectedMetric);

  const onSubmit = async (data: QuickAddFormData) => {
    setIsLoading(true);
    try {
      // Determine storage unit and convert value if needed
      const inputValue = parseFloat(data.value);
      let storageUnit = currentMetric?.unit || '';
      let storageValue = inputValue;

      // Convert from user's preferred units to storage units if needed
      if (unitConverter && (data.metric_type === 'weight' || data.metric_type === 'temperature')) {
        // Default storage units
        const storageUnits = {
          weight: 'kg',
          temperature: 'c'
        };
        
        const defaultStorageUnit = storageUnits[data.metric_type as keyof typeof storageUnits];
        if (defaultStorageUnit) {
          storageUnit = defaultStorageUnit;
          storageValue = unitConverter.convertFromUserUnits(inputValue, data.metric_type, defaultStorageUnit);
        }
      }

      const healthData: HealthDataCreate = {
        metric_type: data.metric_type,
        value: storageValue,
        unit: storageUnit,
        notes: data.notes,
        recorded_at: convertToUTC(data.recorded_at),
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
      reset({
        recorded_at: getCurrentDateTimeLocal(), // Reset to current time in user's timezone
      });
      setIsOpen(false);
      onDataAdded?.(); // Refresh parent data
    } catch (error: unknown) {
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recorded At
          </label>
          <input
            {...register('recorded_at', { 
              required: 'Recorded at is required',
              pattern: { value: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, message: 'Must be a valid date and time' }
            })}
            type="datetime-local"
            className="input-field"
          />
          {errors.recorded_at && (
            <p className="mt-1 text-sm text-red-600">{errors.recorded_at.message}</p>
          )}
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