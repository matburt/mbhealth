import api from './api';

// Enums
export type NotificationChannelType = 'email' | 'discord' | 'slack' | 'teams' | 'telegram' | 'pushover' | 'webhooks' | 'sms' | 'custom';
export type NotificationEventType = 'analysis_completed' | 'analysis_failed' | 'schedule_completed' | 'schedule_failed' | 'workflow_completed' | 'workflow_failed' | 'workflow_step_failed' | 'daily_summary' | 'weekly_summary' | 'system_alert';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'retry';

// Channel Types
export interface NotificationChannelCreate {
  name: string;
  channel_type: NotificationChannelType;
  apprise_url: string;
  is_enabled?: boolean;
}

export interface NotificationChannelUpdate {
  name?: string;
  apprise_url?: string;
  is_enabled?: boolean;
}

export interface NotificationChannel {
  id: string;
  user_id: number;
  name: string;
  channel_type: NotificationChannelType;
  apprise_url: string;
  is_enabled: boolean;
  is_verified: boolean;
  last_test_at?: string;
  last_test_success?: boolean;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationChannelTest {
  success: boolean;
  message: string;
  tested_at: string;
}

// Preference Types
export interface NotificationPreferenceCreate {
  channel_id: string;
  event_type: NotificationEventType;
  is_enabled?: boolean;
  minimum_priority?: NotificationPriority;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  max_per_hour?: number;
  max_per_day?: number;
  include_analysis_content?: boolean;
  include_summary_stats?: boolean;
  include_recommendations?: boolean;
  filters?: Record<string, any>;
}

export interface NotificationPreferenceUpdate {
  is_enabled?: boolean;
  minimum_priority?: NotificationPriority;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone?: string;
  max_per_hour?: number;
  max_per_day?: number;
  include_analysis_content?: boolean;
  include_summary_stats?: boolean;
  include_recommendations?: boolean;
  filters?: Record<string, any>;
}

export interface NotificationPreference {
  id: string;
  user_id: number;
  channel_id: string;
  event_type: NotificationEventType;
  is_enabled: boolean;
  minimum_priority: NotificationPriority;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  max_per_hour?: number;
  max_per_day?: number;
  include_analysis_content: boolean;
  include_summary_stats: boolean;
  include_recommendations: boolean;
  filters?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferenceWithChannel extends NotificationPreference {
  channel: NotificationChannel;
}

// History Types
export interface NotificationHistory {
  id: string;
  user_id: number;
  channel_id?: string;
  event_type: NotificationEventType;
  priority: NotificationPriority;
  status: NotificationStatus;
  subject?: string;
  message: string;
  sent_at?: string;
  delivered_at?: string;
  failed_at?: string;
  retry_count: number;
  error_message?: string;
  analysis_id?: number;
  schedule_id?: string;
  workflow_id?: string;
  execution_id?: string;
  created_at: string;
}

// Send Notification Types
export interface SendNotificationRequest {
  user_id: number;
  event_type: NotificationEventType;
  data: Record<string, any>;
  priority?: NotificationPriority;
  analysis_id?: number;
  schedule_id?: string;
  workflow_id?: string;
  execution_id?: string;
}

export interface NotificationResult {
  channel_id: string;
  channel_name: string;
  success: boolean;
  error?: string;
  history_id: string;
  sent_at?: string;
}

export interface SendNotificationResponse {
  results: NotificationResult[];
  total_sent: number;
  total_failed: number;
  success_rate: number;
}

// Statistics Types
export interface NotificationStats {
  total_sent: number;
  total_failed: number;
  success_rate: number;
  event_stats: Record<string, number>;
  active_channels: number;
}

// Configuration Types
export interface NotificationConfig {
  available_channel_types: string[];
  available_event_types: string[];
  available_priorities: string[];
  default_templates: Record<string, Record<string, string>>;
  rate_limit_defaults: Record<string, number>;
}

// Quick Setup Types
export interface QuickSetupRequest {
  email?: string;
  discord_webhook?: string;
  slack_webhook?: string;
  enable_all_events?: boolean;
  priority_level?: NotificationPriority;
}

export interface QuickSetupResponse {
  channels_created: string[];
  preferences_created: string[];
  tests_passed: string[];
  tests_failed: string[];
  success: boolean;
  message: string;
}

// Bulk Operations
export interface BulkPreferenceUpdate {
  event_types: NotificationEventType[];
  updates: NotificationPreferenceUpdate;
}

class NotificationService {
  // Channel Management
  async createChannel(channel: NotificationChannelCreate): Promise<NotificationChannel> {
    const response = await api.post('/notifications/channels/', channel);
    return response.data;
  }

  async getChannels(): Promise<NotificationChannel[]> {
    const response = await api.get('/notifications/channels/');
    return response.data;
  }

  async getChannel(channelId: string): Promise<NotificationChannel> {
    const response = await api.get(`/notifications/channels/${channelId}`);
    return response.data;
  }

  async updateChannel(channelId: string, updates: NotificationChannelUpdate): Promise<NotificationChannel> {
    const response = await api.put(`/notifications/channels/${channelId}`, updates);
    return response.data;
  }

  async deleteChannel(channelId: string): Promise<void> {
    await api.delete(`/notifications/channels/${channelId}`);
  }

  async testChannel(channelId: string): Promise<NotificationChannelTest> {
    const response = await api.post(`/notifications/channels/${channelId}/test`);
    return response.data;
  }

  // Preference Management
  async createPreference(preference: NotificationPreferenceCreate): Promise<NotificationPreference> {
    const response = await api.post('/notifications/preferences/', preference);
    return response.data;
  }

  async getPreferences(eventType?: NotificationEventType, channelId?: string): Promise<NotificationPreferenceWithChannel[]> {
    const params: any = {};
    if (eventType) params.event_type = eventType;
    if (channelId) params.channel_id = channelId;
    
    const response = await api.get('/notifications/preferences/', { params });
    return response.data;
  }

  async updatePreference(preferenceId: string, updates: NotificationPreferenceUpdate): Promise<NotificationPreference> {
    const response = await api.put(`/notifications/preferences/${preferenceId}`, updates);
    return response.data;
  }

  async deletePreference(preferenceId: string): Promise<void> {
    await api.delete(`/notifications/preferences/${preferenceId}`);
  }

  async bulkUpdatePreferences(bulkUpdate: BulkPreferenceUpdate): Promise<NotificationPreference[]> {
    const response = await api.post('/notifications/preferences/bulk', bulkUpdate);
    return response.data;
  }

  // Manual Notification Sending
  async sendNotification(request: SendNotificationRequest): Promise<SendNotificationResponse> {
    const response = await api.post('/notifications/send', request);
    return response.data;
  }

  // History and Statistics
  async getHistory(
    limit?: number,
    eventType?: NotificationEventType,
    status?: NotificationStatus
  ): Promise<NotificationHistory[]> {
    const params: any = {};
    if (limit) params.limit = limit;
    if (eventType) params.event_type = eventType;
    if (status) params.status = status;
    
    const response = await api.get('/notifications/history/', { params });
    return response.data;
  }

  async getStats(): Promise<NotificationStats> {
    const response = await api.get('/notifications/stats/');
    return response.data;
  }

  // Configuration
  async getConfig(): Promise<NotificationConfig> {
    const response = await api.get('/notifications/config/');
    return response.data;
  }

  async quickSetup(setup: QuickSetupRequest): Promise<QuickSetupResponse> {
    const response = await api.post('/notifications/quick-setup', setup);
    return response.data;
  }

  // Helper methods
  getChannelTypeIcon(channelType: NotificationChannelType): string {
    switch (channelType) {
      case 'email': return '📧';
      case 'discord': return '🎮';
      case 'slack': return '💬';
      case 'teams': return '👥';
      case 'telegram': return '✈️';
      case 'pushover': return '📱';
      case 'webhooks': return '🔗';
      case 'sms': return '📱';
      default: return '🔔';
    }
  }

  getEventTypeLabel(eventType: NotificationEventType): string {
    switch (eventType) {
      case 'analysis_completed': return 'Analysis Completed';
      case 'analysis_failed': return 'Analysis Failed';
      case 'schedule_completed': return 'Schedule Completed';
      case 'schedule_failed': return 'Schedule Failed';
      case 'workflow_completed': return 'Workflow Completed';
      case 'workflow_failed': return 'Workflow Failed';
      case 'workflow_step_failed': return 'Workflow Step Failed';
      case 'daily_summary': return 'Daily Summary';
      case 'weekly_summary': return 'Weekly Summary';
      case 'system_alert': return 'System Alert';
      default: return eventType;
    }
  }

  getPriorityIcon(priority: NotificationPriority): string {
    switch (priority) {
      case 'low': return '💡';
      case 'normal': return '🔔';
      case 'high': return '⚡';
      case 'urgent': return '🚨';
      default: return '🔔';
    }
  }

  getPriorityColor(priority: NotificationPriority): string {
    switch (priority) {
      case 'low': return 'text-blue-600 bg-blue-100';
      case 'normal': return 'text-gray-600 bg-gray-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'urgent': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getStatusIcon(status: NotificationStatus): string {
    switch (status) {
      case 'pending': return '⏳';
      case 'sent': return '✅';
      case 'failed': return '❌';
      case 'retry': return '🔄';
      default: return '❓';
    }
  }

  getStatusColor(status: NotificationStatus): string {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'sent': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'retry': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  }

  getAppriseUrlHelp(channelType: NotificationChannelType): { example: string; description: string } {
    switch (channelType) {
      case 'email':
        return {
          example: 'mailto://user:password@gmail.com?to=recipient@example.com',
          description: 'SMTP email configuration. For Gmail, use app-specific passwords.'
        };
      case 'discord':
        return {
          example: 'discord://webhook_id/webhook_token',
          description: 'Discord webhook URL. Create in Server Settings > Integrations > Webhooks.'
        };
      case 'slack':
        return {
          example: 'slack://TokenA/TokenB/TokenC/Channel',
          description: 'Slack webhook or bot token. Create in Slack API > Your Apps.'
        };
      case 'teams':
        return {
          example: 'msteams://TokenA/TokenB/TokenC/',
          description: 'Microsoft Teams webhook URL from channel connectors.'
        };
      case 'telegram':
        return {
          example: 'tgram://bottoken/ChatID',
          description: 'Telegram bot token and chat ID. Create bot via @BotFather.'
        };
      case 'pushover':
        return {
          example: 'pover://user@token',
          description: 'Pushover user key and application token.'
        };
      case 'webhooks':
        return {
          example: 'json://hostname/a/path/to/post/to',
          description: 'Generic webhook URL for JSON POST requests.'
        };
      case 'sms':
        return {
          example: 'twilio://AccountSid:AuthToken@FromPhoneNo/ToPhoneNo',
          description: 'SMS via Twilio with account credentials and phone numbers.'
        };
      default:
        return {
          example: '',
          description: 'Refer to Apprise documentation for specific URL format.'
        };
    }
  }
}

export const notificationService = new NotificationService();