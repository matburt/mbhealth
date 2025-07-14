import React, { useState, useEffect } from 'react';
import { notificationService, NotificationHistory, NotificationEventType, NotificationStatus } from '../services/notifications';
import { useTimezone } from '../contexts/TimezoneContext';

interface NotificationHistoryModalProps {
  onClose: () => void;
}

const NotificationHistoryModal: React.FC<NotificationHistoryModalProps> = ({ onClose }) => {
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<NotificationEventType | ''>('');
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | ''>('');
  const [limit, setLimit] = useState(50);
  const { formatDateTime } = useTimezone();

  useEffect(() => {
    loadHistory();
  }, [eventTypeFilter, statusFilter, limit]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await notificationService.getHistory(
        limit,
        eventTypeFilter || undefined,
        statusFilter || undefined
      );
      setHistory(data);
    } catch (err: unknown) {
      setError(err.response?.data?.detail || 'Failed to load notification history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Notification History</h2>
              <p className="text-gray-600 mt-1">
                View your recent notification activity
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <span className="sr-only">Close</span>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value as NotificationEventType | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Events</option>
                <option value="analysis_completed">Analysis Completed</option>
                <option value="analysis_failed">Analysis Failed</option>
                <option value="schedule_completed">Schedule Completed</option>
                <option value="schedule_failed">Schedule Failed</option>
                <option value="workflow_completed">Workflow Completed</option>
                <option value="workflow_failed">Workflow Failed</option>
                <option value="daily_summary">Daily Summary</option>
                <option value="weekly_summary">Weekly Summary</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as NotificationStatus | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
                <option value="retry">Retry</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Limit
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={100}>100 records</option>
                <option value={200}>200 records</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadHistory}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {/* History List */}
          {history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                {loading ? 'Loading notification history...' : 'No notifications found with the current filters.'}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            notificationService.getStatusColor(notification.status)
                          }`}>
                            {notificationService.getStatusIcon(notification.status)} {notification.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {notificationService.getEventTypeLabel(notification.event_type)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            notificationService.getPriorityColor(notification.priority)
                          }`}>
                            {notificationService.getPriorityIcon(notification.priority)} {notification.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {notification.subject || 'No subject'}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {notification.message.substring(0, 100)}
                            {notification.message.length > 100 && '...'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(notification.created_at, 'datetime')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {notification.sent_at ? formatDateTime(notification.sent_at, 'datetime') : 
                           notification.failed_at ? formatDateTime(notification.failed_at, 'datetime') : 
                           '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary */}
          {history.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 text-center">
              Showing {history.length} notifications
              {eventTypeFilter && ` for ${notificationService.getEventTypeLabel(eventTypeFilter)}`}
              {statusFilter && ` with status ${statusFilter}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationHistoryModal;