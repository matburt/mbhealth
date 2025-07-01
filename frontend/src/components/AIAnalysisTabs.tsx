import React, { useState } from 'react';
import AnalysisSchedulesPage from '../pages/AnalysisSchedulesPage';
import AIProvidersPage from '../pages/AIProvidersPage';
import AnalysisWorkflowsPage from '../pages/AnalysisWorkflowsPage';

interface Tab {
  id: string;
  label: string;
  icon: string;
  component: React.ComponentType;
}

const tabs: Tab[] = [
  {
    id: 'analysis',
    label: 'AI Analysis',
    icon: '🤖',
    component: () => <div>AI Analysis Content</div> // This will be the main analysis interface
  },
  {
    id: 'providers',
    label: 'AI Providers',
    icon: '⚙️',
    component: AIProvidersPage
  },
  {
    id: 'schedules',
    label: 'Schedules',
    icon: '📅',
    component: AnalysisSchedulesPage
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: '🔄',
    component: AnalysisWorkflowsPage
  }
];

interface AIAnalysisTabsProps {
  children?: React.ReactNode; // For the main analysis content
  defaultTab?: string;
}

const AIAnalysisTabs: React.FC<AIAnalysisTabsProps> = ({ 
  children, 
  defaultTab = 'analysis' 
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const renderTabContent = () => {
    if (activeTab === 'analysis') {
      return children; // Return the main analysis interface passed as children
    }

    const tab = tabs.find(t => t.id === activeTab);
    if (tab) {
      const Component = tab.component;
      return <Component />;
    }

    return null;
  };

  return (
    <div className="space-y-6">
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
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AIAnalysisTabs;