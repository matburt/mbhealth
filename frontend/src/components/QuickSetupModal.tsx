import React, { useState } from 'react';
import { QuickSetupRequest, NotificationPriority } from '../services/notifications';

interface QuickSetupModalProps {
  onClose: () => void;
  onSetup: (setup: QuickSetupRequest) => Promise<void>;
}

const QuickSetupModal: React.FC<QuickSetupModalProps> = ({ onClose, onSetup }) => {
  const [setup, setSetup] = useState<QuickSetupRequest>({
    enable_all_events: true,
    priority_level: 'normal'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSetup(setup);
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const canProceedToStep2 = setup.email || setup.discord_webhook || setup.slack_webhook || 
    (setup.custom_channel?.name && setup.custom_channel?.apprise_url);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Quick Notification Setup</h2>
              <p className="text-gray-600 mt-1">
                Set up your notification channels in just a few steps
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

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                2
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Choose Your Notification Channels
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Select one or more channels where you'd like to receive notifications.
                    You can always add more later.
                  </p>
                </div>

                {/* Email Setup */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">📧</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-600">Get notified via email</p>
                    </div>
                  </div>
                  <input
                    type="email"
                    placeholder="your-email@example.com"
                    value={setup.email || ''}
                    onChange={(e) => setSetup({ ...setup, email: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Discord Setup */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">🎮</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Discord Notifications</h4>
                      <p className="text-sm text-gray-600">Send notifications to a Discord channel</p>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="discord://webhook_id/webhook_token"
                    value={setup.discord_webhook || ''}
                    onChange={(e) => setSetup({ ...setup, discord_webhook: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create a webhook in your Discord server settings under Integrations → Webhooks
                  </p>
                </div>

                {/* Slack Setup */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">💬</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Slack Notifications</h4>
                      <p className="text-sm text-gray-600">Send notifications to a Slack channel</p>
                    </div>
                  </div>
                  <input
                    type="url"
                    placeholder="slack://TokenA/TokenB/TokenC/Channel"
                    value={setup.slack_webhook || ''}
                    onChange={(e) => setSetup({ ...setup, slack_webhook: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Create an app in your Slack workspace and get the webhook URL
                  </p>
                </div>

                {/* Custom Channel Setup */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                      <h4 className="font-medium text-gray-900">Custom Channel</h4>
                      <p className="text-sm text-gray-600">Use any Apprise-supported service</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Channel name (e.g., My Telegram Bot)"
                      value={setup.custom_channel?.name || ''}
                      onChange={(e) => setSetup({ 
                        ...setup, 
                        custom_channel: { 
                          ...setup.custom_channel,
                          name: e.target.value,
                          channel_type: setup.custom_channel?.channel_type || 'custom',
                          apprise_url: setup.custom_channel?.apprise_url || ''
                        } 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <select
                      value={setup.custom_channel?.channel_type || 'custom'}
                      onChange={(e) => setSetup({ 
                        ...setup, 
                        custom_channel: { 
                          ...setup.custom_channel,
                          name: setup.custom_channel?.name || '',
                          channel_type: e.target.value as any,
                          apprise_url: setup.custom_channel?.apprise_url || ''
                        } 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="custom">Custom/Other</option>
                      <option value="telegram">Telegram</option>
                      <option value="teams">Microsoft Teams</option>
                      <option value="pushover">Pushover</option>
                      <option value="webhooks">Webhook</option>
                      <option value="sms">SMS</option>
                    </select>
                    
                    <input
                      type="text"
                      placeholder="Apprise URL (e.g., tgram://bot_token/chat_id)"
                      value={setup.custom_channel?.apprise_url || ''}
                      onChange={(e) => setSetup({ 
                        ...setup, 
                        custom_channel: { 
                          ...setup.custom_channel,
                          name: setup.custom_channel?.name || '',
                          channel_type: setup.custom_channel?.channel_type || 'custom',
                          apprise_url: e.target.value
                        } 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Check the Help Guide for URL formats for your specific service
                  </p>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!canProceedToStep2}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Configure Notification Preferences
                  </h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Set up when and how you want to receive notifications.
                  </p>
                </div>

                {/* Enable All Events */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={setup.enable_all_events}
                      onChange={(e) => setSetup({ ...setup, enable_all_events: e.target.checked })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Enable All Event Types</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Get notified for analysis completions, failures, schedule executions, and workflow events.
                        You can customize these later in the preferences section.
                      </div>
                    </div>
                  </label>
                </div>

                {/* Priority Level */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Priority Level
                  </label>
                  <select
                    value={setup.priority_level}
                    onChange={(e) => setSetup({ ...setup, priority_level: e.target.value as NotificationPriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low - All notifications</option>
                    <option value="normal">Normal - Standard notifications</option>
                    <option value="high">High - Important notifications only</option>
                    <option value="urgent">Urgent - Critical notifications only</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You'll only receive notifications at or above this priority level
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Setup Summary</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    {setup.email && <div>• Email notifications to {setup.email}</div>}
                    {setup.discord_webhook && <div>• Discord notifications enabled</div>}
                    {setup.slack_webhook && <div>• Slack notifications enabled</div>}
                    <div>• Event notifications: {setup.enable_all_events ? 'All events' : 'Custom selection'}</div>
                    <div>• Priority level: {setup.priority_level}</div>
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-700"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Setting up...' : 'Complete Setup'}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Help Link */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Need help with setup? Check out our{' '}
              <button
                type="button"
                onClick={onClose}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                detailed setup guide
              </button>{' '}
              for step-by-step instructions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickSetupModal;