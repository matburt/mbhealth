import React, { useState, useEffect } from 'react';
import { notificationService, NotificationChannel, NotificationPreferenceWithChannel, NotificationStats, QuickSetupRequest } from '../services/notifications';
import NotificationChannelCard from './NotificationChannelCard';
import NotificationPreferencesGrid from './NotificationPreferencesGrid';
import QuickSetupModal from './QuickSetupModal';
import NotificationHistoryModal from './NotificationHistoryModal';
import NotificationHelpGuide from './NotificationHelpGuide';

const NotificationSettings: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [preferences, setPreferences] = useState<NotificationPreferenceWithChannel[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('channels');
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [channelsData, preferencesData, statsData] = await Promise.all([
        notificationService.getChannels(),
        notificationService.getPreferences(),
        notificationService.getStats()
      ]);

      setChannels(channelsData);
      setPreferences(preferencesData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load notification settings');
      console.error('Error loading notification data:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleChannelUpdated = () => {
    loadData();
  };

  const handleChannelDeleted = () => {
    loadData();
  };

  const handlePreferenceUpdated = () => {
    loadData();
  };

  const handleQuickSetup = async (setup: QuickSetupRequest) => {
    try {
      await notificationService.quickSetup(setup);
      setShowQuickSetup(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Quick setup failed');
    }
  };

  const tabs = [
    { id: 'channels', label: 'Channels', icon: '📡' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'stats', label: 'Statistics', icon: '📊' },
    { id: 'help', label: 'Setup Guide', icon: '📚' }
  ];

  if (loading && channels.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-gray-500">Loading notification settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your notification channels and preferences
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowHistory(true)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            View History
          </button>
          <button
            onClick={() => setShowQuickSetup(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Quick Setup
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.active_channels}</div>
            <div className="text-sm text-gray-600">Active Channels</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.total_sent}</div>
            <div className="text-sm text-gray-600">Notifications Sent</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.total_failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(stats.success_rate * 100)}%
            </div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

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
        {activeTab === 'channels' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Notification Channels</h2>
              <div className="text-sm text-gray-600">
                {channels.length} channel{channels.length !== 1 ? 's' : ''} configured
              </div>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  No notification channels configured yet.
                </div>
                <button
                  onClick={() => setShowQuickSetup(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Set Up Your First Channel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {channels.map((channel) => (
                  <NotificationChannelCard
                    key={channel.id}
                    channel={channel}
                    onUpdate={handleChannelUpdated}
                    onDelete={handleChannelDeleted}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
              <div className="text-sm text-gray-600">
                {preferences.length} preference{preferences.length !== 1 ? 's' : ''} configured
              </div>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  You need to set up notification channels first.
                </div>
                <button
                  onClick={() => setActiveTab('channels')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Go to Channels
                </button>
              </div>
            ) : (
              <NotificationPreferencesGrid
                channels={channels}
                preferences={preferences}
                onUpdate={handlePreferenceUpdated}
              />
            )}
          </div>
        )}

        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Notification Statistics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Stats */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Statistics</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Sent:</span>
                    <span className="font-medium">{stats.total_sent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Failed:</span>
                    <span className="font-medium">{stats.total_failed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-medium">{Math.round(stats.success_rate * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Channels:</span>
                    <span className="font-medium">{stats.active_channels}</span>
                  </div>
                </div>
              </div>

              {/* Event Type Breakdown */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Notifications by Event Type (Last 30 Days)
                </h3>
                {Object.keys(stats.event_stats).length === 0 ? (
                  <div className="text-gray-500 text-sm">No notifications sent yet</div>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.event_stats)
                      .sort(([,a], [,b]) => b - a)
                      .map(([eventType, count]) => (
                        <div key={eventType} className="flex justify-between items-center">
                          <span className="text-gray-600 text-sm capitalize">
                            {notificationService.getEventTypeLabel(eventType as any)}
                          </span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'help' && (
          <NotificationHelpGuide />
        )}
      </div>

      {/* Modals */}
      {showQuickSetup && (
        <QuickSetupModal
          onClose={() => setShowQuickSetup(false)}
          onSetup={handleQuickSetup}
        />
      )}

      {showHistory && (
        <NotificationHistoryModal
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
};

export default NotificationSettings;