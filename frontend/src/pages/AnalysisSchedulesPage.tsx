import React, { useState, useEffect } from 'react';
import { 
  getSchedules, 
  deleteSchedule, 
  enableSchedule, 
  disableSchedule,
  executeScheduleNow,
  AnalysisSchedule,
  ScheduleListResponse 
} from '../services/analysisSchedules';
import CreateScheduleModal from '../components/CreateScheduleModal';
import EditScheduleModal from '../components/EditScheduleModal';
import ScheduleExecutionHistoryModal from '../components/ScheduleExecutionHistoryModal';

const AnalysisSchedulesPage: React.FC = () => {
  const [scheduleData, setScheduleData] = useState<ScheduleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<AnalysisSchedule | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExecutionHistory, setShowExecutionHistory] = useState(false);
  const [executingSchedules, setExecutingSchedules] = useState<Set<string>>(new Set());

  const loadSchedules = async () => {
    try {
      setLoading(true);
      const data = await getSchedules();
      setScheduleData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load schedules');
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCreateSchedule = () => {
    setShowCreateModal(true);
  };

  const handleEditSchedule = (schedule: AnalysisSchedule) => {
    setSelectedSchedule(schedule);
    setShowEditModal(true);
  };

  const handleViewExecutions = (schedule: AnalysisSchedule) => {
    setSelectedSchedule(schedule);
    setShowExecutionHistory(true);
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await deleteSchedule(scheduleId);
      await loadSchedules();
    } catch (err) {
      setError('Failed to delete schedule');
      console.error('Error deleting schedule:', err);
    }
  };

  const handleToggleSchedule = async (schedule: AnalysisSchedule) => {
    try {
      if (schedule.enabled) {
        await disableSchedule(schedule.id);
      } else {
        await enableSchedule(schedule.id);
      }
      await loadSchedules();
    } catch (err) {
      setError('Failed to toggle schedule');
      console.error('Error toggling schedule:', err);
    }
  };

  const handleExecuteNow = async (scheduleId: string) => {
    if (!confirm('Execute this schedule now?')) return;
    
    try {
      setExecutingSchedules(prev => new Set(prev).add(scheduleId));
      await executeScheduleNow(scheduleId);
      await loadSchedules();
    } catch (err) {
      setError('Failed to execute schedule');
      console.error('Error executing schedule:', err);
    } finally {
      setExecutingSchedules(prev => {
        const newSet = new Set(prev);
        newSet.delete(scheduleId);
        return newSet;
      });
    }
  };

  const formatNextRun = (nextRunAt: string | null) => {
    if (!nextRunAt) return 'Not scheduled';
    const date = new Date(nextRunAt);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return 'Overdue';
    if (diffDays > 0) return `In ${diffDays} days`;
    if (diffHours > 0) return `In ${diffHours} hours`;
    return `In ${diffMinutes} minutes`;
  };

  const getStatusColor = (schedule: AnalysisSchedule) => {
    if (!schedule.enabled) return 'text-gray-500';
    if (!schedule.next_run_at) return 'text-yellow-600';
    const nextRun = new Date(schedule.next_run_at);
    const now = new Date();
    if (nextRun < now) return 'text-red-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analysis Schedules</h1>
          <p className="text-gray-600 mt-1">Automate your health analysis with scheduled reports</p>
        </div>
        <button
          onClick={handleCreateSchedule}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
        >
          Create Schedule
        </button>
      </div>

      {/* Statistics */}
      {scheduleData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Schedules</h3>
            <p className="text-3xl font-bold text-blue-600">{scheduleData.total_count}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Active Schedules</h3>
            <p className="text-3xl font-bold text-green-600">{scheduleData.active_count}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Next Executions</h3>
            <p className="text-3xl font-bold text-orange-600">{scheduleData.next_executions.length}</p>
          </div>
        </div>
      )}

      {/* Upcoming Executions */}
      {scheduleData && scheduleData.next_executions.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Executions</h2>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {scheduleData.next_executions.slice(0, 5).map((execution) => (
                <div key={execution.schedule_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{execution.schedule_name}</h4>
                    <p className="text-sm text-gray-600">
                      Analysis: {execution.analysis_types.join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatNextRun(execution.next_run_at)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(execution.next_run_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Schedules List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Your Schedules</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {scheduleData?.schedules.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No schedules found. Create your first schedule to get started!</p>
            </div>
          ) : (
            scheduleData?.schedules.map((schedule) => (
              <div key={schedule.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">{schedule.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        schedule.enabled 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.enabled ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {schedule.schedule_type}
                      </span>
                    </div>
                    {schedule.description && (
                      <p className="text-gray-600 mt-1">{schedule.description}</p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                      <span>Analysis: {schedule.analysis_types.join(', ')}</span>
                      {schedule.frequency && (
                        <span>Frequency: {schedule.frequency}</span>
                      )}
                      <span className={getStatusColor(schedule)}>
                        Next run: {formatNextRun(schedule.next_run_at || null)}
                      </span>
                      <span>Executions: {schedule.run_count}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleExecuteNow(schedule.id)}
                      disabled={executingSchedules.has(schedule.id)}
                      className="px-3 py-1 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded disabled:opacity-50"
                    >
                      {executingSchedules.has(schedule.id) ? 'Running...' : 'Run Now'}
                    </button>
                    <button
                      onClick={() => handleViewExecutions(schedule)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                    >
                      History
                    </button>
                    <button
                      onClick={() => handleEditSchedule(schedule)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleSchedule(schedule)}
                      className={`px-3 py-1 text-sm rounded ${
                        schedule.enabled
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {schedule.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateScheduleModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadSchedules();
          }}
        />
      )}

      {showEditModal && selectedSchedule && (
        <EditScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedSchedule(null);
            loadSchedules();
          }}
        />
      )}

      {showExecutionHistory && selectedSchedule && (
        <ScheduleExecutionHistoryModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowExecutionHistory(false);
            setSelectedSchedule(null);
          }}
        />
      )}
    </div>
  );
};

export default AnalysisSchedulesPage;