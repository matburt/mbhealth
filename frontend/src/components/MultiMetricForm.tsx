import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { healthService } from '../services/health';
import { HealthDataCreate } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';
import { useAuth } from '../contexts/AuthContext';
import { createUnitConverter, getUnitLabel } from '../utils/units';

interface MultiMetricFormData {
  recorded_at: string;
  notes: string;
  
  // Blood Pressure
  bp_enabled: boolean;
  systolic?: string;
  diastolic?: string;
  
  // Blood Sugar
  bs_enabled: boolean;
  blood_sugar?: string;
  
  // Weight
  weight_enabled: boolean;
  weight?: string;
  
  // Heart Rate
  hr_enabled: boolean;
  heart_rate?: string;
  
  // Temperature
  temp_enabled: boolean;
  temperature?: string;
}

interface MetricToggle {
  key: string;
  label: string;
  icon: string;
  enabledField: keyof MultiMetricFormData;
  color: string;
}

interface MultiMetricFormProps {
  onDataAdded?: () => void;
  presetMetrics?: string[];
}

const MultiMetricForm: React.FC<MultiMetricFormProps> = ({ onDataAdded, presetMetrics }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { getCurrentDateTimeLocal, convertToUTC } = useTimezone();
  const { user } = useAuth();
  
  const unitConverter = useMemo(() => user ? createUnitConverter(user) : null, [user]);
  
  const metricToggles: MetricToggle[] = [
    { key: 'bp', label: 'Blood Pressure', icon: '🩸', enabledField: 'bp_enabled', color: 'red' },
    { key: 'bs', label: 'Blood Sugar', icon: '🍭', enabledField: 'bs_enabled', color: 'blue' },
    { key: 'weight', label: 'Weight', icon: '⚖️', enabledField: 'weight_enabled', color: 'green' },
    { key: 'hr', label: 'Heart Rate', icon: '❤️', enabledField: 'hr_enabled', color: 'pink' },
    { key: 'temp', label: 'Temperature', icon: '🌡️', enabledField: 'temp_enabled', color: 'orange' },
  ];
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MultiMetricFormData>({
    defaultValues: {
      recorded_at: getCurrentDateTimeLocal(),
      notes: '',
      bp_enabled: false,
      bs_enabled: false,
      weight_enabled: false,
      hr_enabled: false,
      temp_enabled: false,
    }
  });

  const watchedValues = watch();
  const enabledMetrics = metricToggles.filter(toggle => watchedValues[toggle.enabledField]);

  const getUnitForMetric = (metricType: string): string => {
    switch (metricType) {
      case 'bp':
        return 'mmHg';
      case 'bs':
        return 'mg/dL';
      case 'weight':
        return unitConverter ? getUnitLabel('weight', unitConverter.getUserUnitForMetric('weight')) : 'lbs';
      case 'hr':
        return 'bpm';
      case 'temp':
        return unitConverter ? getUnitLabel('temperature', unitConverter.getUserUnitForMetric('temperature')) : '°F';
      default:
        return '';
    }
  };

  const toggleMetric = (toggle: MetricToggle) => {
    setValue(toggle.enabledField, !watchedValues[toggle.enabledField]);
  };

  const applyPreset = (metrics: string[]) => {
    // Reset all toggles first
    metricToggles.forEach(toggle => {
      setValue(toggle.enabledField, false);
    });
    
    // Enable selected metrics
    metrics.forEach(metricKey => {
      const toggle = metricToggles.find(t => t.key === metricKey);
      if (toggle) {
        setValue(toggle.enabledField, true);
      }
    });
  };

  // Quick preset buttons
  const quickPresets = [
    { name: 'Morning', icon: '🌅', metrics: ['weight', 'bp', 'hr'] },
    { name: 'Post-Meal', icon: '🍽️', metrics: ['bs', 'bp'] },
    { name: 'All Vitals', icon: '🩺', metrics: ['bp', 'bs', 'weight', 'hr', 'temp'] }
  ];

  const onSubmit = async (data: MultiMetricFormData) => {
    const enabledCount = enabledMetrics.length;
    if (enabledCount === 0) {
      toast.error('Please select at least one metric to track');
      return;
    }

    setIsLoading(true);
    const healthDataArray: HealthDataCreate[] = [];

    try {
      // Blood Pressure
      if (data.bp_enabled && data.systolic && data.diastolic) {
        healthDataArray.push({
          metric_type: 'blood_pressure',
          value: parseFloat(data.systolic),
          systolic: parseFloat(data.systolic),
          diastolic: parseFloat(data.diastolic),
          unit: 'mmHg',
          notes: data.notes,
          recorded_at: convertToUTC(data.recorded_at),
        });
      }

      // Blood Sugar
      if (data.bs_enabled && data.blood_sugar) {
        healthDataArray.push({
          metric_type: 'blood_sugar',
          value: parseFloat(data.blood_sugar),
          unit: 'mg/dL',
          notes: data.notes,
          recorded_at: convertToUTC(data.recorded_at),
        });
      }

      // Weight
      if (data.weight_enabled && data.weight) {
        let storageValue = parseFloat(data.weight);
        let storageUnit = 'kg';
        
        if (unitConverter) {
          storageValue = unitConverter.convertFromUserUnits(storageValue, 'weight', 'kg');
        }
        
        healthDataArray.push({
          metric_type: 'weight',
          value: storageValue,
          unit: storageUnit,
          notes: data.notes,
          recorded_at: convertToUTC(data.recorded_at),
        });
      }

      // Heart Rate
      if (data.hr_enabled && data.heart_rate) {
        healthDataArray.push({
          metric_type: 'heart_rate',
          value: parseFloat(data.heart_rate),
          unit: 'bpm',
          notes: data.notes,
          recorded_at: convertToUTC(data.recorded_at),
        });
      }

      // Temperature
      if (data.temp_enabled && data.temperature) {
        let storageValue = parseFloat(data.temperature);
        let storageUnit = 'c';
        
        if (unitConverter) {
          storageValue = unitConverter.convertFromUserUnits(storageValue, 'temperature', 'c');
        }
        
        healthDataArray.push({
          metric_type: 'temperature',
          value: storageValue,
          unit: storageUnit,
          notes: data.notes,
          recorded_at: convertToUTC(data.recorded_at),
        });
      }

      // Create all health data entries
      const promises = healthDataArray.map(healthData => 
        healthService.createHealthData(healthData)
      );
      
      await Promise.all(promises);
      
      toast.success(`Successfully added ${healthDataArray.length} health metric${healthDataArray.length > 1 ? 's' : ''}!`);
      
      reset({
        recorded_at: getCurrentDateTimeLocal(),
        notes: '',
        bp_enabled: false,
        bs_enabled: false,
        weight_enabled: false,
        hr_enabled: false,
        temp_enabled: false,
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
        + Multi-Metric Quick Add
      </button>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Multi-Metric Health Entry</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Quick Presets */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Presets
          </label>
          <div className="flex flex-wrap gap-2 mb-4">
            {quickPresets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyPreset(preset.metrics)}
                className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm flex items-center space-x-1"
              >
                <span>{preset.icon}</span>
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Metric Selection Toggles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Metrics to Track
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {metricToggles.map((toggle) => (
              <button
                key={toggle.key}
                type="button"
                onClick={() => toggleMetric(toggle)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  watchedValues[toggle.enabledField]
                    ? `border-${toggle.color}-500 bg-${toggle.color}-50 text-${toggle.color}-700`
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-xl mb-1">{toggle.icon}</div>
                <div className="text-xs font-medium">{toggle.label}</div>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {enabledMetrics.length === 0 ? 'Select one or more metrics to track' : 
             `${enabledMetrics.length} metric${enabledMetrics.length > 1 ? 's' : ''} selected`}
          </p>
        </div>

        {/* Date/Time and Notes (always visible) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              className="input-field"
              rows={2}
              placeholder="Shared notes for all metrics..."
            />
          </div>
        </div>

        {/* Dynamic Metric Input Fields */}
        {enabledMetrics.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Enter Values</h4>
            
            {/* Blood Pressure */}
            {watchedValues.bp_enabled && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">🩸</span>
                  <h5 className="font-medium text-red-800">Blood Pressure</h5>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-red-700 mb-1">
                      Systolic (mmHg)
                    </label>
                    <input
                      {...register('systolic', { 
                        required: watchedValues.bp_enabled ? 'Systolic is required' : false,
                        pattern: { value: /^\d+$/, message: 'Must be a number' }
                      })}
                      type="number"
                      className="input-field text-sm"
                      placeholder="120"
                    />
                    {errors.systolic && (
                      <p className="mt-1 text-xs text-red-600">{errors.systolic.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-red-700 mb-1">
                      Diastolic (mmHg)
                    </label>
                    <input
                      {...register('diastolic', { 
                        required: watchedValues.bp_enabled ? 'Diastolic is required' : false,
                        pattern: { value: /^\d+$/, message: 'Must be a number' }
                      })}
                      type="number"
                      className="input-field text-sm"
                      placeholder="80"
                    />
                    {errors.diastolic && (
                      <p className="mt-1 text-xs text-red-600">{errors.diastolic.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Blood Sugar */}
            {watchedValues.bs_enabled && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">🍭</span>
                  <h5 className="font-medium text-blue-800">Blood Sugar</h5>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">
                    Glucose ({getUnitForMetric('bs')})
                  </label>
                  <input
                    {...register('blood_sugar', { 
                      required: watchedValues.bs_enabled ? 'Blood sugar is required' : false,
                      pattern: { value: /^\d+(\.\d+)?$/, message: 'Must be a valid number' }
                    })}
                    type="number"
                    step="0.1"
                    className="input-field text-sm"
                    placeholder="100"
                  />
                  {errors.blood_sugar && (
                    <p className="mt-1 text-xs text-red-600">{errors.blood_sugar.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Weight */}
            {watchedValues.weight_enabled && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">⚖️</span>
                  <h5 className="font-medium text-green-800">Weight</h5>
                </div>
                <div>
                  <label className="block text-xs font-medium text-green-700 mb-1">
                    Weight ({getUnitForMetric('weight')})
                  </label>
                  <input
                    {...register('weight', { 
                      required: watchedValues.weight_enabled ? 'Weight is required' : false,
                      pattern: { value: /^\d+(\.\d+)?$/, message: 'Must be a valid number' }
                    })}
                    type="number"
                    step="0.1"
                    className="input-field text-sm"
                    placeholder="150"
                  />
                  {errors.weight && (
                    <p className="mt-1 text-xs text-red-600">{errors.weight.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Heart Rate */}
            {watchedValues.hr_enabled && (
              <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">❤️</span>
                  <h5 className="font-medium text-pink-800">Heart Rate</h5>
                </div>
                <div>
                  <label className="block text-xs font-medium text-pink-700 mb-1">
                    BPM ({getUnitForMetric('hr')})
                  </label>
                  <input
                    {...register('heart_rate', { 
                      required: watchedValues.hr_enabled ? 'Heart rate is required' : false,
                      pattern: { value: /^\d+$/, message: 'Must be a number' }
                    })}
                    type="number"
                    className="input-field text-sm"
                    placeholder="70"
                  />
                  {errors.heart_rate && (
                    <p className="mt-1 text-xs text-red-600">{errors.heart_rate.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Temperature */}
            {watchedValues.temp_enabled && (
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                <div className="flex items-center mb-3">
                  <span className="text-lg mr-2">🌡️</span>
                  <h5 className="font-medium text-orange-800">Temperature</h5>
                </div>
                <div>
                  <label className="block text-xs font-medium text-orange-700 mb-1">
                    Temperature ({getUnitForMetric('temp')})
                  </label>
                  <input
                    {...register('temperature', { 
                      required: watchedValues.temp_enabled ? 'Temperature is required' : false,
                      pattern: { value: /^\d+(\.\d+)?$/, message: 'Must be a valid number' }
                    })}
                    type="number"
                    step="0.1"
                    className="input-field text-sm"
                    placeholder="98.6"
                  />
                  {errors.temperature && (
                    <p className="mt-1 text-xs text-red-600">{errors.temperature.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isLoading || enabledMetrics.length === 0}
            className="btn-primary flex-1"
          >
            {isLoading ? 'Adding...' : `Add ${enabledMetrics.length} Metric${enabledMetrics.length !== 1 ? 's' : ''}`}
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

export default MultiMetricForm;