import React, { useMemo } from 'react';
import { HealthData } from '../types/health';
import { calculateTrend, detectAnomalies, filterByTimeOfDay } from '../utils/dataAnalysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface EnhancedBloodPressureInsightsProps {
  data: HealthData[];
}

interface BloodPressureCategory {
  category: string;
  systolicRange: string;
  diastolicRange: string;
  color: string;
  count: number;
  description: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
}

const EnhancedBloodPressureInsights: React.FC<EnhancedBloodPressureInsightsProps> = ({ data }) => {
  // Filter blood pressure data
  const bpData = useMemo(() => {
    return data.filter(d => d.metric_type === 'blood_pressure' && d.systolic && d.diastolic);
  }, [data]);

  // Enhanced analytics
  const analytics = useMemo(() => {
    if (bpData.length === 0) return null;

    // Basic statistics
    const systolicValues = bpData.map(d => d.systolic!);
    const diastolicValues = bpData.map(d => d.diastolic!);
    const pulsePressures = bpData.map(d => d.systolic! - d.diastolic!);

    const systolicAvg = systolicValues.reduce((sum, val) => sum + val, 0) / systolicValues.length;
    const diastolicAvg = diastolicValues.reduce((sum, val) => sum + val, 0) / diastolicValues.length;
    const pulsePressureAvg = pulsePressures.reduce((sum, val) => sum + val, 0) / pulsePressures.length;

    // Trend analysis
    const systolicTrend = calculateTrend(bpData.map(d => ({ ...d, value: d.systolic })));
    const diastolicTrend = calculateTrend(bpData.map(d => ({ ...d, value: d.diastolic })));

    // Variability analysis
    const systolicStd = Math.sqrt(systolicValues.reduce((sum, val) => sum + Math.pow(val - systolicAvg, 2), 0) / systolicValues.length);
    const diastolicStd = Math.sqrt(diastolicValues.reduce((sum, val) => sum + Math.pow(val - diastolicAvg, 2), 0) / diastolicValues.length);

    // Time of day analysis
    const morningBP = filterByTimeOfDay(bpData, 'morning');
    const afternoonBP = filterByTimeOfDay(bpData, 'afternoon');
    const eveningBP = filterByTimeOfDay(bpData, 'evening');

    const morningAvg = morningBP.length > 0 ? {
      systolic: morningBP.reduce((sum, d) => sum + d.systolic!, 0) / morningBP.length,
      diastolic: morningBP.reduce((sum, d) => sum + d.diastolic!, 0) / morningBP.length
    } : null;

    const afternoonAvg = afternoonBP.length > 0 ? {
      systolic: afternoonBP.reduce((sum, d) => sum + d.systolic!, 0) / afternoonBP.length,
      diastolic: afternoonBP.reduce((sum, d) => sum + d.diastolic!, 0) / afternoonBP.length
    } : null;

    const eveningAvg = eveningBP.length > 0 ? {
      systolic: eveningBP.reduce((sum, d) => sum + d.systolic!, 0) / eveningBP.length,
      diastolic: eveningBP.reduce((sum, d) => sum + d.diastolic!, 0) / eveningBP.length
    } : null;

    // Anomaly detection
    const anomalies = detectAnomalies(bpData);
    const anomalousReadings = bpData.filter(d => anomalies.get(d.id)?.isAnomaly);

    return {
      totalReadings: bpData.length,
      systolicAvg,
      diastolicAvg,
      pulsePressureAvg,
      systolicTrend,
      diastolicTrend,
      systolicVariability: systolicStd,
      diastolicVariability: diastolicStd,
      timeOfDay: {
        morning: { count: morningBP.length, avg: morningAvg },
        afternoon: { count: afternoonBP.length, avg: afternoonAvg },
        evening: { count: eveningBP.length, avg: eveningAvg }
      },
      anomalousReadings: anomalousReadings.length
    };
  }, [bpData]);

  // Blood pressure categorization
  const categories = useMemo(() => {
    if (bpData.length === 0) return [];

    const categorizeReading = (systolic: number, diastolic: number): BloodPressureCategory => {
      if (systolic < 120 && diastolic < 80) {
        return {
          category: 'Normal',
          systolicRange: '<120',
          diastolicRange: '<80',
          color: '#10b981',
          count: 0,
          description: 'Optimal blood pressure',
          riskLevel: 'low'
        };
      } else if (systolic >= 120 && systolic <= 129 && diastolic < 80) {
        return {
          category: 'Elevated',
          systolicRange: '120-129',
          diastolicRange: '<80',
          color: '#f59e0b',
          count: 0,
          description: 'Slightly elevated, lifestyle changes recommended',
          riskLevel: 'moderate'
        };
      } else if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) {
        return {
          category: 'Stage 1 Hypertension',
          systolicRange: '130-139',
          diastolicRange: '80-89',
          color: '#f97316',
          count: 0,
          description: 'High blood pressure, medical consultation recommended',
          riskLevel: 'high'
        };
      } else if (systolic >= 140 || diastolic >= 90) {
        return {
          category: 'Stage 2 Hypertension',
          systolicRange: '≥140',
          diastolicRange: '≥90',
          color: '#ef4444',
          count: 0,
          description: 'Very high blood pressure, immediate medical attention needed',
          riskLevel: 'very-high'
        };
      } else {
        return {
          category: 'Hypertensive Crisis',
          systolicRange: '>180',
          diastolicRange: '>120',
          color: '#dc2626',
          count: 0,
          description: 'Emergency medical attention required',
          riskLevel: 'very-high'
        };
      }
    };

    const categoryMap = new Map<string, BloodPressureCategory>();

    bpData.forEach(d => {
      const category = categorizeReading(d.systolic!, d.diastolic!);
      const existing = categoryMap.get(category.category);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(category.category, { ...category, count: 1 });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  }, [bpData]);

  // Time of day chart data
  const timeOfDayChartData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      {
        time: 'Morning',
        systolic: analytics.timeOfDay.morning.avg?.systolic || 0,
        diastolic: analytics.timeOfDay.morning.avg?.diastolic || 0,
        count: analytics.timeOfDay.morning.count
      },
      {
        time: 'Afternoon',
        systolic: analytics.timeOfDay.afternoon.avg?.systolic || 0,
        diastolic: analytics.timeOfDay.afternoon.avg?.diastolic || 0,
        count: analytics.timeOfDay.afternoon.count
      },
      {
        time: 'Evening',
        systolic: analytics.timeOfDay.evening.avg?.systolic || 0,
        diastolic: analytics.timeOfDay.evening.avg?.diastolic || 0,
        count: analytics.timeOfDay.evening.count
      }
    ].filter(d => d.count > 0);
  }, [analytics]);

  if (!analytics || bpData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Blood Pressure Insights</h3>
        <p className="text-gray-500">No blood pressure data available for analysis.</p>
      </div>
    );
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (direction: string, isSystolic: boolean) => {
    if (direction === 'stable') return 'text-gray-600';
    if (isSystolic) {
      return direction === 'increasing' ? 'text-red-600' : 'text-green-600';
    } else {
      return direction === 'increasing' ? 'text-red-600' : 'text-green-600';
    }
  };

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Enhanced Blood Pressure Insights</h3>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average BP</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.systolicAvg.toFixed(0)}/{analytics.diastolicAvg.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">mmHg</p>
            </div>
            <div className="text-2xl">🩸</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pulse Pressure</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.pulsePressureAvg.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">mmHg (optimal: 40-60)</p>
            </div>
            <div className="text-2xl">💓</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Variability</p>
              <p className="text-xl font-bold text-gray-900">
                {((analytics.systolicVariability + analytics.diastolicVariability) / 2).toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">Standard deviation</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Readings</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.totalReadings}
              </p>
              <p className="text-xs text-gray-500">
                {analytics.anomalousReadings > 0 ? `${analytics.anomalousReadings} anomalies` : 'No anomalies'}
              </p>
            </div>
            <div className="text-2xl">📋</div>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Systolic Trend Analysis</h4>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getTrendIcon(analytics.systolicTrend.direction)}</div>
            <div>
              <p className={`font-medium ${getTrendColor(analytics.systolicTrend.direction, true)}`}>
                {analytics.systolicTrend.direction} ({analytics.systolicTrend.strength})
              </p>
              <p className="text-sm text-gray-600">
                Confidence: {(analytics.systolicTrend.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                Slope: {analytics.systolicTrend.slope.toFixed(2)} mmHg per reading
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Diastolic Trend Analysis</h4>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getTrendIcon(analytics.diastolicTrend.direction)}</div>
            <div>
              <p className={`font-medium ${getTrendColor(analytics.diastolicTrend.direction, false)}`}>
                {analytics.diastolicTrend.direction} ({analytics.diastolicTrend.strength})
              </p>
              <p className="text-sm text-gray-600">
                Confidence: {(analytics.diastolicTrend.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                Slope: {analytics.diastolicTrend.slope.toFixed(2)} mmHg per reading
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Blood Pressure Categories</h4>
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: category.color }}>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                  <div>
                    <p className="font-medium text-gray-900">{category.category}</p>
                    <p className="text-xs text-gray-500">{category.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{category.count}</p>
                  <p className="text-xs text-gray-500">
                    {((category.count / analytics.totalReadings) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Category Distribution</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="category"
                >
                  {categories.map((category, index) => (
                    <Cell key={index} fill={category.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Time of Day Patterns */}
      {timeOfDayChartData.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Time of Day Patterns</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeOfDayChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)} mmHg`, 
                    name === 'systolic' ? 'Systolic' : 'Diastolic'
                  ]}
                />
                <Legend />
                <Bar dataKey="systolic" fill="#ef4444" name="Systolic" radius={[2, 2, 0, 0]} />
                <Bar dataKey="diastolic" fill="#f97316" name="Diastolic" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Health Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Health Insights</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {analytics.pulsePressureAvg > 60 && (
            <p>• Your pulse pressure is elevated ({analytics.pulsePressureAvg.toFixed(0)} mmHg). Consider discussing with your healthcare provider.</p>
          )}
          {analytics.systolicVariability > 15 || analytics.diastolicVariability > 10 && (
            <p>• High blood pressure variability detected. Consistent monitoring and lifestyle factors are important.</p>
          )}
          {analytics.systolicTrend.direction === 'increasing' && analytics.systolicTrend.confidence > 0.6 && (
            <p>• Systolic pressure shows an increasing trend. Monitor closely and consider lifestyle modifications.</p>
          )}
          {analytics.anomalousReadings > 0 && (
            <p>• {analytics.anomalousReadings} unusual readings detected. Review these with your healthcare provider.</p>
          )}
          {categories.some(c => c.category.includes('Hypertension') && c.count > analytics.totalReadings * 0.3) && (
            <p>• Significant portion of readings indicate hypertension. Medical consultation is recommended.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedBloodPressureInsights;