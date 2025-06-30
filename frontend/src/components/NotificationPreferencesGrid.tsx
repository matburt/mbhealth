import React, { useState } from 'react';
import { notificationService, NotificationChannel, NotificationPreferenceWithChannel, NotificationEventType, NotificationPriority } from '../services/notifications';

interface NotificationPreferencesGridProps {
  channels: NotificationChannel[];
  preferences: NotificationPreferenceWithChannel[];
  onUpdate: () => void;
}

const NotificationPreferencesGrid: React.FC<NotificationPreferencesGridProps> = ({
  channels,
  preferences,
  onUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventTypes: NotificationEventType[] = [
    'analysis_completed',
    'analysis_failed',
    'schedule_completed',
    'schedule_failed',
    'workflow_completed',
    'workflow_failed',
    'daily_summary',
    'weekly_summary'
  ];

  const getPreference = (channelId: string, eventType: NotificationEventType) => {
    return preferences.find(p => p.channel_id === channelId && p.event_type === eventType);
  };

  const updatePreference = async (
    channelId: string,
    eventType: NotificationEventType,
    updates: { is_enabled?: boolean; minimum_priority?: NotificationPriority }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const existing = getPreference(channelId, eventType);
      
      if (existing) {
        await notificationService.updatePreference(existing.id, updates);
      } else {
        await notificationService.createPreference({
          channel_id: channelId,
          event_type: eventType,
          ...updates
        });
      }
      
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update preference');
    } finally {
      setLoading(false);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No channels available to configure preferences.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Type
                </th>
                {channels.map((channel) => (
                  <th key={channel.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col items-center space-y-1">
                      <span>{notificationService.getChannelTypeIcon(channel.channel_type)}</span>
                      <span>{channel.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eventTypes.map((eventType) => (
                <tr key={eventType} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {notificationService.getEventTypeLabel(eventType)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {eventType === 'analysis_completed' && 'When AI analysis finishes successfully'}
                      {eventType === 'analysis_failed' && 'When AI analysis encounters an error'}
                      {eventType === 'schedule_completed' && 'When scheduled analysis completes'}
                      {eventType === 'schedule_failed' && 'When scheduled analysis fails'}
                      {eventType === 'workflow_completed' && 'When workflow execution finishes'}
                      {eventType === 'workflow_failed' && 'When workflow execution fails'}
                      {eventType === 'daily_summary' && 'Daily summary of activities'}
                      {eventType === 'weekly_summary' && 'Weekly summary of activities'}
                    </div>
                  </td>
                  {channels.map((channel) => {
                    const preference = getPreference(channel.id, eventType);
                    const isEnabled = preference?.is_enabled ?? false;
                    const priority = preference?.minimum_priority ?? 'normal';

                    return (
                      <td key={channel.id} className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="space-y-2">
                          <label className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => updatePreference(channel.id, eventType, {
                                is_enabled: e.target.checked,
                                minimum_priority: priority
                              })}
                              disabled={loading || !channel.is_enabled}
                              className="rounded"
                            />
                          </label>
                          
                          {isEnabled && (
                            <select
                              value={priority}
                              onChange={(e) => updatePreference(channel.id, eventType, {
                                is_enabled: true,
                                minimum_priority: e.target.value as NotificationPriority
                              })}
                              disabled={loading}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="low">Low+</option>
                              <option value="normal">Normal+</option>
                              <option value="high">High+</option>
                              <option value="urgent">Urgent</option>
                            </select>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <div className="mb-2"><strong>How to use this grid:</strong></div>
        <ul className="space-y-1 ml-4">
          <li>• Check the box to enable notifications for that event type on that channel</li>
          <li>• Use the dropdown to set the minimum priority level for notifications</li>
          <li>• "Normal+" means you'll get Normal, High, and Urgent notifications</li>
          <li>• Disabled channels (grayed out) cannot receive notifications</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationPreferencesGrid;