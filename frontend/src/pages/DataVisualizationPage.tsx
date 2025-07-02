import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import UnifiedHealthChart from '../components/UnifiedHealthChart';
import ChartConfigurationPanel from '../components/ChartConfigurationPanel';
import { useChartConfiguration } from '../hooks/useChartConfiguration';
import CreateAnalysisModal from '../components/CreateAnalysisModal';
import PDFExportModal from '../components/PDFExportModal';
import { healthService } from '../services/health';
import { aiAnalysisService } from '../services/aiAnalysis';
// import { reportsService } from '../services/reports';
import { HealthData } from '../types/health';
import { AIAnalysisCreate } from '../types/aiAnalysis';

const metricTypes = ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate', 'temperature'];

const DataVisualizationPage: React.FC = () => {
  const navigate = useNavigate();
  const [healthData, setHealthData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>(metricTypes[0]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d');
  const [showAverages, setShowAverages] = useState(true);
  const [showTrends, setShowTrends] = useState(true);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [generatingQuickAnalysis, setGeneratingQuickAnalysis] = useState(false);
  const [showChartConfig, setShowChartConfig] = useState(false);
  const [showPDFExportModal, setShowPDFExportModal] = useState(false);
  
  // Chart configuration
  const {
    configuration: chartConfig,
    updateConfiguration: updateChartConfig,
    loadPreset: loadChartPreset
  } = useChartConfiguration('data-visualization');

  // Fetch health data
  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const data = await healthService.getHealthData();
      setHealthData(data);
    } catch (error: unknown) {
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

  // Generate quick analysis with current filters
  const generateQuickAnalysis = async () => {
    if (filteredData.length === 0) {
      toast.error('No data available for analysis with current filters');
      return;
    }

    setGeneratingQuickAnalysis(true);
    try {
      // Get providers to use the first available one
      const providers = await aiAnalysisService.getProviders(true);
      if (providers.length === 0) {
        toast.error('No AI providers configured. Please configure an AI provider first.');
        navigate('/ai-providers');
        return;
      }

      // Create analysis request
      const analysisData: AIAnalysisCreate = {
        health_data_ids: filteredData.map(d => d.id),
        analysis_type: 'insights',
        provider: providers[0].id,
        additional_context: `Quick analysis of ${selectedMetric.replace('_', ' ')} data from ${selectedTimeRange}. Focus on trends, patterns, and actionable insights.`
      };

      await aiAnalysisService.createAnalysis(analysisData);
      toast.success(`Analysis created for ${filteredData.length} ${selectedMetric.replace('_', ' ')} readings`);
      navigate('/ai-analysis');
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to create analysis');
    } finally {
      setGeneratingQuickAnalysis(false);
    }
  };

  const handleAnalysisCreated = () => {
    toast.success('Analysis created successfully');
    navigate('/ai-analysis');
  };

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
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPDFExportModal(true)}
                disabled={filteredData.length === 0}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Export PDF
              </button>
              <button
                onClick={() => setShowAnalysisModal(true)}
                disabled={filteredData.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Custom Analysis
              </button>
              <button
                onClick={generateQuickAnalysis}
                disabled={filteredData.length === 0 || generatingQuickAnalysis}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {generatingQuickAnalysis ? 'Creating...' : 'Quick Analysis'}
              </button>
              <button
                onClick={() => navigate('/health-data')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Back to Health Data
              </button>
            </div>
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
              <div className="text-sm text-gray-600 space-y-1">
                <p>Filtered readings: {filteredData.length}</p>
                <p>Current metric: {selectedMetric.replace('_', ' ')}</p>
                <p>Time range: {selectedTimeRange}</p>
                {filteredData.length > 0 && (
                  <button
                    onClick={() => setShowAnalysisModal(true)}
                    className="text-green-600 hover:text-green-700 text-xs font-medium"
                  >
                    → Analyze this data
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Chart Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Chart Configuration</h3>
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
        </div>

        {/* Chart */}
        <UnifiedHealthChart
          data={filteredData}
          metricType={selectedMetric}
          timeRange={selectedTimeRange}
          configuration={{
            ...chartConfig,
            showAverages,
            showTrends
          }}
          title={`${selectedMetric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Visualization`}
          subtitle={`Advanced analytics and insights • ${filteredData.length} data points`}
          onCreateAnalysis={(_selectedData) => {
            setShowAnalysisModal(true);
          }}
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

      {/* Analysis Modal */}
      <CreateAnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        onAnalysisCreated={handleAnalysisCreated}
        preSelectedData={filteredData}
        analysisContext={`Analysis of ${selectedMetric.replace('_', ' ')} data from ${selectedTimeRange}${filteredData.length > 0 ? ` (${filteredData.length} readings)` : ''}`}
      />

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={showPDFExportModal}
        onClose={() => setShowPDFExportModal(false)}
        preSelectedMetrics={[selectedMetric]}
        preSelectedDateRange={{
          start: (() => {
            const days = selectedTimeRange === '7d' ? 7 : 
                         selectedTimeRange === '30d' ? 30 : 
                         selectedTimeRange === '90d' ? 90 : 
                         selectedTimeRange === '1y' ? 365 : 30;
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            return startDate;
          })(),
          end: new Date()
        }}
      />
    </div>
  );
};

export default DataVisualizationPage; 