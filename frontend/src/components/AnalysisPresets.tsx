import React from 'react';
import { HealthData } from '../types/health';

interface AnalysisPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  analysisType: 'trends' | 'insights' | 'recommendations' | 'anomalies';
  selector: (data: HealthData[]) => HealthData[];
  context: string;
}

interface AnalysisPresetsProps {
  healthData: HealthData[];
  onPresetSelect: (preset: AnalysisPreset, selectedData: HealthData[]) => void;
}

const AnalysisPresets: React.FC<AnalysisPresetsProps> = ({ healthData, onPresetSelect }) => {
  const presets: AnalysisPreset[] = [
    {
      id: 'recent_blood_pressure',
      name: 'Recent Blood Pressure Trends',
      description: 'Analyze blood pressure patterns from the last 30 days',
      icon: '🩸',
      analysisType: 'trends',
      selector: (data) => data
        .filter(d => d.metric_type === 'blood_pressure')
        .filter(d => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(d.recorded_at) >= thirtyDaysAgo;
        }),
      context: 'Focus on blood pressure trends, patterns, and any concerning changes over the last 30 days.'
    },
    {
      id: 'weight_management',
      name: 'Weight Management Insights',
      description: 'Get insights on weight changes and recommendations',
      icon: '⚖️',
      analysisType: 'insights',
      selector: (data) => data.filter(d => d.metric_type === 'weight'),
      context: 'Analyze weight trends, provide insights on changes, and suggest actionable recommendations for weight management.'
    },
    {
      id: 'blood_sugar_control',
      name: 'Blood Sugar Control',
      description: 'Monitor blood sugar levels and detect anomalies',
      icon: '🩸',
      analysisType: 'anomalies',
      selector: (data) => data.filter(d => d.metric_type === 'blood_sugar'),
      context: 'Identify any unusual blood sugar patterns, spikes, or concerning trends that may require attention.'
    },
    {
      id: 'comprehensive_health',
      name: 'Comprehensive Health Review',
      description: 'Overall health insights from all recent data',
      icon: '🏥',
      analysisType: 'recommendations',
      selector: (data) => {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return data.filter(d => new Date(d.recorded_at) >= sevenDaysAgo);
      },
      context: 'Provide a comprehensive health assessment based on all recent readings and offer personalized recommendations.'
    },
    {
      id: 'heart_health',
      name: 'Heart Health Analysis',
      description: 'Analyze heart rate and blood pressure together',
      icon: '❤️',
      analysisType: 'insights',
      selector: (data) => data.filter(d => 
        d.metric_type === 'heart_rate' || d.metric_type === 'blood_pressure'
      ),
      context: 'Analyze cardiovascular health indicators including heart rate and blood pressure patterns.'
    },
    {
      id: 'this_week_trends',
      name: 'This Week\'s Health Trends',
      description: 'Quick overview of this week\'s health data',
      icon: '📅',
      analysisType: 'trends',
      selector: (data) => {
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        return data.filter(d => new Date(d.recorded_at) >= startOfWeek);
      },
      context: 'Analyze health trends and patterns from this week\'s data across all metrics.'
    }
  ];

  const getAvailablePresets = () => {
    return presets.filter(preset => {
      const selectedData = preset.selector(healthData);
      return selectedData.length > 0;
    });
  };

  const availablePresets = getAvailablePresets();

  if (availablePresets.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No preset analyses available with current data.</p>
        <p className="text-sm mt-2">Add more health data to see analysis presets.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Analysis Presets</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {availablePresets.map((preset) => {
          const selectedData = preset.selector(healthData);
          return (
            <button
              key={preset.id}
              onClick={() => onPresetSelect(preset, selectedData)}
              className="text-left p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:from-blue-100 hover:to-indigo-100 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <span className="text-2xl">{preset.icon}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 text-sm">{preset.name}</h5>
                  <p className="text-xs text-gray-600 mt-1">{preset.description}</p>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {preset.analysisType}
                    </span>
                    <span className="text-xs text-gray-500">
                      {selectedData.length} readings
                    </span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AnalysisPresets;