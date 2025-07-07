import React, { useState, useMemo } from 'react';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ReferenceArea
} from 'recharts';
import { subDays } from 'date-fns';
import { HealthData } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';

interface DataVisualizationDashboardProps {
  data: HealthData[];
  timeRange?: '7d' | '30d' | '90d' | '1y' | 'all';
}

const DataVisualizationDashboard: React.FC<DataVisualizationDashboardProps> = ({
  data,
  timeRange = '30d'
}) => {
  const { formatDateTime } = useTimezone();
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'correlations' | 'analytics'>('overview');
  const [selectedChartType, setSelectedChartType] = useState<'line' | 'bar' | 'area' | 'scatter'>('line');

  // Filter data by time range
  const filteredData = useMemo(() => {
    if (timeRange === 'all') return data;
    
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const cutoffDate = subDays(new Date(), days);
    return data.filter(item => new Date(item.recorded_at) >= cutoffDate);
  }, [data, timeRange]);

  // Group data by metric type
  const dataByMetric = useMemo(() => {
    const grouped: Record<string, HealthData[]> = {};
    filteredData.forEach(item => {
      if (!grouped[item.metric_type]) {
        grouped[item.metric_type] = [];
      }
      grouped[item.metric_type].push(item);
    });
    return grouped;
  }, [filteredData]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const stats: Record<string, unknown> = {};
    
    Object.entries(dataByMetric).forEach(([metricType, metricData]) => {
      if (metricType === 'blood_pressure') {
        // Handle blood pressure separately for systolic and diastolic
        const systolicValues = metricData.map(d => d.systolic).filter(v => v !== undefined);
        const diastolicValues = metricData.map(d => d.diastolic).filter(v => v !== undefined);
        
        if (systolicValues.length > 0) {
          const sysAvg = systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length;
          const sysMin = Math.min(...systolicValues);
          const sysMax = Math.max(...systolicValues);
          const sysRecent = systolicValues.slice(-5);
          const sysRecentAvg = sysRecent.reduce((sum, val) => sum + val, 0) / sysRecent.length;
          
          stats['blood_pressure_systolic'] = {
            count: systolicValues.length,
            average: sysAvg,
            min: sysMin,
            max: sysMax,
            recentAverage: sysRecentAvg,
            trend: sysRecentAvg > sysAvg ? 'up' : 'down',
            unit: metricData[0]?.unit || 'mmHg'
          };
        }
        
        if (diastolicValues.length > 0) {
          const diaAvg = diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length;
          const diaMin = Math.min(...diastolicValues);
          const diaMax = Math.max(...diastolicValues);
          const diaRecent = diastolicValues.slice(-5);
          const diaRecentAvg = diaRecent.reduce((sum, val) => sum + val, 0) / diaRecent.length;
          
          stats['blood_pressure_diastolic'] = {
            count: diastolicValues.length,
            average: diaAvg,
            min: diaMin,
            max: diaMax,
            recentAverage: diaRecentAvg,
            trend: diaRecentAvg > diaAvg ? 'up' : 'down',
            unit: metricData[0]?.unit || 'mmHg'
          };
        }
      } else {
        const values = metricData.map(d => d.value).filter(v => v !== undefined);
        if (values.length === 0) return;
        
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const recent = values.slice(-5);
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        
        stats[metricType] = {
          count: values.length,
          average: avg,
          min,
          max,
          recentAverage: recentAvg,
          trend: recentAvg > avg ? 'up' : 'down',
          unit: metricData[0]?.unit || ''
        };
      }
    });
    
    return stats;
  }, [dataByMetric]);

  // Prepare data for correlation analysis
  const correlationData = useMemo(() => {
    const metrics = Object.keys(dataByMetric);
    if (metrics.length < 2) return [];
    
    // Create daily averages for each metric
    const dailyData: Record<string, Record<string, number>> = {};
    
    metrics.forEach(metric => {
      const metricData = dataByMetric[metric];
      metricData.forEach(item => {
        const date = formatDateTime(item.recorded_at, 'date');
        if (!dailyData[date]) dailyData[date] = {};
        
        if (metric === 'blood_pressure') {
          // Handle blood pressure with separate systolic and diastolic
          if (item.systolic !== undefined) {
            if (!dailyData[date]['blood_pressure_systolic']) dailyData[date]['blood_pressure_systolic'] = 0;
            dailyData[date]['blood_pressure_systolic'] += item.systolic;
          }
          if (item.diastolic !== undefined) {
            if (!dailyData[date]['blood_pressure_diastolic']) dailyData[date]['blood_pressure_diastolic'] = 0;
            dailyData[date]['blood_pressure_diastolic'] += item.diastolic;
          }
        } else {
          if (!dailyData[date][metric]) dailyData[date][metric] = 0;
          dailyData[date][metric] += item.value || 0;
        }
      });
    });
    
    // Convert to array format for correlation analysis
    return Object.entries(dailyData).map(([date, values]) => ({
      date,
      ...values
    }));
  }, [dataByMetric]);

  // Color schemes
  const getMetricColor = (metricType: string) => {
    const colors: Record<string, string> = {
      blood_pressure: '#ef4444',
      blood_pressure_systolic: '#ef4444',
      blood_pressure_diastolic: '#f97316',
      blood_sugar: '#f59e0b',
      weight: '#10b981',
      heart_rate: '#3b82f6',
      temperature: '#8b5cf6',
      cholesterol: '#ec4899',
      oxygen_saturation: '#06b6d4'
    };
    return colors[metricType] || '#6b7280';
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const dataKey = data.dataKey;
      const name = data.name;
      const value = data.value;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-gray-600">
            {name}: <span className="font-medium">{value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Overview tab content
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(summaryStats).map(([metricType, stats]) => {
          let displayName = metricType.replace('_', ' ');
          if (metricType === 'blood_pressure_systolic') {
            displayName = 'Systolic BP';
          } else if (metricType === 'blood_pressure_diastolic') {
            displayName = 'Diastolic BP';
          }
          
          return (
            <div key={metricType} className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 capitalize">
                    {displayName}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.average.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-500">{stats.unit}</p>
                </div>
                <div className={`text-2xl ${stats.trend === 'up' ? 'text-red-500' : 'text-green-500'}`}>
                  {stats.trend === 'up' ? '↗' : '↘'}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {stats.count} readings • Range: {stats.min.toFixed(1)} - {stats.max.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Combined Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Metrics Overview</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={correlationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickFormatter={(value) => formatDateTime(value, 'date')}
              />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {Object.keys(dataByMetric).map((metricType) => {
                if (metricType === 'blood_pressure') {
                  return [
                    <Line
                      key="blood_pressure_systolic"
                      type="monotone"
                      dataKey="blood_pressure_systolic"
                      stroke={getMetricColor('blood_pressure_systolic')}
                      strokeWidth={2}
                      dot={{ fill: getMetricColor('blood_pressure_systolic'), strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Systolic BP"
                    />,
                    <Line
                      key="blood_pressure_diastolic"
                      type="monotone"
                      dataKey="blood_pressure_diastolic"
                      stroke={getMetricColor('blood_pressure_diastolic')}
                      strokeWidth={2}
                      dot={{ fill: getMetricColor('blood_pressure_diastolic'), strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Diastolic BP"
                    />
                  ];
                }
                return (
                  <Line
                    key={metricType}
                    type="monotone"
                    dataKey={metricType}
                    stroke={getMetricColor(metricType)}
                    strokeWidth={2}
                    dot={{ fill: getMetricColor(metricType), strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5 }}
                    name={metricType.replace('_', ' ')}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Trends tab content
  const renderTrends = () => (
    <div className="space-y-6">
      {/* Chart Type Selector */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Chart Type:</label>
          <div className="flex space-x-2">
            {(['line', 'bar', 'area', 'scatter'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedChartType(type)}
                className={`px-3 py-1 text-sm rounded-md ${
                  selectedChartType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Individual Metric Charts */}
      {Object.entries(dataByMetric).map(([metricType, metricData]) => {
        const chartData = metricData
          .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
          .map(item => ({
            date: formatDateTime(item.recorded_at, 'datetime'),
            value: item.value,
            systolic: item.systolic,
            diastolic: item.diastolic,
            unit: item.unit
          }));

        return (
          <div key={metricType} className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
              {metricType.replace('_', ' ')} Trend
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {selectedChartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    {/* Clinical Range Indicators */}
                    {(() => {
                      const targetRanges = getTargetRanges(metricType);
                      if (targetRanges && metricType === 'blood_pressure') {
                        return (
                          <>
                            <ReferenceArea
                              y1={targetRanges.systolic.min}
                              y2={targetRanges.systolic.max}
                              fill="#10b981"
                              fillOpacity={0.1}
                              stroke="#10b981"
                              strokeOpacity={0.3}
                            />
                            <ReferenceArea
                              y1={targetRanges.diastolic.min}
                              y2={targetRanges.diastolic.max}
                              fill="#10b981"
                              fillOpacity={0.1}
                              stroke="#10b981"
                              strokeOpacity={0.3}
                            />
                          </>
                        );
                      }
                      if (targetRanges && metricType === 'blood_sugar' && 'normal' in targetRanges) {
                        return (
                          <ReferenceArea
                            y1={(targetRanges as any).normal.min}
                            y2={(targetRanges as any).normal.max}
                            fill="#10b981"
                            fillOpacity={0.15}
                            stroke="#10b981"
                            strokeOpacity={0.4}
                          />
                        );
                      }
                      return null;
                    })()}
                    
                    {metricType === 'blood_pressure' ? (
                      <>
                        <Line
                          type="monotone"
                          dataKey="systolic"
                          stroke={getMetricColor('blood_pressure_systolic')}
                          strokeWidth={2}
                          dot={{ fill: getMetricColor('blood_pressure_systolic'), strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Systolic"
                        />
                        <Line
                          type="monotone"
                          dataKey="diastolic"
                          stroke={getMetricColor('blood_pressure_diastolic')}
                          strokeWidth={2}
                          dot={{ fill: getMetricColor('blood_pressure_diastolic'), strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                          name="Diastolic"
                        />
                      </>
                    ) : (
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={getMetricColor(metricType)}
                        strokeWidth={2}
                        dot={{ fill: getMetricColor(metricType), strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                        name={metricType.replace('_', ' ')}
                      />
                    )}
                  </LineChart>
                ) : selectedChartType === 'bar' ? (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {metricType === 'blood_pressure' ? (
                      <>
                        <Bar
                          dataKey="systolic"
                          fill={getMetricColor('blood_pressure_systolic')}
                          radius={[4, 4, 0, 0]}
                          name="Systolic"
                        />
                        <Bar
                          dataKey="diastolic"
                          fill={getMetricColor('blood_pressure_diastolic')}
                          radius={[4, 4, 0, 0]}
                          name="Diastolic"
                        />
                      </>
                    ) : (
                      <Bar
                        dataKey="value"
                        fill={getMetricColor(metricType)}
                        radius={[4, 4, 0, 0]}
                        name={metricType.replace('_', ' ')}
                      />
                    )}
                  </BarChart>
                ) : selectedChartType === 'area' ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {metricType === 'blood_pressure' ? (
                      <>
                        <Area
                          type="monotone"
                          dataKey="systolic"
                          stackId="1"
                          stroke={getMetricColor('blood_pressure_systolic')}
                          fill={getMetricColor('blood_pressure_systolic')}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          name="Systolic"
                        />
                        <Area
                          type="monotone"
                          dataKey="diastolic"
                          stackId="2"
                          stroke={getMetricColor('blood_pressure_diastolic')}
                          fill={getMetricColor('blood_pressure_diastolic')}
                          fillOpacity={0.3}
                          strokeWidth={2}
                          name="Diastolic"
                        />
                      </>
                    ) : (
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={getMetricColor(metricType)}
                        fill={getMetricColor(metricType)}
                        fillOpacity={0.3}
                        strokeWidth={2}
                        name={metricType.replace('_', ' ')}
                      />
                    )}
                  </AreaChart>
                ) : selectedChartType === 'scatter' ? (
                  <ScatterChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {metricType === 'blood_pressure' ? (
                      <>
                        <Scatter
                          dataKey="systolic"
                          fill={getMetricColor('blood_pressure_systolic')}
                          stroke={getMetricColor('blood_pressure_systolic')}
                          name="Systolic"
                        />
                        <Scatter
                          dataKey="diastolic"
                          fill={getMetricColor('blood_pressure_diastolic')}
                          stroke={getMetricColor('blood_pressure_diastolic')}
                          name="Diastolic"
                        />
                      </>
                    ) : (
                      <Scatter
                        dataKey="value"
                        fill={getMetricColor(metricType)}
                        stroke={getMetricColor(metricType)}
                        name={metricType.replace('_', ' ')}
                      />
                    )}
                  </ScatterChart>
                ) : (
                  <div />
                )}
              </ResponsiveContainer>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Correlations tab content
  const renderCorrelations = () => {
    if (Object.keys(dataByMetric).length < 2) {
      return (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Insufficient Data</h3>
          <p className="text-gray-500">
            Need at least 2 different metric types to analyze correlations.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Correlation Matrix */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metric Correlations</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Metric</th>
                  {Object.keys(dataByMetric).map((metric) => (
                    <th key={metric} className="px-4 py-2 text-center text-sm font-medium text-gray-700 capitalize">
                      {metric.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.keys(dataByMetric).map((metric1) => (
                  <tr key={metric1}>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900 capitalize">
                      {metric1.replace('_', ' ')}
                    </td>
                    {Object.keys(dataByMetric).map((metric2) => {
                      const correlation = calculateCorrelation(metric1, metric2);
                      return (
                        <td key={metric2} className="px-4 py-2 text-center">
                          <span className={`text-sm font-medium ${
                            correlation > 0.7 ? 'text-green-600' :
                            correlation > 0.3 ? 'text-yellow-600' :
                            correlation > -0.3 ? 'text-gray-600' :
                            correlation > -0.7 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {correlation.toFixed(2)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scatter Plot Matrix */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scatter Plot Matrix</h3>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={correlationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey={Object.keys(dataByMetric)[0]} 
                  stroke="#6b7280" 
                  fontSize={12}
                />
                <YAxis 
                  dataKey={Object.keys(dataByMetric)[1]} 
                  stroke="#6b7280" 
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  dataKey={Object.keys(dataByMetric)[1]}
                  fill={getMetricColor(Object.keys(dataByMetric)[0])}
                  stroke={getMetricColor(Object.keys(dataByMetric)[0])}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Analytics tab content
  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Distribution Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(dataByMetric).map(([metricType, metricData]) => {
          const values = metricData.map(d => d.value).filter(v => v !== undefined);
          const distribution = calculateDistribution(values);
          
          return (
            <div key={metricType} className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                {metricType.replace('_', ' ')} Distribution
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="range" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="count"
                      fill={getMetricColor(metricType)}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Health Score Radar Chart */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Score Overview</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={calculateHealthScores()}>
              <PolarGrid stroke="#f0f0f0" />
              <PolarAngleAxis dataKey="metric" stroke="#6b7280" fontSize={12} />
              <PolarRadiusAxis stroke="#6b7280" fontSize={12} />
              <Radar
                name="Health Score"
                dataKey="score"
                stroke={getMetricColor('blood_pressure')}
                fill={getMetricColor('blood_pressure')}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );

  // Helper functions
  const calculateCorrelation = (metric1: string, metric2: string): number => {
    if (metric1 === metric2) return 1;
    
    const data1 = correlationData.map(d => (d as any)[metric1]).filter(v => v !== undefined);
    const data2 = correlationData.map(d => (d as any)[metric2]).filter(v => v !== undefined);
    
    if (data1.length !== data2.length || data1.length === 0) return 0;
    
    const n = data1.length;
    const sum1 = data1.reduce((a, b) => a + b, 0);
    const sum2 = data2.reduce((a, b) => a + b, 0);
    const sum1Sq = data1.reduce((a, b) => a + b * b, 0);
    const sum2Sq = data2.reduce((a, b) => a + b * b, 0);
    const pSum = data1.reduce((a, b, i) => a + b * data2[i], 0);
    
    const num = pSum - (sum1 * sum2 / n);
    const den = Math.sqrt((sum1Sq - sum1 * sum1 / n) * (sum2Sq - sum2 * sum2 / n));
    
    return den === 0 ? 0 : num / den;
  };

  const calculateDistribution = (values: number[]) => {
    if (values.length === 0) return [];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const bucketCount = 5;
    const bucketSize = range / bucketCount;
    
    const buckets = Array(bucketCount).fill(0);
    values.forEach(value => {
      const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), bucketCount - 1);
      buckets[bucketIndex]++;
    });
    
    return buckets.map((count, index) => ({
      range: `${(min + index * bucketSize).toFixed(1)} - ${(min + (index + 1) * bucketSize).toFixed(1)}`,
      count
    }));
  };

  const calculateHealthScores = () => {
    return Object.entries(summaryStats).map(([metricType, stats]) => {
      // Simple scoring algorithm - can be enhanced
      let score = 100;
      if (stats.trend === 'up' && ['blood_pressure', 'blood_sugar', 'weight'].includes(metricType)) {
        score -= 20;
      } else if (stats.trend === 'down' && ['weight'].includes(metricType)) {
        score += 20;
      }
      
      return {
        metric: metricType.replace('_', ' '),
        score: Math.max(0, Math.min(100, score))
      };
    });
  };

  // Get target ranges for clinical indicators
  const getTargetRanges = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return { 
          systolic: { min: 90, max: 119 }, 
          diastolic: { min: 60, max: 79 }
        };
      case 'blood_sugar':
        return { 
          normal: { min: 70, max: 99 }
        };
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'trends', label: 'Trends' },
              { id: 'correlations', label: 'Correlations' },
              { id: 'analytics', label: 'Analytics' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'trends' && renderTrends()}
        {activeTab === 'correlations' && renderCorrelations()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>
    </div>
  );
};

export default DataVisualizationDashboard; 