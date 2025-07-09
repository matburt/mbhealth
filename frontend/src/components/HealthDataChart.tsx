import React, { useMemo } from 'react';
import { formatHealthValue } from '../utils/formatters';
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
  Scatter,
  ReferenceArea
} from 'recharts';
import { subDays } from 'date-fns';
import { HealthData } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';
import { useAuth } from '../contexts/AuthContext';
import { createUnitConverter, shouldConvertMetric } from '../utils/units';

interface HealthDataChartProps {
  data: HealthData[];
  metricType?: string;
  chartType?: 'line' | 'bar' | 'area' | 'scatter';
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  showTrends?: boolean;
  showAverages?: boolean;
  showTargets?: boolean;
}

const HealthDataChart: React.FC<HealthDataChartProps> = ({
  data,
  metricType,
  chartType = 'line',
  timeRange = '30d',
  showTrends = true,
  showAverages = true,
  showTargets = false
}) => {
  const { formatDateTime } = useTimezone();
  const { user } = useAuth();
  
  // Create unit converter based on user preferences
  const unitConverter = useMemo(() => user ? createUnitConverter(user) : null, [user]);
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
    return filteredData.map(item => {
      let value = item.metric_type === 'blood_pressure' 
        ? ((item.systolic || 0) + (item.diastolic || 0)) / 2 
        : item.value;
      
      let displayUnit = item.unit;
      
      // Convert to user's preferred units if applicable
      if (unitConverter && shouldConvertMetric(item.metric_type) && item.value !== null) {
        const converted = unitConverter.convertToUserUnits(item.value, item.metric_type, item.unit);
        value = item.metric_type === 'blood_pressure' 
          ? ((item.systolic || 0) + (item.diastolic || 0)) / 2  // Don't convert BP
          : converted.value;
        displayUnit = item.metric_type === 'blood_pressure' ? item.unit : converted.unit;
      }
      
      return {
        date: formatDateTime(item.recorded_at, 'datetime'),
        fullDate: item.recorded_at,
        value: value,
        systolic: item.systolic,
        diastolic: item.diastolic,
        unit: displayUnit,
        originalUnit: item.unit,
        metricType: item.metric_type,
        notes: item.notes
      };
    });
  }, [filteredData, unitConverter, formatDateTime]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const values = chartData.map(d => d.value).filter(v => v !== undefined);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const recent = values.slice(-5);
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    return { avg, min, max, recentAvg, trend: recentAvg > avg ? 'up' : 'down' };
  }, [chartData]);

  // Color schemes
  const getMetricColor = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return '#ef4444';
      case 'blood_sugar':
        return '#f59e0b';
      case 'weight':
        return '#10b981';
      case 'heart_rate':
        return '#3b82f6';
      case 'temperature':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  const getTargetRanges = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return { 
          systolic: { min: 90, max: 119, optimal: 120 }, 
          diastolic: { min: 60, max: 79, optimal: 80 },
          // Legacy format for display compatibility
          min: 90, max: 140, optimal: { systolic: 120, diastolic: 80 }
        };
      case 'blood_sugar':
        return { 
          normal: { min: 70, max: 99 },
          // Legacy format for display compatibility  
          min: 70, max: 140, optimal: 100
        };
      case 'heart_rate':
        return { min: 60, max: 100, optimal: 80 };
      case 'temperature':
        return { min: 97, max: 99, optimal: 98.6 };
      default:
        return null;
    }
  };

  const targetRanges = getTargetRanges(metricType || '');
  const metricColor = getMetricColor(metricType || '');

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
              Value: <span className="font-medium">{formatHealthValue(data.value)} {data.unit}</span>
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 capitalize">
            {metricType ? metricType.replace('_', ' ') : 'Health Data'} Trends
          </h3>
          <p className="text-sm text-gray-600">
            {filteredData.length} data points • {timeRange === 'all' ? 'All time' : `Last ${timeRange}`}
          </p>
        </div>
        
        {/* Statistics */}
        {stats && (
          <div className="flex space-x-4 text-sm">
            <div className="text-center">
              <p className="font-medium text-gray-900">{stats.avg.toFixed(1)}</p>
              <p className="text-gray-500">Average</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">{stats.min.toFixed(1)}</p>
              <p className="text-gray-500">Min</p>
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">{stats.max.toFixed(1)}</p>
              <p className="text-gray-500">Max</p>
            </div>
            {showTrends && (
              <div className="text-center">
                <p className={`font-medium ${stats.trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.trend === 'up' ? '↗' : '↘'}
                </p>
                <p className="text-gray-500">Trend</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
                domain={['dataMin - 10', 'dataMax + 10']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Clinical Range Indicators */}
              {targetRanges && metricType === 'blood_pressure' && 'systolic' in targetRanges && 'diastolic' in targetRanges && (
                <>
                  <ReferenceArea
                    y1={(targetRanges as any).systolic.min}
                    y2={(targetRanges as any).systolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                  <ReferenceArea
                    y1={(targetRanges as any).diastolic.min}
                    y2={(targetRanges as any).diastolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                </>
              )}
              
              {targetRanges && metricType === 'blood_sugar' && 'normal' in targetRanges && (
                <ReferenceArea
                  y1={(targetRanges as any).normal.min}
                  y2={(targetRanges as any).normal.max}
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeOpacity={0.4}
                />
              )}
              
              {metricType === 'blood_pressure' ? (
                <>
                  <Line 
                    type="monotone" 
                    dataKey="systolic" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Systolic"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="diastolic" 
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Diastolic"
                  />
                </>
              ) : (
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={metricColor} 
                  strokeWidth={2}
                  dot={{ fill: metricColor, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
              {showAverages && stats && (
                <Line 
                  type="monotone" 
                  dataKey={() => stats.avg} 
                  stroke="#9ca3af" 
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              )}
            </LineChart>
          ) : chartType === 'bar' ? (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Clinical Range Indicators */}
              {targetRanges && metricType === 'blood_pressure' && 'systolic' in targetRanges && 'diastolic' in targetRanges && (
                <>
                  <ReferenceArea
                    y1={(targetRanges as any).systolic.min}
                    y2={(targetRanges as any).systolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                  <ReferenceArea
                    y1={(targetRanges as any).diastolic.min}
                    y2={(targetRanges as any).diastolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                </>
              )}
              
              {targetRanges && metricType === 'blood_sugar' && 'normal' in targetRanges && (
                <ReferenceArea
                  y1={(targetRanges as any).normal.min}
                  y2={(targetRanges as any).normal.max}
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeOpacity={0.4}
                />
              )}
              
              <Bar 
                dataKey="value" 
                fill={metricColor}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : chartType === 'area' ? (
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Clinical Range Indicators */}
              {targetRanges && metricType === 'blood_pressure' && 'systolic' in targetRanges && 'diastolic' in targetRanges && (
                <>
                  <ReferenceArea
                    y1={(targetRanges as any).systolic.min}
                    y2={(targetRanges as any).systolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                  <ReferenceArea
                    y1={(targetRanges as any).diastolic.min}
                    y2={(targetRanges as any).diastolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                </>
              )}
              
              {targetRanges && metricType === 'blood_sugar' && 'normal' in targetRanges && (
                <ReferenceArea
                  y1={(targetRanges as any).normal.min}
                  y2={(targetRanges as any).normal.max}
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeOpacity={0.4}
                />
              )}
              
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={metricColor} 
                fill={metricColor}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          ) : chartType === 'scatter' ? (
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6b7280"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Clinical Range Indicators */}
              {targetRanges && metricType === 'blood_pressure' && 'systolic' in targetRanges && 'diastolic' in targetRanges && (
                <>
                  <ReferenceArea
                    y1={(targetRanges as any).systolic.min}
                    y2={(targetRanges as any).systolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                  <ReferenceArea
                    y1={(targetRanges as any).diastolic.min}
                    y2={(targetRanges as any).diastolic.max}
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeOpacity={0.3}
                  />
                </>
              )}
              
              {targetRanges && metricType === 'blood_sugar' && 'normal' in targetRanges && (
                <ReferenceArea
                  y1={(targetRanges as any).normal.min}
                  y2={(targetRanges as any).normal.max}
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeOpacity={0.4}
                />
              )}
              
              <Scatter 
                dataKey="value" 
                fill={metricColor}
                stroke={metricColor}
              />
            </ScatterChart>
          ) : (
            <div />
          )}
        </ResponsiveContainer>
      </div>

      {/* Target Ranges */}
      {showTargets && targetRanges && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Target Ranges</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Normal Range</p>
              <p className="font-medium">{targetRanges.min} - {targetRanges.max} {filteredData[0]?.unit}</p>
            </div>
            <div>
              <p className="text-gray-600">Optimal</p>
              <p className="font-medium">
                {targetRanges.optimal && typeof targetRanges.optimal === 'object'
                  ? `${(targetRanges.optimal as any).systolic}/${(targetRanges.optimal as any).diastolic}`
                  : String(targetRanges.optimal)
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
    </div>
  );
};

export default HealthDataChart; 