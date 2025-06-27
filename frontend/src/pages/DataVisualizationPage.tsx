import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleHealthChart from '../components/SimpleHealthChart';
// import { useHealthData } from '../hooks/useHealthData';

const metricTypes = ['blood_pressure', 'blood_sugar', 'weight']; // placeholder

const DataVisualizationPage: React.FC = () => {
  const navigate = useNavigate();
  // const { data: healthData, loading, error, refetch } = useHealthData();
  const [selectedMetric, setSelectedMetric] = useState<string>(metricTypes[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showAverages, setShowAverages] = useState(true);
  const [showTrends, setShowTrends] = useState(true);

  useEffect(() => {
    // if (metricTypes.length > 0 && !selectedMetric) {
    //   setSelectedMetric(metricTypes[0]);
    // }
  }, []);

  // Comment out loading and error for now
  // if (loading) { ... }
  // if (error) { ... }

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
                {metricTypes.map((metric) => (
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
                <p>Total readings: 0</p>
                <p>Metric types: {metricTypes.length}</p>
                <p>Date range: {selectedTimeRange}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Chart */}
        <SimpleHealthChart
          data={[]}
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
              <div className="text-2xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Readings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Average</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">N/A</div>
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
              {metricTypes.map((metric) => (
                <div key={metric} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {metric.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `0%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900">0</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {/* Placeholder for recent activity */}
              <div className="text-gray-500">No recent activity.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualizationPage; 