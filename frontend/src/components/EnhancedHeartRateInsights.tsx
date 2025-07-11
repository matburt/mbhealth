import React, { useMemo } from 'react';
import { HealthData } from '../types/health';
import { calculateTrend, detectAnomalies, filterByTimeOfDay } from '../utils/dataAnalysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ScatterChart, Scatter } from 'recharts';

interface EnhancedHeartRateInsightsProps {
  data: HealthData[];
}

interface HeartRateZone {
  zone: string;
  range: string;
  color: string;
  count: number;
  description: string;
  intensity: 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';
  percentage: number;
}

const EnhancedHeartRateInsights: React.FC<EnhancedHeartRateInsightsProps> = ({ data }) => {
  // Filter heart rate data
  const hrData = useMemo(() => {
    return data.filter(d => d.metric_type === 'heart_rate' && d.value !== undefined);
  }, [data]);

  // Enhanced analytics
  const analytics = useMemo(() => {
    if (hrData.length === 0) return null;

    // Basic statistics
    const values = hrData.map(d => d.value!);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Trend analysis
    const trend = calculateTrend(hrData);

    // Heart rate variability (HRV) - simplified measure
    const hrv = values.length > 1 ? 
      Math.sqrt(values.slice(1).reduce((sum, val, i) => sum + Math.pow(val - values[i], 2), 0) / (values.length - 1)) : 0;

    // Resting heart rate estimation (morning readings are typically closest to RHR)
    const morningHR = filterByTimeOfDay(hrData, 'morning');
    const restingHR = morningHR.length > 0 ? 
      morningHR.reduce((sum, d) => sum + d.value!, 0) / morningHR.length : avg;

    // Maximum heart rate estimation (age-based: 220 - age, using 40 as default)
    const estimatedMaxHR = 180; // 220 - 40 (estimated age)

    // Time of day analysis
    const afternoonHR = filterByTimeOfDay(hrData, 'afternoon');
    const eveningHR = filterByTimeOfDay(hrData, 'evening');

    const morningAvg = morningHR.length > 0 ? 
      morningHR.reduce((sum, d) => sum + d.value!, 0) / morningHR.length : null;
    const afternoonAvg = afternoonHR.length > 0 ? 
      afternoonHR.reduce((sum, d) => sum + d.value!, 0) / afternoonHR.length : null;
    const eveningAvg = eveningHR.length > 0 ? 
      eveningHR.reduce((sum, d) => sum + d.value!, 0) / eveningHR.length : null;

    // Anomaly detection
    const anomalies = detectAnomalies(hrData);
    const anomalousReadings = hrData.filter(d => anomalies.get(d.id)?.isAnomaly).length;

    // Heart rate recovery analysis (looking at consecutive readings)
    const sortedData = [...hrData].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    let recoveryRate = 0;
    let recoveryCount = 0;
    for (let i = 1; i < sortedData.length; i++) {
      const timeDiff = new Date(sortedData[i].recorded_at).getTime() - new Date(sortedData[i-1].recorded_at).getTime();
      // Only consider readings within 5 minutes of each other for recovery analysis
      if (timeDiff <= 5 * 60 * 1000) {
        const hrDiff = sortedData[i-1].value! - sortedData[i].value!;
        if (hrDiff > 0) { // Recovery (HR decreasing)
          recoveryRate += hrDiff;
          recoveryCount++;
        }
      }
    }
    const avgRecoveryRate = recoveryCount > 0 ? recoveryRate / recoveryCount : 0;

    return {
      totalReadings: hrData.length,
      avg,
      min,
      max,
      restingHR,
      maxHR: estimatedMaxHR,
      hrv,
      trend,
      timeOfDay: {
        morning: { avg: morningAvg, count: morningHR.length },
        afternoon: { avg: afternoonAvg, count: afternoonHR.length },
        evening: { avg: eveningAvg, count: eveningHR.length }
      },
      anomalousReadings,
      avgRecoveryRate,
      unit: hrData[0]?.unit || 'bpm'
    };
  }, [hrData]);

  // Heart rate zones analysis
  const heartRateZones = useMemo(() => {
    if (hrData.length === 0 || !analytics) return [];

    const maxHR = analytics.maxHR;
    const zones = [
      {
        zone: 'Resting Zone',
        range: '<60',
        color: '#3b82f6',
        minPercent: 0,
        maxPercent: 33,
        description: 'Very light activity, recovery',
        intensity: 'very-low' as const
      },
      {
        zone: 'Fat Burn Zone',
        range: '60-70%',
        color: '#10b981',
        minPercent: 33,
        maxPercent: 50,
        description: 'Light exercise, fat burning',
        intensity: 'low' as const
      },
      {
        zone: 'Aerobic Zone',
        range: '70-80%',
        color: '#f59e0b',
        minPercent: 50,
        maxPercent: 70,
        description: 'Moderate exercise, endurance',
        intensity: 'moderate' as const
      },
      {
        zone: 'Anaerobic Zone',
        range: '80-90%',
        color: '#f97316',
        minPercent: 70,
        maxPercent: 85,
        description: 'Hard exercise, lactate threshold',
        intensity: 'high' as const
      },
      {
        zone: 'Red Line Zone',
        range: '90%+',
        color: '#ef4444',
        minPercent: 85,
        maxPercent: 100,
        description: 'Maximum effort, very short duration',
        intensity: 'very-high' as const
      }
    ];

    const zoneData = zones.map(zone => {
      let count = 0;
      
      if (zone.zone === 'Resting Zone') {
        count = hrData.filter(d => d.value! < 60).length;
      } else {
        const minHR = (zone.minPercent / 100) * maxHR;
        const maxHRZone = (zone.maxPercent / 100) * maxHR;
        count = hrData.filter(d => d.value! >= minHR && d.value! < maxHRZone).length;
      }

      const percentage = (count / hrData.length) * 100;

      return {
        ...zone,
        count,
        percentage
      };
    });

    return zoneData.filter(zone => zone.count > 0);
  }, [hrData, analytics]);

  // Time of day chart data
  const timeOfDayChartData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      {
        time: 'Morning',
        heartRate: analytics.timeOfDay.morning.avg || 0,
        count: analytics.timeOfDay.morning.count,
        target: analytics.restingHR
      },
      {
        time: 'Afternoon',
        heartRate: analytics.timeOfDay.afternoon.avg || 0,
        count: analytics.timeOfDay.afternoon.count,
        target: analytics.avg
      },
      {
        time: 'Evening',
        heartRate: analytics.timeOfDay.evening.avg || 0,
        count: analytics.timeOfDay.evening.count,
        target: analytics.avg
      }
    ].filter(d => d.count > 0);
  }, [analytics]);

  // Heart rate progression chart data
  const progressionData = useMemo(() => {
    if (hrData.length === 0) return [];
    
    return hrData
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(d => ({
        date: new Date(d.recorded_at).toLocaleDateString(),
        heartRate: d.value,
        restingHR: analytics?.restingHR || 60,
        maxHR: analytics?.maxHR || 180
      }));
  }, [hrData, analytics]);

  // Heart rate variability chart data
  const hrvData = useMemo(() => {
    if (hrData.length < 2) return [];
    
    const sortedData = [...hrData].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    return sortedData.slice(1).map((d, i) => ({
      date: new Date(d.recorded_at).toLocaleDateString(),
      hrv: Math.abs(d.value! - sortedData[i].value!),
      heartRate: d.value
    }));
  }, [hrData]);

  if (!analytics || hrData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Heart Rate Insights</h3>
        <p className="text-gray-500">No heart rate data available for analysis.</p>
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

  const getTrendColor = (direction: string, isResting: boolean = false) => {
    if (direction === 'stable') return 'text-gray-600';
    if (isResting) {
      // For resting HR, decreasing is good, increasing might be concerning
      return direction === 'increasing' ? 'text-orange-600' : 'text-green-600';
    } else {
      return direction === 'increasing' ? 'text-blue-600' : 'text-green-600';
    }
  };

  const getRestingHRCategory = (rhr: number) => {
    if (rhr < 60) return { category: 'Excellent', color: 'text-green-600' };
    if (rhr < 70) return { category: 'Good', color: 'text-green-500' };
    if (rhr < 80) return { category: 'Average', color: 'text-yellow-600' };
    if (rhr < 90) return { category: 'Below Average', color: 'text-orange-600' };
    return { category: 'Poor', color: 'text-red-600' };
  };

  const getHRVCategory = (hrv: number) => {
    if (hrv < 5) return { category: 'Low Variability', color: 'text-orange-600' };
    if (hrv < 15) return { category: 'Normal Variability', color: 'text-green-600' };
    return { category: 'High Variability', color: 'text-blue-600' };
  };

  const restingHRCategory = getRestingHRCategory(analytics.restingHR);
  const hrvCategory = getHRVCategory(analytics.hrv);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Enhanced Heart Rate Insights</h3>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Resting HR</p>
              <p className={`text-xl font-bold ${restingHRCategory.color}`}>
                {analytics.restingHR.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">{restingHRCategory.category}</p>
            </div>
            <div className="text-2xl">💤</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average HR</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.avg.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">{analytics.unit}</p>
            </div>
            <div className="text-2xl">❤️</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">HR Variability</p>
              <p className={`text-xl font-bold ${hrvCategory.color}`}>
                {analytics.hrv.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">{hrvCategory.category}</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Max Recorded</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.max.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">{analytics.unit}</p>
            </div>
            <div className="text-2xl">🚀</div>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Heart Rate Trend Analysis</h4>
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{getTrendIcon(analytics.trend.direction)}</div>
            <div>
              <p className={`font-medium ${getTrendColor(analytics.trend.direction)}`}>
                {analytics.trend.direction} ({analytics.trend.strength})
              </p>
              <p className="text-sm text-gray-600">
                Confidence: {(analytics.trend.confidence * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">
                Slope: {analytics.trend.slope.toFixed(2)} bpm per reading
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Heart Rate Summary</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Range</span>
              <span className="font-medium text-gray-900">{analytics.min.toFixed(0)} - {analytics.max.toFixed(0)} bpm</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Resting HR</span>
              <span className={`font-medium ${restingHRCategory.color}`}>{analytics.restingHR.toFixed(0)} bpm</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">HRV</span>
              <span className={`font-medium ${hrvCategory.color}`}>{analytics.hrv.toFixed(1)} bpm</span>
            </div>
            {analytics.avgRecoveryRate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Recovery</span>
                <span className="font-medium text-green-600">{analytics.avgRecoveryRate.toFixed(1)} bpm</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heart Rate Progression Chart */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Heart Rate Progression</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toFixed(0)} ${analytics.unit}`, 
                  name === 'heartRate' ? 'Heart Rate' : 
                  name === 'restingHR' ? 'Resting HR' : 'Max HR'
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="heartRate" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                name="Heart Rate"
              />
              <Line 
                type="monotone" 
                dataKey="restingHR" 
                stroke="#10b981" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Resting HR"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Heart Rate Zones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Heart Rate Zones</h4>
          <div className="space-y-2">
            {heartRateZones.map((zone, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: zone.color }}>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></div>
                  <div>
                    <p className="font-medium text-gray-900">{zone.zone}</p>
                    <p className="text-xs text-gray-500">{zone.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{zone.count}</p>
                  <p className="text-xs text-gray-500">
                    {zone.percentage.toFixed(0)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Zone Distribution</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={heartRateZones}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="zone"
                >
                  {heartRateZones.map((zone, index) => (
                    <Cell key={index} fill={zone.color} />
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
                    `${value.toFixed(0)} ${analytics.unit}`, 
                    name === 'heartRate' ? 'Average HR' : 'Target'
                  ]}
                />
                <Legend />
                <Bar dataKey="heartRate" fill="#ef4444" name="Average HR" radius={[2, 2, 0, 0]} />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Heart Rate Variability Chart */}
      {hrvData.length > 0 && (
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 mb-3">Heart Rate Variability</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={hrvData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}`, 
                    name === 'hrv' ? 'HRV' : 'Heart Rate'
                  ]}
                />
                <Legend />
                <Scatter dataKey="hrv" fill="#3b82f6" name="HRV (BPM difference)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Health Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Health Insights</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {analytics.restingHR > 90 && (
            <p>• Resting heart rate is elevated ({analytics.restingHR.toFixed(0)} bpm). Consider consulting healthcare provider and improving cardiovascular fitness.</p>
          )}
          {analytics.restingHR < 50 && (
            <p>• Very low resting heart rate detected ({analytics.restingHR.toFixed(0)} bpm). This may indicate excellent fitness or should be evaluated by healthcare provider.</p>
          )}
          {analytics.max > 190 && (
            <p>• Very high heart rate recorded ({analytics.max.toFixed(0)} bpm). Ensure this was during appropriate exercise and monitor for concerning symptoms.</p>
          )}
          {analytics.hrv < 5 && (
            <p>• Low heart rate variability detected. This may indicate stress, fatigue, or need for recovery. Consider stress management and adequate rest.</p>
          )}
          {heartRateZones.find(z => z.zone === 'Red Line Zone' && z.percentage > 10) && (
            <p>• High percentage of time in maximum effort zone. Ensure adequate recovery and avoid overtraining.</p>
          )}
          {analytics.trend.direction === 'increasing' && analytics.trend.confidence > 0.6 && (
            <p>• Heart rate shows an increasing trend. Monitor for changes in fitness, stress levels, or health status.</p>
          )}
          {analytics.anomalousReadings > 0 && (
            <p>• {analytics.anomalousReadings} unusual heart rate readings detected. Review circumstances and consult healthcare provider if concerning patterns persist.</p>
          )}
          {analytics.avgRecoveryRate > 0 && (
            <p>• Average heart rate recovery is {analytics.avgRecoveryRate.toFixed(1)} bpm. Good recovery indicates better cardiovascular fitness.</p>
          )}
          {heartRateZones.find(z => z.zone === 'Fat Burn Zone' && z.percentage > 40) && (
            <p>• Good distribution in fat burning zone. This is excellent for sustainable fitness and weight management.</p>
          )}
          <p>• Monitor heart rate patterns and consult healthcare providers for personalized fitness and health recommendations.</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedHeartRateInsights;