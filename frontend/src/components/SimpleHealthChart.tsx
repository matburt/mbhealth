import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { HealthData } from '../types/health';

interface SimpleHealthChartProps {
  data: HealthData[];
  metricType?: string;
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
  showTrends?: boolean;
  showAverages?: boolean;
}

const SimpleHealthChart: React.FC<SimpleHealthChartProps> = ({
  data,
  metricType,
  timeRange = '30d',
  showTrends = true,
  showAverages = true
}) => {
  // Filter and process data
  const processedData = useMemo(() => {
    let filtered = data;
    
    // Filter by metric type if specified
    if (metricType) {
      filtered = filtered.filter(item => item.metric_type === metricType);
    }
    
    // Filter by time range
    if (timeRange !== 'all') {
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(item => new Date(item.recorded_at) >= cutoffDate);
    }
    
    return filtered
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(item => ({
        date: new Date(item.recorded_at),
        value: item.value,
        systolic: item.systolic,
        diastolic: item.diastolic,
        unit: item.unit,
        notes: item.notes
      }));
  }, [data, metricType, timeRange]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (processedData.length === 0) return null;
    
    const values = processedData.map(d => d.value).filter(v => v !== undefined);
    if (values.length === 0) return null;
    
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const recent = values.slice(-5);
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
    
    return { avg, min, max, recentAvg, trend: recentAvg > avg ? 'up' : 'down' };
  }, [processedData]);

  // Chart dimensions
  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 40, left: 60 };

  // Calculate scales
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const xScale = (date: Date) => {
    if (processedData.length === 0) return 0;
    const timeRange = processedData[processedData.length - 1].date.getTime() - processedData[0].date.getTime();
    const timePosition = date.getTime() - processedData[0].date.getTime();
    return (timePosition / timeRange) * chartWidth;
  };

  const yScale = (value: number) => {
    if (!stats) return 0;
    const range = stats.max - stats.min;
    const position = value - stats.min;
    return chartHeight - (position / range) * chartHeight;
  };

  // Generate path for line chart
  const generatePath = () => {
    if (processedData.length === 0) return '';
    
    const points = processedData.map((item, index) => {
      const x = xScale(item.date);
      const y = yScale(item.value || 0);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    
    return points.join(' ');
  };

  // Generate average line path
  const generateAveragePath = () => {
    if (!stats || processedData.length === 0) return '';
    
    const startX = 0;
    const endX = chartWidth;
    const avgY = yScale(stats.avg);
    
    return `M ${startX} ${avgY} L ${endX} ${avgY}`;
  };

  if (processedData.length === 0) {
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
            {processedData.length} data points • {timeRange === 'all' ? 'All time' : `Last ${timeRange}`}
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
      <div className="overflow-x-auto">
        <svg width={width} height={height} className="mx-auto">
          {/* Background */}
          <rect width={width} height={height} fill="#f9fafb" />
          
          {/* Chart area */}
          <g transform={`translate(${margin.left}, ${margin.top})`}>
            {/* Grid lines */}
            {stats && Array.from({ length: 5 }, (_, i) => {
              const y = (i / 4) * chartHeight;
              const value = stats.max - (i / 4) * (stats.max - stats.min);
              return (
                <g key={i}>
                  <line
                    x1={0}
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={-10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={12}
                    fill="#6b7280"
                  >
                    {value.toFixed(1)}
                  </text>
                </g>
              );
            })}
            
            {/* X-axis labels */}
            {processedData.length > 0 && Array.from({ length: Math.min(6, processedData.length) }, (_, i) => {
              const index = Math.floor((i / 5) * (processedData.length - 1));
              const item = processedData[index];
              const x = xScale(item.date);
              return (
                <text
                  key={i}
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#6b7280"
                >
                  {format(item.date, 'MMM dd')}
                </text>
              );
            })}
            
            {/* Average line */}
            {showAverages && stats && (
              <path
                d={generateAveragePath()}
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="5,5"
                fill="none"
              />
            )}
            
            {/* Data line */}
            <path
              d={generatePath()}
              stroke="#3b82f6"
              strokeWidth={3}
              fill="none"
            />
            
            {/* Data points */}
            {processedData.map((item, index) => {
              const x = xScale(item.date);
              const y = yScale(item.value || 0);
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={4}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth={2}
                />
              );
            })}
          </g>
        </svg>
      </div>

      {/* Data Table */}
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
              </tr>
            </thead>
            <tbody>
              {processedData.slice(-10).reverse().map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-2 px-3">{format(item.date, 'MMM dd, yyyy')}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SimpleHealthChart; 