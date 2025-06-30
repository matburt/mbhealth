import React, { useState, useEffect } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { analysisComparisonService, AnalysisTrend, TrendAnalysisRequest } from '../services/analysisComparison';
import { useTimezone } from '../contexts/TimezoneContext';

interface AnalysisTrendVisualizationProps {
  trendType?: string;
  analysisType?: string;
  autoLoad?: boolean;
}

const AnalysisTrendVisualization: React.FC<AnalysisTrendVisualizationProps> = ({
  trendType,
  analysisType,
  autoLoad = true
}) => {
  const [trends, setTrends] = useState<AnalysisTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendType, setSelectedTrendType] = useState(trendType || 'performance');
  const [selectedAnalysisType, setSelectedAnalysisType] = useState(analysisType || '');
  const [significantOnly, setSignificantOnly] = useState(false);
  const [customAnalysis, setCustomAnalysis] = useState<any>(null);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    if (autoLoad) {
      loadTrends();
    }
  }, [selectedTrendType, selectedAnalysisType, significantOnly, autoLoad]);

  const loadTrends = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const trendsData = await analysisComparisonService.getAnalysisTrends(
        selectedTrendType || undefined,
        selectedAnalysisType || undefined,
        significantOnly,
        20
      );
      setTrends(trendsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load analysis trends');
      console.error('Error loading trends:', err);
    } finally {
      setLoading(false);
    }
  };

  const performCustomTrendAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(); // 90 days ago

      const request: TrendAnalysisRequest = {
        analysis_type: selectedAnalysisType || undefined,
        metric_focus: selectedTrendType,
        period_start: startDate,
        period_end: endDate,
        min_data_points: 3,
        include_projections: true,
        statistical_tests: ['correlation', 'trend_significance']
      };

      const analysisResult = await analysisComparisonService.analyzeTrends(request);
      setCustomAnalysis(analysisResult);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to perform trend analysis');
      console.error('Error performing trend analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendDirectionIcon = (direction?: string) => {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  const getTrendStrengthColor = (strength?: number) => {
    if (!strength) return 'text-gray-500';
    if (strength >= 0.7) return 'text-green-600';
    if (strength >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-200';
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatTrendData = (trends: AnalysisTrend[]) => {
    return trends.map(trend => ({
      name: trend.metric_focus || trend.trend_type,
      strength: trend.trend_strength ? (trend.trend_strength * 100) : 0,
      confidence: trend.confidence_level ? (trend.confidence_level * 100) : 0,
      dataPoints: trend.data_points_count,
      isSignificant: trend.is_significant,
      direction: trend.trend_direction,
      period: `${new Date(trend.period_start).toLocaleDateString()} - ${new Date(trend.period_end).toLocaleDateString()}`
    }));
  };

  const chartData = formatTrendData(trends);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading trend analysis...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analysis Trend Visualization</h2>
          <p className="text-gray-600 mt-1">
            Track patterns and improvements in your AI analyses over time
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCustomForm(!showCustomForm)}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Custom Analysis
          </button>
          <button
            onClick={loadTrends}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trend Type
            </label>
            <select
              value={selectedTrendType}
              onChange={(e) => setSelectedTrendType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="performance">Performance</option>
              <option value="quality">Quality</option>
              <option value="cost">Cost</option>
              <option value="usage">Usage</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Analysis Type
            </label>
            <select
              value={selectedAnalysisType}
              onChange={(e) => setSelectedAnalysisType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Analysis Types</option>
              <option value="general">General</option>
              <option value="symptom">Symptom</option>
              <option value="medication">Medication</option>
              <option value="lifestyle">Lifestyle</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={significantOnly}
                onChange={(e) => setSignificantOnly(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">Significant trends only</span>
            </label>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={loadTrends}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 w-full"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Custom Analysis Form */}
      {showCustomForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Trend Analysis</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={performCustomTrendAnalysis}
              disabled={loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : 'Analyze Last 90 Days'}
            </button>
            <div className="text-sm text-gray-600">
              Performs comprehensive statistical analysis with projections
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Custom Analysis Results */}
      {customAnalysis && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Analysis Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {getTrendDirectionIcon(customAnalysis.trend_direction)} {customAnalysis.trend_direction}
              </div>
              <div className="text-sm text-gray-600">Trend Direction</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${getTrendStrengthColor(customAnalysis.trend_strength)}`}>
                {customAnalysis.trend_strength ? (customAnalysis.trend_strength * 100).toFixed(1) + '%' : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Trend Strength</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {customAnalysis.analysis_ids?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Data Points</div>
            </div>
          </div>
          
          {customAnalysis.key_insights && customAnalysis.key_insights.length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-900 mb-3">Key Insights</h4>
              <div className="space-y-2">
                {customAnalysis.key_insights.map((insight: string, index: number) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-sm text-gray-700">{insight}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {customAnalysis.projections && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Projections</h4>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700">
                  Confidence: {customAnalysis.projections.confidence ? 
                    (customAnalysis.projections.confidence * 100).toFixed(1) + '%' : 'N/A'}
                </div>
                {customAnalysis.projections.recommendations && (
                  <div className="mt-2 space-y-1">
                    {customAnalysis.projections.recommendations.map((rec: string, index: number) => (
                      <div key={index} className="text-sm text-gray-600">• {rec}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trends List and Visualization */}
      {trends.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500">
            No trend data available for the selected criteria.
          </div>
          <div className="text-sm text-gray-400 mt-2">
            Trends are calculated automatically as you use the AI analysis features.
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart Visualization */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Trend Strength & Confidence</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    `${Number(value).toFixed(1)}%`, 
                    name === 'strength' ? 'Trend Strength' : 'Confidence Level'
                  ]}
                />
                <Legend />
                <Bar dataKey="strength" fill="#3B82F6" name="Strength" />
                <Bar dataKey="confidence" fill="#10B981" name="Confidence" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Trends List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Trend Analysis Results</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {trends.map((trend) => (
                <div key={trend.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getTrendDirectionIcon(trend.trend_direction)}</span>
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">
                            {trend.metric_focus || trend.trend_type} Trend
                          </h4>
                          <p className="text-sm text-gray-600">
                            {formatDateTime(trend.period_start, 'date')} - {formatDateTime(trend.period_end, 'date')}
                          </p>
                        </div>
                        {trend.is_significant && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            Significant
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-600">Direction</div>
                          <div className="font-medium capitalize">{trend.trend_direction || 'Unknown'}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Strength</div>
                          <div className={`font-medium ${getTrendStrengthColor(trend.trend_strength)}`}>
                            {trend.trend_strength ? (trend.trend_strength * 100).toFixed(1) + '%' : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Confidence</div>
                          <div className="flex items-center space-x-2">
                            <div 
                              className={`w-3 h-3 rounded-full ${getConfidenceColor(trend.confidence_level)}`}
                            ></div>
                            <span className="font-medium">
                              {trend.confidence_level ? (trend.confidence_level * 100).toFixed(1) + '%' : 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600">Data Points</div>
                          <div className="font-medium">{trend.data_points_count}</div>
                        </div>
                      </div>
                      
                      {trend.key_insights && trend.key_insights.length > 0 && (
                        <div className="mt-4">
                          <div className="text-sm text-gray-600 mb-2">Key Insights:</div>
                          <div className="space-y-1">
                            {trend.key_insights.slice(0, 2).map((insight, index) => (
                              <div key={index} className="text-sm text-gray-700">• {insight}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisTrendVisualization;