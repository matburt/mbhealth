import { useState, useCallback } from 'react';

export type LineType = 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
export type ChartType = 'line' | 'bar' | 'area' | 'scatter';
export type ChartStyle = 'modern' | 'minimal' | 'clinical';

export interface ChartConfiguration {
  lineType: LineType;
  chartType: ChartType;
  style: ChartStyle;
  showGrid: boolean;
  showLegend: boolean;
  showTargetRanges: boolean;
  showAverages: boolean;
  showTrends: boolean;
  showDataTable: boolean;
  height: number;
  colors: {
    primary: string;
    secondary: string;
    bloodPressureSystolic: string;
    bloodPressureDiastolic: string;
    grid: string;
    text: string;
    average: string;
  };
}

const defaultConfiguration: ChartConfiguration = {
  lineType: 'monotone',
  chartType: 'line',
  style: 'modern',
  showGrid: true,
  showLegend: true,
  showTargetRanges: false,
  showAverages: true,
  showTrends: true,
  showDataTable: false,
  height: 320,
  colors: {
    primary: '#3b82f6',
    secondary: '#10b981',
    bloodPressureSystolic: '#ef4444',
    bloodPressureDiastolic: '#f97316',
    grid: '#f0f0f0',
    text: '#6b7280',
    average: '#9ca3af'
  }
};

export const chartPresets: Record<string, Partial<ChartConfiguration>> = {
  // Data Visualization Page - Modern curved lines
  'data-visualization': {
    lineType: 'monotone',
    chartType: 'line',
    style: 'modern',
    showGrid: true,
    showLegend: true,
    showTargetRanges: false,
    showAverages: true,
    showTrends: true,
    showDataTable: false,
    height: 320
  },
  
  // Health Data Page - Clinical with targets
  'health-data': {
    lineType: 'monotone',
    chartType: 'line',
    style: 'clinical',
    showGrid: true,
    showLegend: true,
    showTargetRanges: true,
    showAverages: true,
    showTrends: true,
    showDataTable: false,
    height: 380
  },
  
  // Analysis Modal - Compact with data table
  'analysis-modal': {
    lineType: 'monotone',
    chartType: 'line',
    style: 'minimal',
    showGrid: false,
    showLegend: false,
    showTargetRanges: false,
    showAverages: false,
    showTrends: false,
    showDataTable: true,
    height: 240
  },
  
  // Dashboard Overview - Minimal
  'dashboard': {
    lineType: 'linear',
    chartType: 'line',
    style: 'minimal',
    showGrid: false,
    showLegend: false,
    showTargetRanges: false,
    showAverages: false,
    showTrends: true,
    showDataTable: false,
    height: 200
  },
  
  // Print/Export - High contrast
  'print': {
    lineType: 'linear',
    chartType: 'line',
    style: 'minimal',
    showGrid: true,
    showLegend: true,
    showTargetRanges: true,
    showAverages: true,
    showTrends: true,
    showDataTable: true,
    height: 400,
    colors: {
      primary: '#000000',
      secondary: '#333333',
      bloodPressureSystolic: '#000000',
      bloodPressureDiastolic: '#555555',
      grid: '#cccccc',
      text: '#000000',
      average: '#777777'
    }
  }
};

export const useChartConfiguration = (presetName?: string) => {
  const [configuration, setConfiguration] = useState<ChartConfiguration>(() => {
    const preset = presetName ? chartPresets[presetName] : {};
    return {
      ...defaultConfiguration,
      ...preset,
      colors: {
        ...defaultConfiguration.colors,
        ...preset.colors
      }
    };
  });

  const updateConfiguration = useCallback((updates: Partial<ChartConfiguration>) => {
    setConfiguration(prev => ({
      ...prev,
      ...updates,
      colors: {
        ...prev.colors,
        ...updates.colors
      }
    }));
  }, []);

  const loadPreset = useCallback((presetName: string) => {
    const preset = chartPresets[presetName];
    if (preset) {
      setConfiguration({
        ...defaultConfiguration,
        ...preset,
        colors: {
          ...defaultConfiguration.colors,
          ...preset.colors
        }
      });
    }
  }, []);

  const toggleLineType = useCallback(() => {
    setConfiguration(prev => ({
      ...prev,
      lineType: prev.lineType === 'monotone' ? 'linear' : 'monotone'
    }));
  }, []);

  const toggleChartType = useCallback(() => {
    setConfiguration(prev => ({
      ...prev,
      chartType: prev.chartType === 'line' ? 'bar' : 
                  prev.chartType === 'bar' ? 'area' :
                  prev.chartType === 'area' ? 'scatter' : 'line'
    }));
  }, []);

  const setLineType = useCallback((lineType: LineType) => {
    setConfiguration(prev => ({ ...prev, lineType }));
  }, []);

  const setChartType = useCallback((chartType: ChartType) => {
    setConfiguration(prev => ({ ...prev, chartType }));
  }, []);

  const setStyle = useCallback((style: ChartStyle) => {
    setConfiguration(prev => ({ ...prev, style }));
  }, []);

  return {
    configuration,
    updateConfiguration,
    loadPreset,
    toggleLineType,
    toggleChartType,
    setLineType,
    setChartType,
    setStyle,
    presets: chartPresets
  };
};

export default useChartConfiguration;