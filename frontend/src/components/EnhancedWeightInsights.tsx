import React, { useMemo } from 'react';
import { HealthData } from '../types/health';
import { calculateTrend, detectAnomalies, filterByTimeOfDay } from '../utils/dataAnalysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';

interface EnhancedWeightInsightsProps {
  data: HealthData[];
}

interface WeightCategory {
  category: string;
  bmiRange: string;
  color: string;
  count: number;
  description: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
}

const EnhancedWeightInsights: React.FC<EnhancedWeightInsightsProps> = ({ data }) => {
  // Filter weight data
  const weightData = useMemo(() => {
    return data.filter(d => d.metric_type === 'weight' && d.value !== undefined);
  }, [data]);

  // Enhanced analytics
  const analytics = useMemo(() => {
    if (weightData.length === 0) return null;

    // Basic statistics
    const values = weightData.map(d => d.value!);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Trend analysis
    const trend = calculateTrend(weightData);

    // Variability analysis
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
    const cv = (std / avg) * 100; // Coefficient of variation

    // Time of day analysis
    const morningWeight = filterByTimeOfDay(weightData, 'morning');
    const afternoonWeight = filterByTimeOfDay(weightData, 'afternoon');
    const eveningWeight = filterByTimeOfDay(weightData, 'evening');

    const morningAvg = morningWeight.length > 0 ? 
      morningWeight.reduce((sum, d) => sum + d.value!, 0) / morningWeight.length : null;
    const afternoonAvg = afternoonWeight.length > 0 ? 
      afternoonWeight.reduce((sum, d) => sum + d.value!, 0) / afternoonWeight.length : null;
    const eveningAvg = eveningWeight.length > 0 ? 
      eveningWeight.reduce((sum, d) => sum + d.value!, 0) / eveningWeight.length : null;

    // Weight change analysis
    const sortedData = [...weightData].sort((a, b) => 
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    
    const firstWeight = sortedData[0]?.value;
    const lastWeight = sortedData[sortedData.length - 1]?.value;
    const totalChange = firstWeight && lastWeight ? lastWeight - firstWeight : 0;
    const changePercentage = firstWeight ? (totalChange / firstWeight) * 100 : 0;

    // Recent change (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentData = sortedData.filter(d => new Date(d.recorded_at) >= thirtyDaysAgo);
    
    const recentChange = recentData.length >= 2 ? 
      recentData[recentData.length - 1].value! - recentData[0].value! : 0;

    // Anomaly detection
    const anomalies = detectAnomalies(weightData);
    const anomalousReadings = weightData.filter(d => anomalies.get(d.id)?.isAnomaly).length;

    // BMI estimation (requires height - we'll use a standard average height for estimation)
    // Note: In a real implementation, height should be fetched from user profile
    const estimatedHeightM = 1.7; // 5'7" average height for estimation
    const avgWeightKg = weightData[0].unit === 'lbs' ? avg * 0.453592 : avg;
    const estimatedBMI = avgWeightKg / (estimatedHeightM * estimatedHeightM);

    return {
      totalReadings: weightData.length,
      avg,
      min,
      max,
      std,
      coefficientOfVariation: cv,
      trend,
      timeOfDay: {
        morning: { avg: morningAvg, count: morningWeight.length },
        afternoon: { avg: afternoonAvg, count: afternoonWeight.length },
        evening: { avg: eveningAvg, count: eveningWeight.length }
      },
      weightChange: {
        total: totalChange,
        percentage: changePercentage,
        recent30Days: recentChange
      },
      anomalousReadings,
      estimatedBMI,
      unit: weightData[0]?.unit || 'lbs'
    };
  }, [weightData]);

  // BMI/Weight categories
  const categories = useMemo(() => {
    if (weightData.length === 0 || !analytics) return [];

    const categorizeBMI = (weight: number, unit: string): WeightCategory => {
      // Convert to kg for BMI calculation
      const weightKg = unit === 'lbs' ? weight * 0.453592 : weight;
      const estimatedHeightM = 1.7; // Standard estimation
      const bmi = weightKg / (estimatedHeightM * estimatedHeightM);

      if (bmi < 18.5) {
        return {
          category: 'Underweight',
          bmiRange: '<18.5',
          color: '#3b82f6',
          count: 0,
          description: 'Below normal weight range',
          riskLevel: 'moderate'
        };
      } else if (bmi < 25) {
        return {
          category: 'Normal Weight',
          bmiRange: '18.5-24.9',
          color: '#10b981',
          count: 0,
          description: 'Healthy weight range',
          riskLevel: 'low'
        };
      } else if (bmi < 30) {
        return {
          category: 'Overweight',
          bmiRange: '25-29.9',
          color: '#f59e0b',
          count: 0,
          description: 'Above normal weight range',
          riskLevel: 'moderate'
        };
      } else if (bmi < 35) {
        return {
          category: 'Obesity Class I',
          bmiRange: '30-34.9',
          color: '#f97316',
          count: 0,
          description: 'Moderate obesity',
          riskLevel: 'high'
        };
      } else if (bmi < 40) {
        return {
          category: 'Obesity Class II',
          bmiRange: '35-39.9',
          color: '#ef4444',
          count: 0,
          description: 'Severe obesity',
          riskLevel: 'very-high'
        };
      } else {
        return {
          category: 'Obesity Class III',
          bmiRange: '≥40',
          color: '#dc2626',
          count: 0,
          description: 'Very severe obesity',
          riskLevel: 'very-high'
        };
      }
    };

    const categoryMap = new Map<string, WeightCategory>();

    weightData.forEach(d => {
      const category = categorizeBMI(d.value!, d.unit);
      const existing = categoryMap.get(category.category);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(category.category, { ...category, count: 1 });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  }, [weightData, analytics]);

  // Time of day chart data
  const timeOfDayChartData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      {
        time: 'Morning',
        weight: analytics.timeOfDay.morning.avg || 0,
        count: analytics.timeOfDay.morning.count
      },
      {
        time: 'Afternoon',
        weight: analytics.timeOfDay.afternoon.avg || 0,
        count: analytics.timeOfDay.afternoon.count
      },
      {
        time: 'Evening',
        weight: analytics.timeOfDay.evening.avg || 0,
        count: analytics.timeOfDay.evening.count
      }
    ].filter(d => d.count > 0);
  }, [analytics]);

  // Weight progression chart data
  const progressionData = useMemo(() => {
    if (weightData.length === 0) return [];
    
    return weightData
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
      .map(d => ({
        date: new Date(d.recorded_at).toLocaleDateString(),
        weight: d.value,
        target: analytics?.avg || d.value // Could be user's target weight
      }));
  }, [weightData, analytics]);

  if (!analytics || weightData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Weight Insights</h3>
        <p className="text-gray-500">No weight data available for analysis.</p>
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

  const getTrendColor = (direction: string) => {
    if (direction === 'stable') return 'text-gray-600';
    return direction === 'increasing' ? 'text-orange-600' : 'text-green-600';
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600' };
    return { category: 'Obese', color: 'text-red-600' };
  };

  const bmiCategory = getBMICategory(analytics.estimatedBMI);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Enhanced Weight Insights</h3>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Weight</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.avg.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">{analytics.unit}</p>
            </div>
            <div className="text-2xl">⚖️</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Est. BMI</p>
              <p className={`text-xl font-bold ${bmiCategory.color}`}>
                {analytics.estimatedBMI.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">{bmiCategory.category}</p>
            </div>
            <div className="text-2xl">📏</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Weight Change</p>
              <p className={`text-xl font-bold ${analytics.weightChange.total >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {analytics.weightChange.total >= 0 ? '+' : ''}{analytics.weightChange.total.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">{analytics.unit} total</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trend</p>
              <p className={`text-xl font-bold ${getTrendColor(analytics.trend.direction)}`}>
                {getTrendIcon(analytics.trend.direction)}
              </p>
              <p className="text-xs text-gray-500 capitalize">{analytics.trend.direction}</p>
            </div>
            <div className="text-2xl">📈</div>
          </div>
        </div>
      </div>

      {/* Weight Progression Chart */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-3">Weight Progression</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)} ${analytics.unit}`, 
                  name === 'weight' ? 'Weight' : 'Target'
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                name="Weight"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* BMI Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">BMI Categories</h4>
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
                  formatter={(value: number) => [
                    `${value.toFixed(1)} ${analytics.unit}`, 
                    'Average Weight'
                  ]}
                />
                <Legend />
                <Bar dataKey="weight" fill="#3b82f6" name="Average Weight" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Health Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Health Insights</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {analytics.estimatedBMI > 25 && (
            <p>• BMI indicates overweight range ({analytics.estimatedBMI.toFixed(1)}). Consider consulting with healthcare provider for personalized weight management plan.</p>
          )}
          {analytics.estimatedBMI < 18.5 && (
            <p>• BMI indicates underweight range ({analytics.estimatedBMI.toFixed(1)}). Consider discussing with healthcare provider about healthy weight gain strategies.</p>
          )}
          {Math.abs(analytics.weightChange.recent30Days) > 5 && (
            <p>• Significant weight change in the last 30 days ({analytics.weightChange.recent30Days > 0 ? '+' : ''}{analytics.weightChange.recent30Days.toFixed(1)} {analytics.unit}). Monitor closely and consult healthcare provider if rapid changes continue.</p>
          )}
          {analytics.coefficientOfVariation > 5 && (
            <p>• High weight variability detected ({analytics.coefficientOfVariation.toFixed(1)}%). Consider consistent weigh-in times and conditions for more accurate tracking.</p>
          )}
          {analytics.trend.direction === 'increasing' && analytics.trend.confidence > 0.6 && analytics.estimatedBMI > 24 && (
            <p>• Weight shows an increasing trend. Consider reviewing diet, exercise routine, and lifestyle factors with your healthcare provider.</p>
          )}
          {analytics.anomalousReadings > 0 && (
            <p>• {analytics.anomalousReadings} unusual weight readings detected. Review measurement conditions and patterns.</p>
          )}
          {analytics.estimatedBMI >= 18.5 && analytics.estimatedBMI < 25 && analytics.trend.direction === 'stable' && (
            <p>• Weight is in the healthy BMI range with stable trends. Continue current lifestyle habits for weight maintenance.</p>
          )}
          <p>• Note: BMI calculations use estimated height. For accurate BMI and personalized recommendations, use actual height measurements.</p>
        </div>
      </div>
    </div>
  );
};

export default EnhancedWeightInsights;