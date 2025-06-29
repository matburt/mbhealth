import React from 'react';
import { ChartConfiguration, LineType, ChartType, ChartStyle } from '../hooks/useChartConfiguration';

interface ChartConfigurationPanelProps {
  configuration: ChartConfiguration;
  onConfigurationChange: (updates: Partial<ChartConfiguration>) => void;
  onLoadPreset: (presetName: string) => void;
  compact?: boolean;
}

const ChartConfigurationPanel: React.FC<ChartConfigurationPanelProps> = ({
  configuration,
  onConfigurationChange,
  onLoadPreset,
  compact = false
}) => {
  const lineTypeOptions: { value: LineType; label: string; description: string }[] = [
    { value: 'monotone', label: 'Curved', description: 'Smooth curved lines' },
    { value: 'linear', label: 'Straight', description: 'Straight line segments' },
    { value: 'step', label: 'Step', description: 'Step-wise lines' },
    { value: 'stepBefore', label: 'Step Before', description: 'Step before data point' },
    { value: 'stepAfter', label: 'Step After', description: 'Step after data point' }
  ];

  const chartTypeOptions: { value: ChartType; label: string; icon: string }[] = [
    { value: 'line', label: 'Line Chart', icon: '📈' },
    { value: 'bar', label: 'Bar Chart', icon: '📊' },
    { value: 'area', label: 'Area Chart', icon: '🏔️' },
    { value: 'scatter', label: 'Scatter Plot', icon: '⚡' }
  ];

  const styleOptions: { value: ChartStyle; label: string; description: string }[] = [
    { value: 'modern', label: 'Modern', description: 'Colorful with full features' },
    { value: 'minimal', label: 'Minimal', description: 'Clean and simple' },
    { value: 'clinical', label: 'Clinical', description: 'Medical with target ranges' }
  ];

  const presetOptions = [
    { value: 'data-visualization', label: 'Data Visualization', description: 'Modern curved lines for analysis' },
    { value: 'health-data', label: 'Health Data', description: 'Clinical view with targets' },
    { value: 'analysis-modal', label: 'Analysis Modal', description: 'Compact with data table' },
    { value: 'dashboard', label: 'Dashboard', description: 'Minimal overview' },
    { value: 'print', label: 'Print/Export', description: 'High contrast for printing' }
  ];

  if (compact) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
        <h4 className="font-medium text-gray-900">Chart Options</h4>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Line Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Line Style</label>
            <button
              onClick={() => onConfigurationChange({ 
                lineType: configuration.lineType === 'monotone' ? 'linear' : 'monotone' 
              })}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {configuration.lineType === 'monotone' ? '📈 Curved' : '📏 Straight'}
            </button>
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
            <select
              value={configuration.chartType}
              onChange={(e) => onConfigurationChange({ chartType: e.target.value as ChartType })}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
            >
              {chartTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Toggles */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onConfigurationChange({ showGrid: !configuration.showGrid })}
            className={`px-2 py-1 text-xs rounded ${
              configuration.showGrid ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => onConfigurationChange({ showAverages: !configuration.showAverages })}
            className={`px-2 py-1 text-xs rounded ${
              configuration.showAverages ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Averages
          </button>
          <button
            onClick={() => onConfigurationChange({ showTargetRanges: !configuration.showTargetRanges })}
            className={`px-2 py-1 text-xs rounded ${
              configuration.showTargetRanges ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Targets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Chart Configuration</h3>

      {/* Presets */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Quick Presets</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {presetOptions.map(preset => (
            <button
              key={preset.value}
              onClick={() => onLoadPreset(preset.value)}
              className="text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">{preset.label}</div>
              <div className="text-sm text-gray-600">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Line Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Line Type</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {lineTypeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onConfigurationChange({ lineType: option.value })}
              className={`p-3 text-left border rounded-lg transition-colors ${
                configuration.lineType === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Chart Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {chartTypeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onConfigurationChange({ chartType: option.value })}
              className={`p-3 text-center border rounded-lg transition-colors ${
                configuration.chartType === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="text-2xl mb-1">{option.icon}</div>
              <div className="text-sm font-medium">{option.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Style */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {styleOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onConfigurationChange({ style: option.value })}
              className={`p-3 text-left border rounded-lg transition-colors ${
                configuration.style === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-600">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={configuration.showGrid}
              onChange={(e) => onConfigurationChange({ showGrid: e.target.checked })}
              className="rounded mr-2"
            />
            <span className="text-sm">Show Grid</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={configuration.showLegend}
              onChange={(e) => onConfigurationChange({ showLegend: e.target.checked })}
              className="rounded mr-2"
            />
            <span className="text-sm">Show Legend</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={configuration.showAverages}
              onChange={(e) => onConfigurationChange({ showAverages: e.target.checked })}
              className="rounded mr-2"
            />
            <span className="text-sm">Show Averages</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={configuration.showTrends}
              onChange={(e) => onConfigurationChange({ showTrends: e.target.checked })}
              className="rounded mr-2"
            />
            <span className="text-sm">Show Trends</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={configuration.showTargetRanges}
              onChange={(e) => onConfigurationChange({ showTargetRanges: e.target.checked })}
              className="rounded mr-2"
            />
            <span className="text-sm">Target Ranges</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={configuration.showDataTable}
              onChange={(e) => onConfigurationChange({ showDataTable: e.target.checked })}
              className="rounded mr-2"
            />
            <span className="text-sm">Data Table</span>
          </label>
        </div>
      </div>

      {/* Height Slider */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chart Height: {configuration.height}px
        </label>
        <input
          type="range"
          min="200"
          max="600"
          step="20"
          value={configuration.height}
          onChange={(e) => onConfigurationChange({ height: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default ChartConfigurationPanel;