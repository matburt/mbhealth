import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';
import { subDays } from 'date-fns';
import { HealthData } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';

export type LineType = 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
export type ChartType = 'line' | 'bar' | 'area' | 'scatter';
export type ChartStyle = 'modern' | 'minimal' | 'clinical';

interface ChartConfiguration {
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

interface UnifiedHealthChartProps {
  data: HealthData[];
  metricType?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  configuration?: Partial<ChartConfiguration>;
  title?: string;
  subtitle?: string;
  onDataPointClick?: (data: HealthData) => void;
  onCreateAnalysis?: (selectedData: HealthData[]) => void;
}

const defaultConfiguration: ChartConfiguration = {
  lineType: 'monotone', // Curved lines by default
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

const stylePresets: Record<ChartStyle, Partial<ChartConfiguration>> = {
  modern: {
    showGrid: true,
    showLegend: true,
    colors: {
      primary: '#3b82f6',
      secondary: '#10b981',
      bloodPressureSystolic: '#ef4444',
      bloodPressureDiastolic: '#f97316',
      grid: '#f0f0f0',
      text: '#6b7280',
      average: '#9ca3af'
    }
  },
  minimal: {
    showGrid: false,
    showLegend: false,
    colors: {
      primary: '#374151',
      secondary: '#6b7280',
      bloodPressureSystolic: '#dc2626',
      bloodPressureDiastolic: '#ea580c',
      grid: '#f9fafb',
      text: '#9ca3af',
      average: '#d1d5db'
    }
  },
  clinical: {
    showGrid: true,
    showLegend: true,
    showTargetRanges: true,
    colors: {
      primary: '#059669',
      secondary: '#0d9488',
      bloodPressureSystolic: '#dc2626',
      bloodPressureDiastolic: '#ea580c',
      grid: '#ecfdf5',
      text: '#047857',
      average: '#6ee7b7'
    }
  }
};

const UnifiedHealthChart: React.FC<UnifiedHealthChartProps> = ({
  data,
  metricType,
  timeRange = '30d',
  configuration = {},
  title,
  subtitle,
  onDataPointClick,
  onCreateAnalysis
}) => {
  const { formatDateTime } = useTimezone();
  // Merge configuration with defaults and style presets
  const config: ChartConfiguration = useMemo(() => {
    const styleConfig = configuration.style ? stylePresets[configuration.style] : {};
    return {
      ...defaultConfiguration,
      ...styleConfig,
      ...configuration,
      colors: {
        ...defaultConfiguration.colors,
        ...styleConfig.colors,
        ...configuration.colors
      }
    };
  }, [configuration]);

  const [selectedDataPoints, setSelectedDataPoints] = useState<number[]>([]);

  // Filter data by metric type and time range
  const filteredData = useMemo(() => {
    let filtered = data;
    
    // Filter by metric type if specified
    if (metricType) {
      filtered = filtered.filter(item => item.metric_type === metricType);
    }
    
    // Filter by time range
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const cutoffDate = subDays(new Date(), days);
      filtered = filtered.filter(item => new Date(item.recorded_at) >= cutoffDate);
    }
    
    return filtered.sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
  }, [data, metricType, timeRange]);

  // Transform data for charts
  const chartData = useMemo(() => {
    return filteredData.map((item, index) => {
      const value = item.metric_type === 'blood_pressure' 
        ? ((item.systolic || 0) + (item.diastolic || 0)) / 2 
        : item.value;
      
      return {
        index,
        id: item.id,
        date: formatDateTime(item.recorded_at, 'datetime'),
        fullDate: item.recorded_at,
        value: value,
        systolic: item.systolic,
        diastolic: item.diastolic,
        unit: item.unit,
        metricType: item.metric_type,
        notes: item.notes,
        originalData: item
      };
    });
  }, [filteredData]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    if (metricType === 'blood_pressure') {
      const systolicValues = chartData.map(d => d.systolic).filter(v => v !== undefined);
      const diastolicValues = chartData.map(d => d.diastolic).filter(v => v !== undefined);
      
      if (systolicValues.length === 0 && diastolicValues.length === 0) return null;
      
      const sysAvg = systolicValues.length > 0 ? systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length : 0;
      const diaAvg = diastolicValues.length > 0 ? diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length : 0;
      const allValues = [...systolicValues, ...diastolicValues];
      const min = Math.min(...allValues);
      const max = Math.max(...allValues);
      
      return {
        avg: (sysAvg + diaAvg) / 2,
        min,
        max,
        systolicAvg: sysAvg,
        diastolicAvg: diaAvg,
        recentAvg: (sysAvg + diaAvg) / 2,
        trend: sysAvg > 120 || diaAvg > 80 ? 'up' : 'down'
      };
    } else {
      const values = chartData.map(d => d.value).filter(v => v !== undefined);
      if (values.length === 0) return null;
      
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const recent = values.slice(-5);
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      
      return { avg, min, max, recentAvg, trend: recentAvg > avg ? 'up' : 'down' };
    }
  }, [chartData, metricType]);

  // Get target ranges for clinical style
  const getTargetRanges = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return { min: 90, max: 140, optimal: { systolic: 120, diastolic: 80 } };
      case 'blood_sugar':
        return { min: 70, max: 140, optimal: 100 };
      case 'heart_rate':
        return { min: 60, max: 100, optimal: 80 };
      case 'temperature':
        return { min: 97, max: 99, optimal: 98.6 };
      default:
        return null;
    }
  };

  {const targetRanges = config.showTargetRanges ? getTargetRanges(metricType || '') : null;

  // Custom tooltip
  {const CustomTooltip = ({ active, payload, label }: unknown) => {
    if (active && payload && payload.length) {
      {const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          {data.metricType === 'blood_pressure' ? (
            <div>
              <p className="text-sm text-gray-600">
                Systolic: <span className="font-medium">{data.systolic} {data.unit}</span>
              </p>
              <p className="text-sm text-gray-600">
                Diastolic: <span className="font-medium">{data.diastolic} {data.unit}</span>
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              Value: <span className="font-medium">{data.value} {data.unit}</span>
            </p>
          )}
          {data.notes && (
            <p className="text-xs text-gray-500 mt-1">{data.notes}</p>
          )}
        </div>
      );
    }
    return null;
  };

  // Handle data point selection
  {const handleDataPointClick = (data: unknown) => {
    if (onDataPointClick) {
      onDataPointClick(data.originalData);
    }
    
    // Toggle selection for analysis
    {const pointId = data.id;
    setSelectedDataPoints(prev => 
      prev.includes(pointId) 
        ? prev.filter(id => id !== pointId)
        : [...prev, pointId]
    );
  };

  // Get selected data for analysis
  {const getSelectedData = () => {
    return filteredData.filter(item => selectedDataPoints.includes(item.id));
  };

  if (filteredData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">
          {metricType 
            ? `No ${metricType.replace('_', ' ')} data found for the selected time range.`
            : 'No health data found for the selected filters.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Chart Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">
            {title || `${metricType ? metricType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Health Data'} Chart`}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
          <p className="text-sm text-gray-600 mt-1">
            {filteredData.length} data points • {timeRange === 'all' ? 'All time' : `Last ${timeRange}`}
            {config.lineType === 'monotone' ? ' • Curved lines' : ' • Straight lines'}
          </p>
        </div>
        
        {/* Chart Controls */}
        <div className="flex items-center space-x-4">
          {onCreateAnalysis && selectedDataPoints.length > 0 && (
            <button
              onClick={() => onCreateAnalysis(getSelectedData())}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              Analyze Selected ({selectedDataPoints.length})
            </button>
          )}
          
          {/* Statistics */}
          {config.showTrends && stats && (
            <div className="flex space-x-4 text-sm">
              {metricType === 'blood_pressure' && 'systolicAvg' in stats && 'diastolicAvg' in stats ? (
                <>
                  <div className="text-center">
                    <p className="font-medium text-red-600">{(stats.systolicAvg || 0).toFixed(1)}</p>
                    <p className="text-gray-500">Sys Avg</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-orange-600">{(stats.diastolicAvg || 0).toFixed(1)}</p>
                    <p className="text-gray-500">Dia Avg</p>
                  </div>
                </>
              ) : (
                <div className="text-center">
                  <p className="font-medium text-gray-900">{stats.avg.toFixed(1)}</p>
                  <p className="text-gray-500">Average</p>
                </div>
              )}
              <div className="text-center">
                <p className={`font-medium ${stats.trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.trend === 'up' ? '↗' : '↘'}
                </p>
                <p className="text-gray-500">Trend</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: config.height }}>
        <ResponsiveContainer width="100%" height="100%">
          {config.chartType === 'line' ? (
            <LineChart data={chartData} onClick={handleDataPointClick}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={config.colors.grid} />}
              <XAxis 
                dataKey="date" 
                stroke={config.colors.text}
                fontSize={12}
              />
              <YAxis 
                stroke={config.colors.text}
                fontSize={12}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip content={<CustomTooltip />} />
              {config.showLegend && <Legend />}
              
              {metricType === 'blood_pressure' ? (
                <>
                  <Line 
                    type={config.lineType} 
                    dataKey="systolic" 
                    stroke={config.colors.bloodPressureSystolic} 
                    strokeWidth={2}
                    dot={{ 
                      fill: config.colors.bloodPressureSystolic, 
                      strokeWidth: 2, 
                      r: 4,
                      onClick: handleDataPointClick 
                    }}
                    activeDot={{ r: 6 }}
                    name="Systolic"
                  />
                  <Line 
                    type={config.lineType} 
                    dataKey="diastolic" 
                    stroke={config.colors.bloodPressureDiastolic} 
                    strokeWidth={2}
                    dot={{ 
                      fill: config.colors.bloodPressureDiastolic, 
                      strokeWidth: 2, 
                      r: 4,
                      onClick: handleDataPointClick 
                    }}
                    activeDot={{ r: 6 }}
                    name="Diastolic"
                  />
                </>
              ) : (
                <Line 
                  type={config.lineType} 
                  dataKey="value" 
                  stroke={config.colors.primary} 
                  strokeWidth={2}
                  dot={{ 
                    fill: config.colors.primary, 
                    strokeWidth: 2, 
                    r: 4,
                    onClick: handleDataPointClick 
                  }}
                  activeDot={{ r: 6 }}
                  name={metricType?.replace('_', ' ') || 'Value'}
                />
              )}
              
              {config.showAverages && stats && (
                <Line 
                  type="linear" 
                  dataKey={() => stats.avg} 
                  stroke={config.colors.average} 
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                  name="Average"
                />
              )}
            </LineChart>
          ) : config.chartType === 'bar' ? (
            <BarChart data={chartData}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={config.colors.grid} />}
              <XAxis dataKey="date" stroke={config.colors.text} fontSize={12} />
              <YAxis stroke={config.colors.text} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              {config.showLegend && <Legend />}
              
              {metricType === 'blood_pressure' ? (
                <>
                  <Bar dataKey="systolic" fill={config.colors.bloodPressureSystolic} radius={[4, 4, 0, 0]} name="Systolic" />
                  <Bar dataKey="diastolic" fill={config.colors.bloodPressureDiastolic} radius={[4, 4, 0, 0]} name="Diastolic" />
                </>
              ) : (
                <Bar dataKey="value" fill={config.colors.primary} radius={[4, 4, 0, 0]} name={metricType?.replace('_', ' ') || 'Value'} />
              )}
            </BarChart>
          ) : config.chartType === 'area' ? (
            <AreaChart data={chartData}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={config.colors.grid} />}
              <XAxis dataKey="date" stroke={config.colors.text} fontSize={12} />
              <YAxis stroke={config.colors.text} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              {config.showLegend && <Legend />}
              
              {metricType === 'blood_pressure' ? (
                <>
                  <Area 
                    type={config.lineType} 
                    dataKey="systolic" 
                    stackId="1"
                    stroke={config.colors.bloodPressureSystolic} 
                    fill={config.colors.bloodPressureSystolic}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Systolic"
                  />
                  <Area 
                    type={config.lineType} 
                    dataKey="diastolic" 
                    stackId="2"
                    stroke={config.colors.bloodPressureDiastolic} 
                    fill={config.colors.bloodPressureDiastolic}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    name="Diastolic"
                  />
                </>
              ) : (
                <Area 
                  type={config.lineType} 
                  dataKey="value" 
                  stroke={config.colors.primary} 
                  fill={config.colors.primary}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  name={metricType?.replace('_', ' ') || 'Value'}
                />
              )}
            </AreaChart>
          ) : config.chartType === 'scatter' ? (
            <ScatterChart data={chartData}>
              {config.showGrid && <CartesianGrid strokeDasharray="3 3" stroke={config.colors.grid} />}
              <XAxis dataKey="date" stroke={config.colors.text} fontSize={12} />
              <YAxis stroke={config.colors.text} fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              {config.showLegend && <Legend />}
              
              {metricType === 'blood_pressure' ? (
                <>
                  <Scatter dataKey="systolic" fill={config.colors.bloodPressureSystolic} name="Systolic" />
                  <Scatter dataKey="diastolic" fill={config.colors.bloodPressureDiastolic} name="Diastolic" />
                </>
              ) : (
                <Scatter dataKey="value" fill={config.colors.primary} name={metricType?.replace('_', ' ') || 'Value'} />
              )}
            </ScatterChart>
          ) : (
            <div />
          )}
        </ResponsiveContainer>
      </div>

      {/* Target Ranges */}
      {targetRanges && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Clinical Target Ranges</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Normal Range</p>
              <p className="font-medium">{targetRanges.min} - {targetRanges.max} {filteredData[0]?.unit}</p>
            </div>
            <div>
              <p className="text-gray-600">Optimal</p>
              <p className="font-medium">
                {targetRanges.optimal && typeof targetRanges.optimal === 'object'
                  ? `${targetRanges.optimal.systolic}/${targetRanges.optimal.diastolic}`
                  : targetRanges.optimal
                } {filteredData[0]?.unit}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Your Average</p>
              <p className="font-medium">{stats?.avg.toFixed(1)} {filteredData[0]?.unit}</p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {config.showDataTable && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Data Points</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Value</th>
                  {metricType === 'blood_pressure' && (
                    <>
                      <th className="text-left py-2 px-3">Systolic</th>
                      <th className="text-left py-2 px-3">Diastolic</th>
                    </>
                  )}
                  <th className="text-left py-2 px-3">Notes</th>
                  <th className="text-left py-2 px-3">Select</th>
                </tr>
              </thead>
              <tbody>
                {chartData.slice(-10).reverse().map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 px-3">{formatDateTime(item.fullDate, 'date')}</td>
                    <td className="py-2 px-3 font-medium">
                      {item.value?.toFixed(1)} {item.unit}
                    </td>
                    {metricType === 'blood_pressure' && (
                      <>
                        <td className="py-2 px-3">{item.systolic} {item.unit}</td>
                        <td className="py-2 px-3">{item.diastolic} {item.unit}</td>
                      </>
                    )}
                    <td className="py-2 px-3 text-gray-500">
                      {item.notes || '-'}
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="checkbox"
                        checked={selectedDataPoints.includes(item.id)}
                        onChange={() => handleDataPointClick(item)}
                        className="rounded"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedHealthChart;