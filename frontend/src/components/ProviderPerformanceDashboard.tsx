import React, { useState, useEffect } from 'react';
import { analysisComparisonService, ProviderPerformanceMetrics, ProviderPerformanceRequest } from '../services/analysisComparison';
import { useTimezone } from '../contexts/TimezoneContext';

interface ProviderPerformanceDashboardProps {
  providerId?: string;
  periodType?: 'daily' | 'weekly' | 'monthly';
  onProviderSelect?: (providerId: string) => void;
}

const ProviderPerformanceDashboard: React.FC<ProviderPerformanceDashboardProps> = ({
  providerId,
  periodType = 'monthly',
  onProviderSelect
}) => {
  const [metrics, setMetrics] = useState<ProviderPerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(periodType);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    loadMetrics();
  }, [providerId, selectedPeriod]);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const metricsData = await analysisComparisonService.getProviderMetrics(
        providerId,
        selectedPeriod,
        12
      );
      setMetrics(metricsData);

      // If we have metrics for multiple providers, get comparison
      if (!providerId && metricsData.length > 0) {
        await loadProviderComparison();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load provider metrics');
      console.error('Error loading provider metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProviderComparison = async () => {
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago

      const request: ProviderPerformanceRequest = {
        period_start: startDate,
        period_end: endDate,
        include_recommendations: true,
        metrics: ['success_rate', 'avg_processing_time', 'efficiency_score']
      };

      const comparison = await analysisComparisonService.analyzeProviderPerformance(request);
      setComparisonData(comparison);
    } catch (err) {
      console.error('Error loading provider comparison:', err);
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'success_rate': return '✅';
      case 'avg_processing_time': return '⏱️';
      case 'total_cost': return '💰';
      case 'efficiency_score': return '🎯';
      case 'reliability_score': return '🔒';
      default: return '📊';
    }
  };

  const getMetricColor = (value: number, metric: string) => {
    if (metric === 'success_rate' || metric === 'efficiency_score' || metric === 'reliability_score') {
      if (value >= 0.9) return 'text-green-600';
      if (value >= 0.7) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'avg_processing_time') {
      if (value <= 5) return 'text-green-600';
      if (value <= 15) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  const formatMetricValue = (value: number | undefined, metric: string) => {
    if (value === undefined || value === null) return 'N/A';
    
    switch (metric) {
      case 'success_rate':
      case 'efficiency_score':
      case 'reliability_score':
        return `${(value * 100).toFixed(1)}%`;
      case 'avg_processing_time':
        return `${value.toFixed(1)}s`;
      case 'total_cost':
      case 'avg_cost_per_analysis':
        return `$${value.toFixed(4)}`;
      case 'avg_response_length':
        return `${Math.round(value)} chars`;
      case 'avg_token_usage':
        return `${Math.round(value)} tokens`;
      default:
        return typeof value === 'number' ? value.toFixed(2) : value;
    }
  };

  // Group metrics by provider for comparison view
  const groupedMetrics = metrics.reduce((acc, metric) => {
    if (!acc[metric.provider_id]) {
      acc[metric.provider_id] = [];
    }
    acc[metric.provider_id].push(metric);
    return acc;
  }, {} as Record<string, ProviderPerformanceMetrics[]>);

  const providerNames = Object.keys(groupedMetrics);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading provider performance metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Provider Performance Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Monitor and compare AI provider effectiveness over time
          </p>
        </div>
        
        <div className="flex space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          
          {!providerId && providerNames.length > 1 && (
            <button
              onClick={loadProviderComparison}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Compare All
            </button>
          )}
        </div>
      </div>

      {/* Provider Comparison Summary */}
      {comparisonData && !providerId && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Provider Comparison Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {comparisonData.providers?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Active Providers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {comparisonData.rankings?.success_rate?.[0] || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Best Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {comparisonData.rankings?.efficiency_score?.[0] || 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Most Efficient</div>
            </div>
          </div>
          
          {comparisonData.recommendations && Object.keys(comparisonData.recommendations).length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Recommendations</h4>
              <div className="space-y-2">
                {Object.entries(comparisonData.recommendations).map(([provider, recommendation]: [string, any]) => (
                  <div key={provider} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{provider}:</span>
                      <span className="text-gray-700 ml-2">{recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Provider Performance Cards */}
      {metrics.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No performance metrics available for the selected period.
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Metrics are generated automatically after analyses are completed.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {providerNames.map((providerName) => {
            const providerMetrics = groupedMetrics[providerName];
            const latestMetric = providerMetrics[0]; // Assuming sorted by date desc
            
            return (
              <div key={providerName} className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{providerName}</h3>
                  <div className="text-sm text-gray-500">
                    {latestMetric && formatDateTime(latestMetric.calculated_at, 'date')}
                  </div>
                </div>
                
                {latestMetric && (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                      { key: 'success_rate', label: 'Success Rate', value: latestMetric.success_rate },
                      { key: 'avg_processing_time', label: 'Avg Time', value: latestMetric.avg_processing_time },
                      { key: 'total_cost', label: 'Total Cost', value: latestMetric.total_cost },
                      { key: 'efficiency_score', label: 'Efficiency', value: latestMetric.efficiency_score },
                      { key: 'reliability_score', label: 'Reliability', value: latestMetric.reliability_score },
                      { key: 'total_analyses', label: 'Analyses', value: latestMetric.total_analyses }
                    ].map(({ key, label, value }) => (
                      <div key={key} className="text-center">
                        <div className="text-lg mb-1">{getMetricIcon(key)}</div>
                        <div className={`text-lg font-semibold ${getMetricColor(value || 0, key)}`}>
                          {formatMetricValue(value, key)}
                        </div>
                        <div className="text-xs text-gray-600">{label}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Historical Data Preview */}
                {providerMetrics.length > 1 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">
                      {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Trend 
                      ({providerMetrics.length} periods)
                    </div>
                    <div className="flex space-x-2 text-xs">
                      {providerMetrics.slice(0, 6).reverse().map((metric, index) => (
                        <div key={index} className="flex-1 text-center">
                          <div className="bg-gray-100 rounded px-2 py-1">
                            {formatMetricValue(metric.success_rate, 'success_rate')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="mt-4 flex space-x-2">
                  {onProviderSelect && (
                    <button
                      onClick={() => onProviderSelect(providerName)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProviderPerformanceDashboard;