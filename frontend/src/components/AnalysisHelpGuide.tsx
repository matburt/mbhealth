import React, { useState } from 'react';

interface AnalysisHelpGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const AnalysisHelpGuide: React.FC<AnalysisHelpGuideProps> = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    {
      id: 'overview',
      title: 'Overview',
      icon: '📋',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            The AI Analysis system provides powerful tools to analyze your health data with artificial intelligence. 
            You can create single analyses, save configurations for reuse, or run comprehensive workflows.
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Quick Start:</h4>
            <ol className="list-decimal list-inside text-blue-800 space-y-1">
              <li>Select your data using any of the selection methods</li>
              <li>Choose an analysis type (trends, insights, recommendations, anomalies)</li>
              <li>Pick an AI provider</li>
              <li>Click "Create Single Analysis" or "Start Workflow"</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'data-selection',
      title: 'Data Selection',
      icon: '🎯',
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900">5 Ways to Select Your Data:</h4>
          
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h5 className="font-medium text-green-900">📊 Analysis Presets</h5>
              <p className="text-sm text-gray-700">Pre-configured analysis templates like "Recent Blood Pressure Trends" or "Weight Management Insights". Perfect for common health monitoring scenarios.</p>
            </div>
            
            <div className="border-l-4 border-gray-500 pl-4">
              <h5 className="font-medium text-gray-900">💾 Saved Configurations</h5>
              <p className="text-sm text-gray-700">Reuse your previously saved analysis setups. Mark favorites for quick access and organize into collections.</p>
            </div>
            
            <div className="border-l-4 border-blue-500 pl-4">
              <h5 className="font-medium text-blue-900">⚡ Smart Selection</h5>
              <p className="text-sm text-gray-700">Quick buttons to select data by metric type (All Blood Pressure, All Weight, etc.) or time range (This Week, Last 30 Days, Since Last Analysis).</p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h5 className="font-medium text-purple-900">🔬 Advanced Selection</h5>
              <p className="text-sm text-gray-700">Intelligent data filtering:</p>
              <ul className="text-xs text-gray-600 ml-4 list-disc">
                <li><strong>Trending Data:</strong> Automatically finds data with significant trends</li>
                <li><strong>Anomalous Data:</strong> Identifies unusual readings outside normal ranges</li>
                <li><strong>Time of Day:</strong> Filter by morning, afternoon, or evening readings</li>
              </ul>
            </div>
            
            <div className="border-l-4 border-yellow-500 pl-4">
              <h5 className="font-medium text-yellow-900">✋ Manual Selection</h5>
              <p className="text-sm text-gray-700">Click individual data points to include/exclude them. Shows metric type, value, and date for each reading.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analysis-types',
      title: 'Analysis Types',
      icon: '🤖',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">Choose the type of analysis that best fits your needs:</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">📈</span>
                <h4 className="font-semibold text-blue-900">Trend Analysis</h4>
              </div>
              <p className="text-sm text-blue-800">Identifies patterns and trends over time. Great for tracking progress and understanding long-term changes.</p>
              <div className="mt-2 text-xs text-blue-700">
                <strong>Best for:</strong> Weight loss tracking, blood pressure monitoring, medication effectiveness
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">💡</span>
                <h4 className="font-semibold text-green-900">Health Insights</h4>
              </div>
              <p className="text-sm text-green-800">Discovers correlations and patterns in your data. Provides understanding of what affects your health.</p>
              <div className="mt-2 text-xs text-green-700">
                <strong>Best for:</strong> Understanding relationships, lifestyle impact analysis, comprehensive health reviews
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">🎯</span>
                <h4 className="font-semibold text-purple-900">Recommendations</h4>
              </div>
              <p className="text-sm text-purple-800">Generates personalized, actionable advice based on your data. Suggests specific steps to improve health.</p>
              <div className="mt-2 text-xs text-purple-700">
                <strong>Best for:</strong> Action planning, lifestyle changes, goal setting, improvement strategies
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-2xl">⚠️</span>
                <h4 className="font-semibold text-red-900">Anomaly Detection</h4>
              </div>
              <p className="text-sm text-red-800">Finds unusual patterns or concerning values that may need attention. Helps identify potential health issues early.</p>
              <div className="mt-2 text-xs text-red-700">
                <strong>Best for:</strong> Health monitoring, early warning detection, identifying concerning patterns
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'workflows',
      title: 'Analysis Workflows',
      icon: '🔄',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Workflows run multiple related analyses automatically, building insights step by step. 
            Each step can use results from previous steps to provide deeper analysis.
          </p>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">Available Workflow Templates:</h4>
            
            <div className="space-y-3">
              <div className="bg-white p-3 rounded border-l-4 border-blue-500">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🏥</span>
                  <h5 className="font-medium">Comprehensive Health Assessment</h5>
                </div>
                <p className="text-sm text-gray-600 mt-1">4-step analysis: Trends → Anomalies → Insights → Recommendations</p>
                <p className="text-xs text-gray-500">Requires: 20+ data points, 30 days span, blood pressure/sugar/weight</p>
              </div>
              
              <div className="bg-white p-3 rounded border-l-4 border-red-500">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🩸</span>
                  <h5 className="font-medium">Blood Pressure Deep Dive</h5>
                </div>
                <p className="text-sm text-gray-600 mt-1">Specialized cardiovascular analysis with hypertension risk assessment</p>
                <p className="text-xs text-gray-500">Requires: 15+ BP readings, 21 days span</p>
              </div>
              
              <div className="bg-white p-3 rounded border-l-4 border-yellow-500">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🔍</span>
                  <h5 className="font-medium">Anomaly Investigation</h5>
                </div>
                <p className="text-sm text-gray-600 mt-1">Deep dive into detected anomalies with pattern analysis</p>
                <p className="text-xs text-gray-500">Requires: 10+ data points, 14 days span</p>
              </div>
              
              <div className="bg-white p-3 rounded border-l-4 border-green-500">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">📅</span>
                  <h5 className="font-medium">Weekly Health Summary</h5>
                </div>
                <p className="text-sm text-gray-600 mt-1">Quick weekly overview with comparisons and action items</p>
                <p className="text-xs text-gray-500">Requires: 5+ data points, 7 days span</p>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-lg">
            <h4 className="font-semibold text-amber-900 mb-2">💡 Workflow Benefits:</h4>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• <strong>Comprehensive Analysis:</strong> Multiple perspectives on your data</li>
              <li>• <strong>Context Building:</strong> Each step builds on previous insights</li>
              <li>• <strong>Follow-up Suggestions:</strong> AI generates next steps and recommendations</li>
              <li>• <strong>Progress Tracking:</strong> Monitor workflow execution in real-time</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'configurations',
      title: 'Saved Configurations',
      icon: '💾',
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Save your analysis setups to reuse them later. Perfect for regular health monitoring routines.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">⭐ Favorites</h4>
              <p className="text-sm text-gray-700">Mark frequently used configurations as favorites for quick access.</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📁 Collections</h4>
              <p className="text-sm text-gray-700">Organize related configurations into groups like "Weekly Monitoring" or "Medication Tracking".</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📈 Popular</h4>
              <p className="text-sm text-gray-700">See which configurations you use most often based on usage tracking.</p>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">📤 Export/Import</h4>
              <p className="text-sm text-gray-700">Share configurations with your care team or backup your analysis setups.</p>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">🎯 Pro Tip:</h4>
            <p className="text-sm text-green-800">
              Create configurations for different scenarios: "Morning Blood Pressure Check", 
              "Weekly Weight Review", "Monthly Comprehensive Analysis". This makes regular 
              health monitoring much faster and more consistent.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features',
      icon: '🚀',
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">🧠 Smart Data Analysis</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p><strong>Trending Data Detection:</strong> Uses linear regression to find significant trends (weak/moderate/strong)</p>
                <p><strong>Anomaly Detection:</strong> Statistical z-score analysis with clinical thresholds for different metrics</p>
                <p><strong>Pattern Recognition:</strong> Identifies correlations and recurring patterns across metrics</p>
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-900 mb-2">🔗 Follow-up Suggestions</h4>
              <div className="text-sm text-purple-800 space-y-2">
                <p><strong>Analysis Suggestions:</strong> AI recommends next analyses based on current results</p>
                <p><strong>Consultation Recommendations:</strong> Alerts when medical consultation may be needed</p>
                <p><strong>Data Collection Tips:</strong> Suggests additional data that would improve analysis quality</p>
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">⚖️ Clinical Intelligence</h4>
              <div className="text-sm text-green-800 space-y-2">
                <p><strong>Blood Pressure:</strong> Hypertension thresholds (140/90, 180/120) with risk assessment</p>
                <p><strong>Blood Sugar:</strong> Diabetic range monitoring (70-180 mg/dL) with anomaly detection</p>
                <p><strong>Weight Trends:</strong> BMI considerations and healthy change rate analysis</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">📊 Multi-Provider AI</h4>
              <div className="text-sm text-yellow-800 space-y-2">
                <p><strong>Provider Selection:</strong> Choose from OpenAI, Anthropic, Google, or custom AI providers</p>
                <p><strong>Model Optimization:</strong> Different providers excel at different analysis types</p>
                <p><strong>Consistency:</strong> Run same analysis across providers to verify insights</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      icon: '💡',
      content: (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="bg-green-50 border-l-4 border-green-500 p-4">
              <h4 className="font-semibold text-green-900 mb-2">✅ Data Quality Tips</h4>
              <ul className="text-sm text-green-800 space-y-1">
                <li>• Include at least 10-15 data points for meaningful analysis</li>
                <li>• Ensure data spans multiple days/weeks for trend detection</li>
                <li>• Mix different metric types for comprehensive insights</li>
                <li>• Include recent data for current health status assessment</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <h4 className="font-semibold text-blue-900 mb-2">🎯 Analysis Strategy</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Start with "Insights" to understand your data patterns</li>
                <li>• Use "Anomalies" to identify concerning readings</li>
                <li>• Run "Trends" for progress tracking over time</li>
                <li>• Get "Recommendations" for actionable next steps</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4">
              <h4 className="font-semibold text-purple-900 mb-2">⚡ Workflow Optimization</h4>
              <ul className="text-sm text-purple-800 space-y-1">
                <li>• Use workflows for comprehensive health reviews</li>
                <li>• Save successful analysis configurations for reuse</li>
                <li>• Check follow-up suggestions for deeper insights</li>
                <li>• Run comparative analysis to track progress over time</li>
              </ul>
            </div>
            
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
              <h4 className="font-semibold text-amber-900 mb-2">⚠️ Important Notes</h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• AI analysis is for informational purposes only</li>
                <li>• Always consult healthcare providers for medical decisions</li>
                <li>• Analysis quality depends on data quality and quantity</li>
                <li>• Some workflows require specific metrics and timeframes</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Analysis Guide</h2>
            <p className="text-gray-600 mt-1">Learn how to get the most from your health data analysis</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
            <nav className="p-4 space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-medium">{section.title}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {sections.find(s => s.id === activeSection)?.content}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              💡 Pro tip: Bookmark frequently used configurations and workflows for faster analysis
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisHelpGuide;