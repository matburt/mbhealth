import React from 'react';

interface QuickPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  metrics: string[];
  color: string;
}

interface QuickPresetsProps {
  onPresetSelect: (preset: QuickPreset) => void;
}

const QuickPresets: React.FC<QuickPresetsProps> = ({ onPresetSelect }) => {
  const presets: QuickPreset[] = [
    {
      id: 'morning_routine',
      name: 'Morning Routine',
      icon: '🌅',
      description: 'Weight + BP + Heart Rate',
      metrics: ['weight', 'bp', 'hr'],
      color: 'blue'
    },
    {
      id: 'post_meal',
      name: 'Post-Meal Check',
      icon: '🍽️',
      description: 'Blood Sugar + BP',
      metrics: ['bs', 'bp'],
      color: 'green'
    },
    {
      id: 'checkup_prep',
      name: 'Doctor Visit Prep',
      icon: '🩺',
      description: 'All Vitals',
      metrics: ['bp', 'bs', 'weight', 'hr', 'temp'],
      color: 'purple'
    },
    {
      id: 'workout_track',
      name: 'Workout Tracking',
      icon: '💪',
      description: 'Weight + Heart Rate',
      metrics: ['weight', 'hr'],
      color: 'red'
    },
    {
      id: 'sick_day',
      name: 'Sick Day Monitor',
      icon: '🤒',
      description: 'Temperature + Heart Rate',
      metrics: ['temp', 'hr'],
      color: 'orange'
    }
  ];

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Quick Entry Presets</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {presets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onPresetSelect(preset)}
            className={`p-3 rounded-lg border-2 border-${preset.color}-200 bg-${preset.color}-50 hover:border-${preset.color}-300 hover:bg-${preset.color}-100 transition-all text-left`}
          >
            <div className="flex items-start space-x-3">
              <span className="text-2xl">{preset.icon}</span>
              <div className="flex-1">
                <h4 className={`font-medium text-${preset.color}-800 text-sm`}>
                  {preset.name}
                </h4>
                <p className={`text-xs text-${preset.color}-600 mt-1`}>
                  {preset.description}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-3">
        Click a preset to quickly enable the relevant metrics in Multi-Metric Form
      </p>
    </div>
  );
};

export default QuickPresets;