import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SimpleHealthChart from '../components/SimpleHealthChart';
import { healthService } from '../services/health';
import { HealthData } from '../types/health';

const metricTypes = ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'temperature'];

const DataVisualizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>(metricTypes[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showAverages, setShowAverages] = useState(true);
  const [showTrends, setShowTrends] = useState(true);

  // Fetch health data
  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const data = await healthService.getHealthData();
      setHealthData(data);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, []);

  // Filter data based on selected metric and time range
  const filteredData = React.useMemo(() => {
    let filtered = healthData;
    
    // Filter by metric type
    if (selectedMetric) {
      filtered = filtered.filter(item => item.metric_type === selectedMetric);
    }
    
    // Filter by time range
    if (selectedTimeRange !== 'all') {
      const days = selectedTimeRange === '7d' ? 7 : 
                   selectedTimeRange === '30d' ? 30 : 
                   selectedTimeRange === '90d' ? 90 : 365;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(item => new Date(item.recorded_at) >= cutoffDate);
    }
    
    return filtered;
  }, [healthData, selectedMetric, selectedTimeRange]);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const values = filteredData.map(d => d.value).filter(v => v !== undefined);
    if (values.length === 0) return null;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const recent = values.slice(-5);
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    return { 
      avg, 
      min, 
      max, 
      recentAvg, 
      trend: recentAvg > avg ? 'up' : 'down',
      totalReadings: filteredData.length
    };
  }, [filteredData]);

  // Get available metric types from actual data
  const availableMetrics = React.useMemo(() => {
    const metrics = [...new Set(healthData.map(item => item.metric_type))];
    return metrics.length > 0 ? metrics : metricTypes;
  }, [healthData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Visualization</h1>
              <p className="mt-2 text-gray-600">
                Advanced analytics and insights from your health data
              </p>
            </div>
            <button
              onClick={() => navigate('/health-data')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Back to Health Data
            </button>
          </div>
        </div>

        {/* Chart Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric Type
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {availableMetrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {metric.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
                <option value="all">All time</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Options
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showAverages}
                    onChange={(e) => setShowAverages(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Show Averages</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showTrends}
                    onChange={(e) => setShowTrends(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Show Trends</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Summary
              </label>
              <div className="text-sm text-gray-600">
                <p>Total readings: {stats?.totalReadings || 0}</p>
                <p>Metric types: {availableMetrics.length}</p>
                <p>Date range: {selectedTimeRange}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <SimpleHealthChart
          data={filteredData}
          metricType={selectedMetric}
          timeRange={selectedTimeRange}
          showTrends={showTrends}
          showAverages={showAverages}
        />

        {/* Insights Panel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats?.totalReadings || 0}</div>
              <div className="text-sm text-gray-600">Readings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats?.avg?.toFixed(2) || 'N/A'}</div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats?.trend === 'up' ? '↑' : stats?.trend === 'down' ? '↓' : 'N/A'}</div>
              <div className="text-sm text-gray-600">Trend</div>
            </div>
          </div>
        </div>

        {/* Additional Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Metric Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Metric Distribution</h3>
            <div className="space-y-3">
              {availableMetrics.map((metric) => (
                <div key={metric} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {metric.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(healthData.filter(d => d.metric_type === metric).length / healthData.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{healthData.filter(d => d.metric_type === metric).length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {healthData.length > 0 ? (
                healthData
                  .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
                  .slice(0, 5)
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">
                          {entry.metric_type === 'blood_pressure' ? '🩸' :
                           entry.metric_type === 'blood_sugar' ? '🩸' :
                           entry.metric_type === 'weight' ? '⚖️' :
                           entry.metric_type === 'heart_rate' ? '❤️' :
                           entry.metric_type === 'temperature' ? '🌡️' : '📊'}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {entry.metric_type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(entry.recorded_at).toLocaleDateString()} at {new Date(entry.recorded_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.metric_type === 'blood_pressure' && entry.systolic && entry.diastolic
                            ? `${entry.systolic}/${entry.diastolic}`
                            : `${entry.value}`
                          } {entry.unit}
                        </p>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-gray-500">No recent activity.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualizationPage; 