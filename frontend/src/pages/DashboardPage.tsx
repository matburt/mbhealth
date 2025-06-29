import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import DashboardStats from '../components/DashboardStats';
import RecentHealthData from '../components/RecentHealthData';
import QuickAddForm from '../components/QuickAddForm';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { formatDateTime } = useTimezone();

  const quickActions = [
    {
      title: 'View All Health Data',
      description: 'See your complete health history and trends',
      icon: '📊',
      link: '/health-data',
      color: 'bg-blue-500'
    },
    {
      title: 'AI Analysis',
      description: 'Get AI-powered insights about your health data',
      icon: '🤖',
      link: '/ai-analysis',
      color: 'bg-purple-500'
    },
    {
      title: 'Manage Families',
      description: 'Share data with family members and caregivers',
      icon: '👨‍👩‍👧‍👦',
      link: '/families',
      color: 'bg-green-500'
    },
    {
      title: 'Care Teams',
      description: 'Connect with healthcare providers',
      icon: '👩‍⚕️',
      link: '/care-teams',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name || user?.username}!
          </h1>
          <p className="text-gray-600 mt-2">
            Here's an overview of your health data and quick actions.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {formatDateTime(new Date(), 'date')}
          </p>
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="max-w-md">
        <QuickAddForm />
      </div>

      {/* Health Stats */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Overview</h2>
        <DashboardStats />
      </div>

      {/* Recent Data and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Health Data */}
        <div>
          <RecentHealthData />
        </div>

        {/* Quick Actions */}
        <div>
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  to={action.link}
                  className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg mr-4 ${action.color}`}>
                    {action.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </div>
                  <div className="text-gray-400">
                    →
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div className="card bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Health Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <p className="font-medium mb-1">📅 Consistency is Key</p>
            <p>Try to record your health data at the same time each day for more accurate tracking.</p>
          </div>
          <div>
            <p className="font-medium mb-1">📊 Track Trends</p>
            <p>Use the AI analysis feature to identify patterns and get personalized recommendations.</p>
          </div>
          <div>
            <p className="font-medium mb-1">👥 Share with Care Team</p>
            <p>Invite family members and healthcare providers to view your data and add notes.</p>
          </div>
          <div>
            <p className="font-medium mb-1">🎯 Set Goals</p>
            <p>Monitor your progress towards health goals with regular data entry and analysis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 