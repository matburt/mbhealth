import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { healthService } from '../services/health';
import { HealthData, HealthDataFilters } from '../types/health';
import HealthDataTable from '../components/HealthDataTable';
import HealthDataFiltersComponent from '../components/HealthDataFilters';
import UnifiedHealthChart from '../components/UnifiedHealthChart';
import ChartConfigurationPanel from '../components/ChartConfigurationPanel';
import { useChartConfiguration } from '../hooks/useChartConfiguration';
import QuickAddForm from '../components/QuickAddForm';

const HealthDataPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<HealthDataFilters>({});
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showChartConfig, setShowChartConfig] = useState(false);
  
  // Chart configuration
  const {
    configuration: chartConfig,
    updateConfiguration: updateChartConfig,
    loadPreset: loadChartPreset
  } = useChartConfiguration('health-data');

  // Initialize filters from URL params
  useEffect(() => {
    const metricType = searchParams.get('metric_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    
    if (metricType || startDate || endDate) {
      setFilters({
        metric_type: metricType || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
    }
  }, [searchParams]);

  // Fetch data when filters change
  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const healthData = await healthService.getHealthData(filters);
      setData(healthData);
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: HealthDataFilters) => {
    setFilters(newFilters);
    
    // Update URL params
    const params = new URLSearchParams();
    if (newFilters.metric_type) params.set('metric_type', newFilters.metric_type);
    if (newFilters.start_date) params.set('start_date', newFilters.start_date);
    if (newFilters.end_date) params.set('end_date', newFilters.end_date);
    setSearchParams(params);
  };

  const handleDataChange = () => {
    fetchData();
  };

  const getCurrentMetricType = () => {
    return filters.metric_type || (data.length > 0 ? data[0].metric_type : '');
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      await healthService.exportHealthDataCSV();
      toast.success('Health data exported successfully');
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to export health data');
    } finally {
      setExporting(false);
    }
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const result = await healthService.importHealthDataCSV(file);
      toast.success(result.message);
      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
        toast.error(`${result.errors.length} rows had errors. Check console for details.`);
      }
      // Refresh data after import
      fetchData();
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to import health data');
    } finally {
      setImporting(false);
      // Reset file input
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Health Data</h1>
          <p className="text-gray-600 mt-2">
            Track and visualize your health metrics over time
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* CSV Import/Export */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              disabled={exporting || data.length === 0}
              className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <label className="bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors text-sm font-medium cursor-pointer">
              {importing ? 'Importing...' : 'Import CSV'}
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                disabled={importing}
                className="hidden"
              />
            </label>
          </div>
          
          <Link
            to="/data-visualization"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Advanced Analytics
          </Link>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Chart
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="max-w-md">
        <QuickAddForm />
      </div>

      {/* Filters */}
      <HealthDataFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* Data Display */}
      {loading ? (
        <div className="card">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Results Summary */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {data.length} {data.length === 1 ? 'entry' : 'entries'} found
            </p>
            {data.length > 0 && (
              <div className="text-sm text-gray-600">
                {filters.metric_type && (
                  <span className="capitalize">
                    Showing: {filters.metric_type.replace('_', ' ')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Chart View */}
          {viewMode === 'chart' && data.length > 0 && (
            <div className="space-y-4">
              {/* Chart Configuration Panel */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-900">Chart View</h2>
                <button
                  onClick={() => setShowChartConfig(!showChartConfig)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showChartConfig ? 'Hide' : 'Show'} Chart Options
                </button>
              </div>
              
              {showChartConfig && (
                <ChartConfigurationPanel
                  configuration={chartConfig}
                  onConfigurationChange={updateChartConfig}
                  onLoadPreset={loadChartPreset}
                  compact={true}
                />
              )}
              
              {/* Unified Chart */}
              <UnifiedHealthChart
                data={data}
                metricType={getCurrentMetricType()}
                configuration={chartConfig}
                title={`${getCurrentMetricType() ? getCurrentMetricType().replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) + ' ' : ''}Health Data Chart`}
                subtitle={`Clinical view with target ranges and trend analysis`}
              />
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="card">
              <HealthDataTable
                data={data}
                onDataChange={handleDataChange}
              />
            </div>
          )}

          {/* Empty State */}
          {data.length === 0 && !loading && (
            <div className="card text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No health data found
              </h3>
              <p className="text-gray-600 mb-4">
                {Object.keys(filters).length > 0
                  ? 'Try adjusting your filters or add new data'
                  : 'Start tracking your health by adding your first entry'}
              </p>
              {Object.keys(filters).length > 0 && (
                <button
                  onClick={() => handleFiltersChange({})}
                  className="btn-secondary"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HealthDataPage; 