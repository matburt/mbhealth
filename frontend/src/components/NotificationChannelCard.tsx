import React, { useState } from 'react';
import { notificationService, NotificationChannel, NotificationChannelUpdate, NotificationChannelTest } from '../services/notifications';

interface NotificationChannelCardProps {
  channel: NotificationChannel;
  onUpdate: () => void;
  onDelete: () => void;
}

const NotificationChannelCard: React.FC<NotificationChannelCardProps> = ({
  channel,
  onUpdate,
  onDelete
}) => {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<NotificationChannelTest | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<NotificationChannelUpdate>({
    name: channel.name,
    is_enabled: channel.is_enabled
  });
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const result = await notificationService.testChannel(channel.id);
      setTestResult(result);
      onUpdate(); // Refresh to get updated test status
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);

    try {
      await notificationService.updateChannel(channel.id, editForm);
      setEditing(false);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${channel.name}"?`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await notificationService.deleteChannel(channel.id);
      onDelete();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (!channel.is_enabled) return 'bg-gray-100 text-gray-600';
    if (channel.is_verified) return 'bg-green-100 text-green-600';
    if (channel.last_test_success === false) return 'bg-red-100 text-red-600';
    return 'bg-yellow-100 text-yellow-600';
  };

  const getStatusText = () => {
    if (!channel.is_enabled) return 'Disabled';
    if (channel.is_verified) return 'Verified';
    if (channel.last_test_success === false) return 'Test Failed';
    return 'Unverified';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">
            {notificationService.getChannelTypeIcon(channel.channel_type)}
          </span>
          <div>
            {editing ? (
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="text-lg font-medium border-b border-gray-300 focus:outline-none focus:border-blue-500"
              />
            ) : (
              <h3 className="text-lg font-medium text-gray-900">{channel.name}</h3>
            )}
            <p className="text-sm text-gray-600 capitalize">
              {channel.channel_type.replace('_', ' ')}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {editing ? (
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={editForm.is_enabled}
                onChange={(e) => setEditForm({ ...editForm, is_enabled: e.target.checked })}
                className="rounded"
              />
              <span className="text-xs text-gray-600">Enabled</span>
            </label>
          ) : null}
        </div>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {testResult.message}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 text-sm rounded">
          {error}
        </div>
      )}

      {/* Last Test Info */}
      {channel.last_test_at && (
        <div className="mb-4 text-sm text-gray-600">
          <div>Last tested: {new Date(channel.last_test_at).toLocaleString()}</div>
          {channel.last_error && (
            <div className="text-red-600 mt-1">Error: {channel.last_error}</div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={handleTest}
            disabled={testing || loading}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
          >
            {testing ? 'Testing...' : 'Test'}
          </button>
          
          {editing ? (
            <>
              <button
                onClick={handleUpdate}
                disabled={loading}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditForm({ name: channel.name, is_enabled: channel.is_enabled });
                  setError(null);
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Edit
            </button>
          )}
        </div>
        
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      {/* Channel Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div>Created: {new Date(channel.created_at).toLocaleDateString()}</div>
          {channel.updated_at !== channel.created_at && (
            <div>Updated: {new Date(channel.updated_at).toLocaleDateString()}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationChannelCard;