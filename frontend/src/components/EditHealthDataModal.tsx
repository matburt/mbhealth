import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { healthService } from '../services/health';
import { HealthData, HealthDataUpdate } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';

interface EditHealthDataModalProps {
  healthData: HealthData;
  isOpen: boolean;
  onClose: () => void;
  onDataChange: () => void;
}

interface EditFormData {
  value: string;
  systolic?: string;
  diastolic?: string;
  notes?: string;
  recorded_at: string;
}

const metricTypes = [
  { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg' },
  { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL' },
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'temperature', label: 'Temperature', unit: '°C' },
];

const EditHealthDataModal: React.FC<EditHealthDataModalProps> = ({
  healthData,
  isOpen,
  onClose,
  onDataChange,
}) => {
  const currentMetric = metricTypes.find(m => m.value === healthData.metric_type);
  const { convertToDateTimeLocal, convertToUTC } = useTimezone();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EditFormData>({
    defaultValues: {
      value: healthData.value.toString(),
      systolic: healthData.systolic?.toString() || '',
      diastolic: healthData.diastolic?.toString() || '',
      notes: healthData.notes || '',
      recorded_at: convertToDateTimeLocal(healthData.recorded_at),
    }
  });

  const onSubmit = async (data: EditFormData) => {
    try {
      const updateData: HealthDataUpdate = {
        value: parseFloat(data.value),
        notes: data.notes,
        recorded_at: convertToUTC(data.recorded_at),
      };

      // Handle blood pressure special case
      if (healthData.metric_type === 'blood_pressure') {
        if (data.systolic && data.diastolic) {
          updateData.systolic = parseFloat(data.systolic);
          updateData.diastolic = parseFloat(data.diastolic);
          updateData.value = parseFloat(data.systolic); // Use systolic as main value
        }
      }

      await healthService.updateHealthData(healthData.id, updateData);
      toast.success('Health data updated successfully!');
      onDataChange();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update health data');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Edit Health Data</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Metric Type Display (read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric Type
            </label>
            <div className="input-field bg-gray-50 text-gray-600">
              {currentMetric?.label} ({currentMetric?.unit})
            </div>
          </div>

          {/* Value Input */}
          {healthData.metric_type === 'blood_pressure' ? (
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

          {/* Date and Time Input */}
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

          {/* Notes Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              className="input-field"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex-1"
            >
              {isSubmitting ? 'Updating...' : 'Update Data'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditHealthDataModal; 