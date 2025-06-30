import React, { useState, useEffect } from 'react';
import { analysisComparisonService, ComparisonRequest, ComparisonResult } from '../services/analysisComparison';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIAnalysisResponse } from '../types/aiAnalysis';
import { useTimezone } from '../contexts/TimezoneContext';
import ProviderPerformanceDashboard from './ProviderPerformanceDashboard';
import AnalysisTrendVisualization from './AnalysisTrendVisualization';
import AnalysisImprovementSuggestions from './AnalysisImprovementSuggestions';

interface AnalysisComparisonInterfaceProps {
  preSelectedAnalyses?: number[];
}

const AnalysisComparisonInterface: React.FC<AnalysisComparisonInterfaceProps> = ({ preSelectedAnalyses = [] }) => {
  const [activeTab, setActiveTab] = useState('comparison');
  const [analyses, setAnalyses] = useState<AIAnalysisResponse[]>([]);
  const [selectedAnalyses, setSelectedAnalyses] = useState<number[]>(preSelectedAnalyses);
  const [comparisonType, setComparisonType] = useState<'side_by_side' | 'temporal_trend' | 'provider_performance'>('side_by_side');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveComparison, setSaveComparison] = useState(false);
  const [comparisonName, setComparisonName] = useState('');
  const { formatDateTime } = useTimezone();

  const tabs = [
    { id: 'comparison', label: 'Analysis Comparison', icon: '🔍' },
    { id: 'performance', label: 'Provider Performance', icon: '⚡' },
    { id: 'trends', label: 'Trend Analysis', icon: '📈' },
    { id: 'suggestions', label: 'Improvement Suggestions', icon: '💡' }
  ];

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const analysisData = await aiAnalysisService.getAnalysisHistory();
      setAnalyses(analysisData.filter((a: AIAnalysisResponse) => a.status === 'completed'));
    } catch (err) {
      setError('Failed to load analyses');
      console.error('Error loading analyses:', err);
    }
  };

  const handleAnalysisToggle = (analysisId: number) => {
    setSelectedAnalyses(prev => 
      prev.includes(analysisId) 
        ? prev.filter(id => id !== analysisId)
        : [...prev, analysisId]
    );
  };

  const handleCompare = async () => {
    if (selectedAnalyses.length < 2) {
      setError('Please select at least 2 analyses to compare');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const request: ComparisonRequest = {
        analysis_ids: selectedAnalyses,
        comparison_type: comparisonType,
        include_statistical_analysis: true,
        save_comparison: saveComparison,
        comparison_name: saveComparison ? comparisonName : undefined
      };

      const result = await analysisComparisonService.compareAnalyses(request);
      setComparisonResult(result);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to perform comparison');
      console.error('Comparison error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'comparison':
        return renderComparisonContent();
      case 'performance':
        return <ProviderPerformanceDashboard />;
      case 'trends':
        return <AnalysisTrendVisualization />;
      case 'suggestions':
        return <AnalysisImprovementSuggestions />;
      default:
        return renderComparisonContent();
    }
  };

  const renderComparisonContent = () => (
    <>
      {/* Configuration Panel */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Comparison Configuration</h3>
        
        {/* Comparison Type Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Comparison Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => setComparisonType('side_by_side')}
              className={`p-4 border-2 rounded-lg text-left ${
                comparisonType === 'side_by_side'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Side-by-Side</div>
              <div className="text-sm text-gray-600">Direct content and metadata comparison</div>
            </button>
            <button
              onClick={() => setComparisonType('temporal_trend')}
              className={`p-4 border-2 rounded-lg text-left ${
                comparisonType === 'temporal_trend'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Temporal Trend</div>
              <div className="text-sm text-gray-600">Changes and patterns over time</div>
            </button>
            <button
              onClick={() => setComparisonType('provider_performance')}
              className={`p-4 border-2 rounded-lg text-left ${
                comparisonType === 'provider_performance'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">Provider Performance</div>
              <div className="text-sm text-gray-600">AI provider effectiveness comparison</div>
            </button>
          </div>
        </div>

        {/* Analysis Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Analyses to Compare ({selectedAnalyses.length} selected)
          </label>
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
            {analyses.length === 0 ? (
              <div className="p-4 text-gray-500 text-center">
                No completed analyses available for comparison
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {analyses.map((analysis) => (
                  <div key={analysis.id} className="p-4 hover:bg-gray-50">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedAnalyses.includes(analysis.id)}
                        onChange={() => handleAnalysisToggle(analysis.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium text-gray-900">
                              {analysis.analysis_type} Analysis
                            </span>
                            <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                              {analysis.provider}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDateTime(analysis.created_at, 'datetime')}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-1 truncate">
                          {analysis.response_content?.substring(0, 100)}...
                        </div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Comparison Option */}
        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={saveComparison}
              onChange={(e) => setSaveComparison(e.target.checked)}
            />
            <span className="text-sm font-medium text-gray-700">Save this comparison</span>
          </label>
          {saveComparison && (
            <div className="mt-2">
              <input
                type="text"
                value={comparisonName}
                onChange={(e) => setComparisonName(e.target.value)}
                placeholder="Enter comparison name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* Compare Button */}
        <button
          onClick={handleCompare}
          disabled={loading || selectedAnalyses.length < 2}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Comparing...' : 'Compare Analyses'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Comparison Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {comparisonResult.summary.total_analyses}
                </div>
                <div className="text-sm text-gray-600">Analyses Compared</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {comparisonResult.similarities.length}
                </div>
                <div className="text-sm text-gray-600">Similarities Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {comparisonResult.differences.length}
                </div>
                <div className="text-sm text-gray-600">Differences Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round((comparisonResult.confidence_score || 0) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Confidence Score</div>
              </div>
            </div>
          </div>

          {/* Key Differences */}
          {comparisonResult.differences.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Key Differences</h3>
              <div className="space-y-3">
                {comparisonResult.differences.map((diff, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(diff.severity)}`}>
                      {diff.severity}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">
                        {diff.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-600">{diff.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Similarities */}
          {comparisonResult.similarities.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Similarities</h3>
              <div className="space-y-3">
                {comparisonResult.similarities.map((sim, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStrengthColor(sim.strength)}`}>
                      {sim.strength}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">
                        {sim.type.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-600">{sim.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Statistical Analysis */}
          {comparisonResult.statistical_analysis && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Statistical Analysis</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {Object.entries(comparisonResult.statistical_analysis).map(([key, stats]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <h4 className="font-medium text-gray-900 capitalize">{key.replace(/_/g, ' ')}</h4>
                    {typeof stats === 'object' && stats !== null && (
                      <div className="space-y-1">
                        {Object.entries(stats).map(([statKey, statValue]: [string, any]) => (
                          <div key={statKey} className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{statKey.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">
                              {typeof statValue === 'number' ? statValue.toFixed(2) : statValue}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {comparisonResult.recommendations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
              <div className="space-y-3">
                {comparisonResult.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-sm text-gray-700">{recommendation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Analysis Comparison Hub</h2>
        <p className="text-gray-600 mt-1">
          Compare analyses, monitor performance, track trends, and get improvement suggestions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2 text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AnalysisComparisonInterface;