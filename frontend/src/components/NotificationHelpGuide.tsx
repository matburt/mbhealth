import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExampleChannel {
  name: string;
  description: string;
  url: string;
  steps: string[];
}

interface ServiceCategory {
  name: string;
  icon: string;
  examples: ExampleChannel[];
}

const NotificationHelpGuide: React.FC = () => {
  const [expandedSection, setExpandedSection] = useState<string | null>('email');
  const [expandedExample, setExpandedExample] = useState<string | null>(null);

  const serviceCategories: ServiceCategory[] = [
    {
      name: 'Email Services',
      icon: '📧',
      examples: [
        {
          name: 'Gmail',
          description: 'Send notifications to your Gmail account',
          url: 'mailto://username:password@gmail.com',
          steps: [
            'Use your Gmail username (without @gmail.com)',
            'Generate an App Password in your Google Account settings',
            'Use the App Password instead of your regular password',
            'Format: mailto://username:app-password@gmail.com'
          ]
        },
        {
          name: 'Outlook/Hotmail',
          description: 'Send notifications to your Microsoft email account',
          url: 'mailto://username:password@hotmail.com',
          steps: [
            'Use your full email address as username',
            'Use your account password or app password',
            'Format: mailto://your.email@outlook.com:password@hotmail.com'
          ]
        },
        {
          name: 'Custom SMTP',
          description: 'Connect to any SMTP server',
          url: 'mailtos://username:password@smtp.example.com:587',
          steps: [
            'Get SMTP server details from your email provider',
            'Use "mailtos://" for SSL/TLS connections',
            'Include port number (usually 587 or 465)',
            'Format: mailtos://username:password@smtp.server.com:587'
          ]
        }
      ]
    },
    {
      name: 'Messaging Platforms',
      icon: '💬',
      examples: [
        {
          name: 'Discord',
          description: 'Send notifications to a Discord channel via webhook',
          url: 'discord://webhook_id/webhook_token',
          steps: [
            'Go to your Discord server settings',
            'Navigate to Integrations → Webhooks',
            'Create a new webhook or copy existing webhook URL',
            'Extract the ID and token from the URL',
            'Format: discord://webhook_id/webhook_token'
          ]
        },
        {
          name: 'Slack',
          description: 'Send notifications to a Slack channel',
          url: 'slack://tokenA/tokenB/tokenC',
          steps: [
            'Create a Slack app at api.slack.com',
            'Add the "Incoming Webhooks" feature',
            'Generate a webhook URL',
            'Extract the three tokens from the webhook URL',
            'Format: slack://tokenA/tokenB/tokenC'
          ]
        },
        {
          name: 'Microsoft Teams',
          description: 'Send notifications to a Teams channel',
          url: 'msteams://TokenA/TokenB/TokenC',
          steps: [
            'Go to your Teams channel',
            'Click the three dots (⋯) → Connectors',
            'Configure "Incoming Webhook"',
            'Copy the webhook URL and extract tokens',
            'Format: msteams://TokenA/TokenB/TokenC'
          ]
        },
        {
          name: 'Telegram',
          description: 'Send notifications via Telegram bot',
          url: 'tgram://bottoken/ChatID',
          steps: [
            'Message @BotFather on Telegram to create a bot',
            'Get your bot token from BotFather',
            'Get your Chat ID by messaging @userinfobot',
            'Format: tgram://bot_token/chat_id'
          ]
        }
      ]
    },
    {
      name: 'Push Notifications',
      icon: '📱',
      examples: [
        {
          name: 'Pushover',
          description: 'Cross-platform push notifications',
          url: 'pover://user@token',
          steps: [
            'Sign up at pushover.net',
            'Note your User Key from the dashboard',
            'Create an application to get an API Token',
            'Format: pover://user_key@api_token'
          ]
        },
        {
          name: 'Pushbullet',
          description: 'Push notifications to your devices',
          url: 'pbul://accesstoken',
          steps: [
            'Sign up at pushbullet.com',
            'Go to Settings → Access Tokens',
            'Create a new access token',
            'Format: pbul://access_token'
          ]
        },
        {
          name: 'Gotify',
          description: 'Self-hosted push notification server',
          url: 'gotify://hostname/token',
          steps: [
            'Set up your Gotify server',
            'Create an application in Gotify admin',
            'Copy the application token',
            'Format: gotify://your.server.com/app_token'
          ]
        }
      ]
    },
    {
      name: 'SMS Services',
      icon: '📞',
      examples: [
        {
          name: 'Twilio',
          description: 'Send SMS notifications via Twilio',
          url: 'twilio://AccountSID:AuthToken@FromPhoneNo',
          steps: [
            'Sign up for Twilio account',
            'Get your Account SID and Auth Token from dashboard',
            'Purchase a phone number from Twilio',
            'Format: twilio://account_sid:auth_token@+1234567890'
          ]
        },
        {
          name: 'AWS SNS',
          description: 'Send SMS via Amazon SNS',
          url: 'sns://AccessKeyID/AccessSecretKey/RegionName/+PhoneNo',
          steps: [
            'Create AWS account and configure SNS',
            'Create IAM user with SNS permissions',
            'Get Access Key ID and Secret Access Key',
            'Format: sns://access_key/secret_key/us-east-1/+1234567890'
          ]
        }
      ]
    },
    {
      name: 'Webhooks',
      icon: '🔗',
      examples: [
        {
          name: 'JSON Webhook',
          description: 'Send JSON payload to any webhook endpoint',
          url: 'json://hostname/path',
          steps: [
            'Set up your webhook endpoint to receive JSON',
            'Ensure your endpoint accepts POST requests',
            'Format: json://api.example.com/webhook',
            'Add headers if needed: json://api.example.com/webhook?-HeaderName=Value'
          ]
        },
        {
          name: 'Form Webhook',
          description: 'Send form data to webhook endpoint',
          url: 'form://hostname/path',
          steps: [
            'Set up your webhook endpoint to receive form data',
            'Ensure your endpoint accepts POST requests',
            'Format: form://api.example.com/webhook',
            'Data will be sent as application/x-www-form-urlencoded'
          ]
        }
      ]
    }
  ];

  const toggleSection = (sectionName: string) => {
    setExpandedSection(expandedSection === sectionName ? null : sectionName);
  };

  const toggleExample = (exampleName: string) => {
    setExpandedExample(expandedExample === exampleName ? null : exampleName);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Notification Setup Guide
        </h2>
        <p className="text-gray-600 mb-6">
          MB Health supports 100+ notification services through Apprise. Choose from popular 
          services below or visit the{' '}
          <a 
            href="https://github.com/caronc/apprise" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Apprise documentation
          </a>{' '}
          for the complete list.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Security Note:</strong> All notification service URLs are encrypted 
                before storage. Your credentials are kept secure and never transmitted in plain text.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {serviceCategories.map((category) => (
          <div key={category.name} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection(category.name)}
              className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 
                         border-b border-gray-200 flex items-center justify-between
                         rounded-t-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl">{category.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                <span className="text-sm text-gray-500">
                  ({category.examples.length} service{category.examples.length !== 1 ? 's' : ''})
                </span>
              </div>
              {expandedSection === category.name ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </button>

            {expandedSection === category.name && (
              <div className="p-6 space-y-4">
                {category.examples.map((example) => (
                  <div key={example.name} className="border border-gray-100 rounded-lg">
                    <button
                      onClick={() => toggleExample(example.name)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 
                                 flex items-center justify-between rounded-lg
                                 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{example.name}</h4>
                        <p className="text-sm text-gray-600">{example.description}</p>
                      </div>
                      {expandedExample === example.name ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </button>

                    {expandedExample === example.name && (
                      <div className="px-4 pb-4 border-t border-gray-100">
                        <div className="mt-3 space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              URL Format:
                            </label>
                            <code className="block p-2 bg-gray-100 rounded text-sm font-mono text-gray-800 break-all">
                              {example.url}
                            </code>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Setup Steps:
                            </label>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                              {example.steps.map((step, index) => (
                                <li key={index}>{step}</li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Getting Started Tips
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🚀 Quick Setup</h4>
            <ul className="space-y-1">
              <li>• Use the Quick Setup wizard for popular services</li>
              <li>• Test your channel immediately after creation</li>
              <li>• Start with email notifications - they're easiest to set up</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-2">⚙️ Best Practices</h4>
            <ul className="space-y-1">
              <li>• Set up multiple channels for redundancy</li>
              <li>• Configure quiet hours to avoid late-night alerts</li>
              <li>• Use different priority levels for different events</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🔐 Security</h4>
            <ul className="space-y-1">
              <li>• Use app passwords instead of account passwords</li>
              <li>• Create dedicated webhook endpoints when possible</li>
              <li>• Regularly rotate API tokens and keys</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-800 mb-2">🎯 Notification Events</h4>
            <ul className="space-y-1">
              <li>• Analysis completion/failure</li>
              <li>• Schedule execution results</li>
              <li>• Workflow completion and progress</li>
              <li>• System alerts and errors</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Need help with a specific service?{' '}
          <a 
            href="https://github.com/caronc/apprise/wiki" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Check the Apprise wiki
          </a>{' '}
          for detailed configuration examples.
        </p>
      </div>
    </div>
  );
};

export default NotificationHelpGuide;