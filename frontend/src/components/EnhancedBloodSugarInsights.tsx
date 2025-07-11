import React, { useMemo } from 'react';
import { HealthData } from '../types/health';
import { calculateTrend, detectAnomalies, filterByTimeOfDay } from '../utils/dataAnalysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface EnhancedBloodSugarInsightsProps {
  data: HealthData[];
}

interface BloodSugarCategory {
  category: string;
  range: string;
  color: string;
  count: number;
  description: string;
  riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
  testType: 'fasting' | 'postprandial' | 'random' | 'general';
}

const EnhancedBloodSugarInsights: React.FC<EnhancedBloodSugarInsightsProps> = ({ data }) => {
  // Filter blood sugar data
  const bsData = useMemo(() => {
    return data.filter(d => d.metric_type === 'blood_sugar' && d.value !== undefined);
  }, [data]);

  // Enhanced analytics
  const analytics = useMemo(() => {
    if (bsData.length === 0) return null;

    // Basic statistics
    const values = bsData.map(d => d.value!);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Trend analysis
    const trend = calculateTrend(bsData);

    // Variability analysis
    const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length);
    const cv = (std / avg) * 100; // Coefficient of variation

    // Time of day analysis
    const morningBS = filterByTimeOfDay(bsData, 'morning');
    const afternoonBS = filterByTimeOfDay(bsData, 'afternoon');
    const eveningBS = filterByTimeOfDay(bsData, 'evening');

    const morningAvg = morningBS.length > 0 ? 
      morningBS.reduce((sum, d) => sum + d.value!, 0) / morningBS.length : null;
    const afternoonAvg = afternoonBS.length > 0 ? 
      afternoonBS.reduce((sum, d) => sum + d.value!, 0) / afternoonBS.length : null;
    const eveningAvg = eveningBS.length > 0 ? 
      eveningBS.reduce((sum, d) => sum + d.value!, 0) / eveningBS.length : null;

    // Time in range analysis (70-180 mg/dL is generally considered good range)
    const inRangeCount = values.filter(v => v >= 70 && v <= 180).length;
    const belowRangeCount = values.filter(v => v < 70).length;
    const aboveRangeCount = values.filter(v => v > 180).length;

    // Anomaly detection
    const anomalies = detectAnomalies(bsData);
    const anomalousReadings = bsData.filter(d => anomalies.get(d.id)?.isAnomaly);

    // HbA1c estimation (rough approximation: eAG = (28.7 × A1c) - 46.7)
    // Reverse formula: A1c ≈ (avg + 46.7) / 28.7
    const estimatedA1c = (avg + 46.7) / 28.7;

    return {
      totalReadings: bsData.length,
      avg,
      min,
      max,
      trend,
      variability: std,
      coefficientOfVariation: cv,
      timeOfDay: {
        morning: { count: morningBS.length, avg: morningAvg },
        afternoon: { count: afternoonBS.length, avg: afternoonAvg },
        evening: { count: eveningBS.length, avg: eveningAvg }
      },
      timeInRange: {
        inRange: { count: inRangeCount, percentage: (inRangeCount / values.length) * 100 },
        belowRange: { count: belowRangeCount, percentage: (belowRangeCount / values.length) * 100 },
        aboveRange: { count: aboveRangeCount, percentage: (aboveRangeCount / values.length) * 100 }
      },
      anomalousReadings: anomalousReadings.length,
      estimatedA1c
    };
  }, [bsData]);

  // Blood sugar categorization
  const categories = useMemo(() => {
    if (bsData.length === 0) return [];

    const categorizeReading = (value: number, notes?: string): BloodSugarCategory => {
      // Determine if this might be a fasting reading based on notes or time
      const isFasting = notes?.toLowerCase().includes('fasting') || 
                       notes?.toLowerCase().includes('morning') ||
                       notes?.toLowerCase().includes('before meal');
      
      const isPostprandial = notes?.toLowerCase().includes('after meal') ||
                             notes?.toLowerCase().includes('postprandial') ||
                             notes?.toLowerCase().includes('post meal');

      if (isFasting) {
        // Fasting glucose categories
        if (value < 70) {
          return {
            category: 'Hypoglycemia (Fasting)',
            range: '<70',
            color: '#dc2626',
            count: 0,
            description: 'Low blood sugar, immediate attention needed',
            riskLevel: 'very-high',
            testType: 'fasting'
          };
        } else if (value <= 99) {
          return {
            category: 'Normal (Fasting)',
            range: '70-99',
            color: '#10b981',
            count: 0,
            description: 'Normal fasting glucose',
            riskLevel: 'low',
            testType: 'fasting'
          };
        } else if (value <= 125) {
          return {
            category: 'Prediabetes (Fasting)',
            range: '100-125',
            color: '#f59e0b',
            count: 0,
            description: 'Impaired fasting glucose, lifestyle changes recommended',
            riskLevel: 'moderate',
            testType: 'fasting'
          };
        } else {
          return {
            category: 'Diabetes (Fasting)',
            range: '≥126',
            color: '#ef4444',
            count: 0,
            description: 'Indicates diabetes, medical consultation required',
            riskLevel: 'high',
            testType: 'fasting'
          };
        }
      } else if (isPostprandial) {
        // Postprandial (after meal) glucose categories
        if (value < 70) {
          return {
            category: 'Hypoglycemia (Post-meal)',
            range: '<70',
            color: '#dc2626',
            count: 0,
            description: 'Low blood sugar after meal, unusual condition',
            riskLevel: 'very-high',
            testType: 'postprandial'
          };
        } else if (value < 140) {
          return {
            category: 'Normal (Post-meal)',
            range: '<140',
            color: '#10b981',
            count: 0,
            description: 'Normal post-meal glucose',
            riskLevel: 'low',
            testType: 'postprandial'
          };
        } else if (value <= 199) {
          return {
            category: 'Prediabetes (Post-meal)',
            range: '140-199',
            color: '#f59e0b',
            count: 0,
            description: 'Impaired glucose tolerance, monitoring needed',
            riskLevel: 'moderate',
            testType: 'postprandial'
          };
        } else {
          return {
            category: 'Diabetes (Post-meal)',
            range: '≥200',
            color: '#ef4444',
            count: 0,
            description: 'Elevated post-meal glucose, medical attention needed',
            riskLevel: 'high',
            testType: 'postprandial'
          };
        }
      } else {
        // Random/general glucose categories
        if (value < 70) {
          return {
            category: 'Hypoglycemia',
            range: '<70',
            color: '#dc2626',
            count: 0,
            description: 'Low blood sugar, immediate attention needed',
            riskLevel: 'very-high',
            testType: 'random'
          };
        } else if (value < 140) {
          return {
            category: 'Normal Range',
            range: '70-139',
            color: '#10b981',
            count: 0,
            description: 'Normal blood glucose range',
            riskLevel: 'low',
            testType: 'random'
          };
        } else if (value <= 199) {
          return {
            category: 'Elevated',
            range: '140-199',
            color: '#f59e0b',
            count: 0,
            description: 'Elevated glucose, monitoring recommended',
            riskLevel: 'moderate',
            testType: 'random'
          };
        } else {
          return {
            category: 'High Glucose',
            range: '≥200',
            color: '#ef4444',
            count: 0,
            description: 'High blood glucose, medical consultation needed',
            riskLevel: 'high',
            testType: 'random'
          };
        }
      }
    };

    const categoryMap = new Map<string, BloodSugarCategory>();

    bsData.forEach(d => {
      const category = categorizeReading(d.value!, d.notes);
      const existing = categoryMap.get(category.category);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(category.category, { ...category, count: 1 });
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);
  }, [bsData]);

  // Time of day chart data
  const timeOfDayChartData = useMemo(() => {
    if (!analytics) return [];
    
    return [
      {
        time: 'Morning',
        glucose: analytics.timeOfDay.morning.avg || 0,
        count: analytics.timeOfDay.morning.count,
        target: 100 // Typical fasting target
      },
      {
        time: 'Afternoon',
        glucose: analytics.timeOfDay.afternoon.avg || 0,
        count: analytics.timeOfDay.afternoon.count,
        target: 140 // Typical post-meal target
      },
      {
        time: 'Evening',
        glucose: analytics.timeOfDay.evening.avg || 0,
        count: analytics.timeOfDay.evening.count,
        target: 120 // Typical evening target
      }
    ].filter(d => d.count > 0);
  }, [analytics]);

  if (!analytics || bsData.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Blood Sugar Insights</h3>
        <p className="text-gray-500">No blood sugar data available for analysis.</p>
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
    return direction === 'increasing' ? 'text-red-600' : 'text-green-600';
  };

  const getA1cCategory = (a1c: number) => {
    if (a1c < 5.7) return { category: 'Normal', color: 'text-green-600' };
    if (a1c < 6.5) return { category: 'Prediabetes', color: 'text-yellow-600' };
    return { category: 'Diabetes', color: 'text-red-600' };
  };

  const a1cCategory = getA1cCategory(analytics.estimatedA1c);

  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Enhanced Blood Sugar Insights</h3>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Glucose</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.avg.toFixed(0)}
              </p>
              <p className="text-xs text-gray-500">mg/dL</p>
            </div>
            <div className="text-2xl">🩸</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Est. HbA1c</p>
              <p className={`text-xl font-bold ${a1cCategory.color}`}>
                {analytics.estimatedA1c.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">{a1cCategory.category}</p>
            </div>
            <div className="text-2xl">🧪</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Time in Range</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.timeInRange.inRange.percentage.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">70-180 mg/dL</p>
            </div>
            <div className="text-2xl">🎯</div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Variability</p>
              <p className="text-xl font-bold text-gray-900">
                {analytics.coefficientOfVariation.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">CV (target: &lt;30%)</p>
            </div>
            <div className="text-2xl">📊</div>
          </div>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Glucose Trend Analysis</h4>
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
                Slope: {analytics.trend.slope.toFixed(2)} mg/dL per reading
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Glucose Range Distribution</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">Below Range (&lt;70)</span>
              <span className="font-medium">{analytics.timeInRange.belowRange.count} ({analytics.timeInRange.belowRange.percentage.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600">In Range (70-180)</span>
              <span className="font-medium">{analytics.timeInRange.inRange.count} ({analytics.timeInRange.inRange.percentage.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600">Above Range (&gt;180)</span>
              <span className="font-medium">{analytics.timeInRange.aboveRange.count} ({analytics.timeInRange.aboveRange.percentage.toFixed(0)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Blood Sugar Categories</h4>
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
                    `${value.toFixed(1)} mg/dL`, 
                    name === 'glucose' ? 'Average Glucose' : 'Target'
                  ]}
                />
                <Legend />
                <Bar dataKey="glucose" fill="#3b82f6" name="Average" radius={[2, 2, 0, 0]} />
                <Bar dataKey="target" fill="#e5e7eb" name="Target" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Health Recommendations */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">📋 Health Insights</h4>
        <div className="text-sm text-blue-800 space-y-1">
          {analytics.timeInRange.inRange.percentage < 70 && (
            <p>• Time in range is {analytics.timeInRange.inRange.percentage.toFixed(0)}%. Target is 70%+ for good glucose control.</p>
          )}
          {analytics.coefficientOfVariation > 30 && (
            <p>• High glucose variability detected ({analytics.coefficientOfVariation.toFixed(1)}%). Consider consistent meal timing and medication adherence.</p>
          )}
          {analytics.timeInRange.belowRange.percentage > 5 && (
            <p>• {analytics.timeInRange.belowRange.percentage.toFixed(0)}% of readings are below normal range. Monitor for hypoglycemia symptoms.</p>
          )}
          {analytics.estimatedA1c > 6.5 && (
            <p>• Estimated HbA1c suggests diabetes range ({analytics.estimatedA1c.toFixed(1)}%). Consult healthcare provider for management plan.</p>
          )}
          {analytics.trend.direction === 'increasing' && analytics.trend.confidence > 0.6 && (
            <p>• Glucose levels show an increasing trend. Consider reviewing diet, exercise, and medication with your healthcare provider.</p>
          )}
          {analytics.anomalousReadings > 0 && (
            <p>• {analytics.anomalousReadings} unusual readings detected. Review circumstances and patterns with your healthcare provider.</p>
          )}
          {categories.some(c => c.category.includes('Diabetes') && c.count > analytics.totalReadings * 0.3) && (
            <p>• Significant portion of readings indicate diabetes range. Regular medical monitoring is important.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedBloodSugarInsights;