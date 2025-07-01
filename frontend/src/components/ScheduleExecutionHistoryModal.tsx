import React, { useState, useEffect } from 'react';
import { 
  getScheduleExecutions, 
  AnalysisSchedule, 
  AnalysisScheduleExecution 
} from '../services/analysisSchedules';
import { aiAnalysisService } from '../services/aiAnalysis';
import { AIAnalysisResponse } from '../types/aiAnalysis';
import { useTimezone } from '../contexts/TimezoneContext';

interface ScheduleExecutionHistoryModalProps {
  schedule: AnalysisSchedule;
  onClose: () => void;
}

const ScheduleExecutionHistoryModal: React.FC<ScheduleExecutionHistoryModalProps> = ({ 
  schedule, 
  onClose 
}) => {
  const [executions, setExecutions] = useState<AnalysisScheduleExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedExecution, setExpandedExecution] = useState<string | null>(null);
  const [executionAnalyses, setExecutionAnalyses] = useState<Record<string, AIAnalysisResponse[]>>({});
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    loadExecutions();
  }, [schedule.id]);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await getScheduleExecutions(schedule.id);
      setExecutions(data);
      setError(null);
    } catch (err) {
      setError('Failed to load execution history');
      console.error('Error loading executions:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExecutionAnalyses = async (execution: AnalysisScheduleExecution) => {
    if (!execution.analyses_created || execution.analyses_created.length === 0) {
      return;
    }

    try {
      const analyses: AIAnalysisResponse[] = [];
      for (const analysisId of execution.analyses_created) {
        const analysis = await aiAnalysisService.getAnalysis(analysisId);
        if (analysis) {
          analyses.push(analysis);
        }
      }
      
      setExecutionAnalyses(prev => ({
        ...prev,
        [execution.id]: analyses
      }));
    } catch (err) {
      console.error('Error loading execution analyses:', err);
    }
  };

  const toggleExecutionExpansion = async (execution: AnalysisScheduleExecution) => {
    if (expandedExecution === execution.id) {
      setExpandedExecution(null);
    } else {
      setExpandedExecution(execution.id);
      if (!executionAnalyses[execution.id]) {
        await loadExecutionAnalyses(execution);
      }
    }
  };

  const openAnalysis = (analysisId: number) => {
    // Navigate to AI Analysis page with this analysis selected
    window.location.href = `/ai-analysis?analysis=${analysisId}`;
  };

  const formatDuration = (startedAt: string, completedAt?: string) => {
    if (!completedAt) return 'Running...';
    
    const start = new Date(startedAt);
    const end = new Date(completedAt);
    const diffMs = end.getTime() - start.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffMinutes > 0) {
      return `${diffMinutes}m ${diffSeconds % 60}s`;
    }
    return `${diffSeconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getExecutionTypeColor = (type: string) => {
    switch (type) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-100';
      case 'manual':
        return 'text-purple-600 bg-purple-100';
      case 'data_triggered':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Execution History</h2>
              <p className="text-gray-600 mt-1">{schedule.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              {executions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No execution history found for this schedule.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-900">Total Executions</h3>
                      <p className="text-2xl font-bold text-blue-600">{executions.length}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-green-900">Successful</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {executions.filter(e => e.status === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-red-900">Failed</h3>
                      <p className="text-2xl font-bold text-red-600">
                        {executions.filter(e => e.status === 'failed').length}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-purple-900">Analyses Created</h3>
                      <p className="text-2xl font-bold text-purple-600">
                        {executions.reduce((sum, e) => sum + e.analyses_count, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Execution List */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Started
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Duration
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Results
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Details
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {executions.map((execution) => (
                            <React.Fragment key={execution.id}>
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDateTime(execution.started_at, 'datetime')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getExecutionTypeColor(execution.execution_type)}`}>
                                    {execution.execution_type.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(execution.status)}`}>
                                    {execution.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDuration(execution.started_at, execution.completed_at)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-600">{execution.success_count} success</span>
                                    {execution.failure_count > 0 && (
                                      <span className="text-red-600">{execution.failure_count} failed</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {execution.error_message ? (
                                    <div className="max-w-xs truncate" title={execution.error_message}>
                                      <span className="text-red-600">{execution.error_message}</span>
                                    </div>
                                  ) : execution.trigger_data ? (
                                    <div className="max-w-xs truncate">
                                      {execution.execution_type === 'data_triggered' && execution.trigger_data.metric_type && (
                                        <span className="text-blue-600">
                                          {execution.trigger_data.metric_type}: {execution.trigger_data.data_count}/{execution.trigger_data.threshold}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {execution.analyses_created && execution.analyses_created.length > 0 && (
                                    <button
                                      onClick={() => toggleExecutionExpansion(execution)}
                                      className="text-blue-600 hover:text-blue-900 mr-3"
                                    >
                                      {expandedExecution === execution.id ? 'Hide Results' : 'View Results'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                              {expandedExecution === execution.id && (
                                <tr>
                                  <td colSpan={7} className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                    <div className="space-y-4">
                                      <h4 className="font-medium text-gray-900">Analysis Results</h4>
                                      {executionAnalyses[execution.id] ? (
                                        <div className="space-y-3">
                                          {executionAnalyses[execution.id].map((analysis, index) => (
                                            <div key={analysis.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                              <div className="flex justify-between items-start mb-2">
                                                <div>
                                                  <h5 className="font-medium text-gray-900">
                                                    Analysis #{index + 1}: {analysis.analysis_type}
                                                  </h5>
                                                  <p className="text-sm text-gray-600">
                                                    {analysis.provider} • {formatDateTime(analysis.created_at, 'datetime')}
                                                  </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                    analysis.status === 'completed' ? 'text-green-600 bg-green-100' :
                                                    analysis.status === 'failed' ? 'text-red-600 bg-red-100' :
                                                    'text-blue-600 bg-blue-100'
                                                  }`}>
                                                    {analysis.status}
                                                  </span>
                                                  <button
                                                    onClick={() => openAnalysis(analysis.id)}
                                                    className="text-blue-600 hover:text-blue-900 text-sm"
                                                  >
                                                    View Full →
                                                  </button>
                                                </div>
                                              </div>
                                              {analysis.response_content && (
                                                <div className="bg-gray-50 rounded p-3 mt-2">
                                                  <p className="text-sm text-gray-700">
                                                    {analysis.response_content.length > 200 
                                                      ? analysis.response_content.substring(0, 200) + '...'
                                                      : analysis.response_content
                                                    }
                                                  </p>
                                                </div>
                                              )}
                                              {analysis.error_message && (
                                                <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                                                  <p className="text-sm text-red-700">{analysis.error_message}</p>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="flex justify-center py-4">
                                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleExecutionHistoryModal;