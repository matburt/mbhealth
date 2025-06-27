import React from 'react';
import { HealthDataFilters } from '../types/health';

interface HealthDataFiltersProps {
  filters: HealthDataFilters;
  onFiltersChange: (filters: HealthDataFilters) => void;
}

const HealthDataFiltersComponent: React.FC<HealthDataFiltersProps> = ({ 
  filters, 
  onFiltersChange 
}) => {
  const metricTypes = [
    { value: '', label: 'All Metrics' },
    { value: 'blood_pressure', label: 'Blood Pressure' },
    { value: 'blood_sugar', label: 'Blood Sugar' },
    { value: 'weight', label: 'Weight' },
    { value: 'heart_rate', label: 'Heart Rate' },
    { value: 'temperature', label: 'Temperature' },
  ];

  const handleFilterChange = (key: keyof HealthDataFilters, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined,
    });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-primary-600 hover:text-primary-700"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metric Type
          </label>
          <select
            value={filters.metric_type || ''}
            onChange={(e) => handleFilterChange('metric_type', e.target.value)}
            className="input-field"
          >
            {metricTypes.map((metric) => (
              <option key={metric.value} value={metric.value}>
                {metric.label}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => handleFilterChange('start_date', e.target.value)}
            className="input-field"
          />
        </div>

        {/* End Date Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => handleFilterChange('end_date', e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Quick Date Filters */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Quick Filters
        </label>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Today', days: 0 },
            { label: 'Last 7 days', days: 7 },
            { label: 'Last 30 days', days: 30 },
            { label: 'Last 90 days', days: 90 },
          ].map(({ label, days }) => {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            
            return (
              <button
                key={label}
                onClick={() => {
                  onFiltersChange({
                    ...filters,
                    start_date: startDate.toISOString().split('T')[0],
                    end_date: endDate.toISOString().split('T')[0],
                  });
                }}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HealthDataFiltersComponent; 