import { HealthData } from '../types/health';

export interface TrendAnalysis {
  slope: number;
  direction: 'increasing' | 'decreasing' | 'stable';
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number;
}

export interface AnomalyDetection {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
  zScore: number;
  deviation: number;
}

/**
 * Calculate trend analysis for a series of health data points
 */
export const calculateTrend = (data: HealthData[]): TrendAnalysis => {
  if (data.length < 3) {
    return {
      slope: 0,
      direction: 'stable',
      strength: 'weak',
      confidence: 0
    };
  }

  // Sort by date
  const sortedData = [...data].sort((a, b) => 
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // Extract values for calculation
  const values = sortedData.map(d => {
    if (d.metric_type === 'blood_pressure' && d.systolic) {
      return d.systolic; // Use systolic for blood pressure trends
    }
    return d.value || 0;
  });

  // Calculate linear regression slope
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate correlation coefficient for confidence
  const meanX = sumX / n;
  const meanY = sumY / n;
  const numerator = x.reduce((sum, xi, i) => sum + (xi - meanX) * (values[i] - meanY), 0);
  const denomX = Math.sqrt(x.reduce((sum, xi) => sum + (xi - meanX) ** 2, 0));
  const denomY = Math.sqrt(values.reduce((sum, yi) => sum + (yi - meanY) ** 2, 0));
  const correlation = denomX && denomY ? Math.abs(numerator / (denomX * denomY)) : 0;

  // Determine direction and strength
  const absSlope = Math.abs(slope);
  const direction = slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable';
  
  let strength: 'weak' | 'moderate' | 'strong';
  if (absSlope < 0.5) strength = 'weak';
  else if (absSlope < 2) strength = 'moderate';
  else strength = 'strong';

  return {
    slope,
    direction,
    strength,
    confidence: correlation
  };
};

/**
 * Detect anomalies in health data using statistical methods
 */
export const detectAnomalies = (data: HealthData[]): Map<number, AnomalyDetection> => {
  const anomalies = new Map<number, AnomalyDetection>();

  if (data.length < 5) {
    // Not enough data for meaningful anomaly detection
    data.forEach(d => {
      anomalies.set(d.id, {
        isAnomaly: false,
        severity: 'low',
        zScore: 0,
        deviation: 0
      });
    });
    return anomalies;
  }

  // Group by metric type
  const metricGroups = data.reduce((groups, item) => {
    if (!groups[item.metric_type]) {
      groups[item.metric_type] = [];
    }
    groups[item.metric_type].push(item);
    return groups;
  }, {} as Record<string, HealthData[]>);

  // Analyze each metric type separately
  Object.entries(metricGroups).forEach(([metricType, metricData]) => {
    const values = metricData.map(d => {
      if (metricType === 'blood_pressure') {
        // For blood pressure, we'll check both systolic and diastolic
        // For now, let's use systolic as primary indicator
        return d.systolic || d.value || 0;
      }
      return d.value || 0;
    });

    if (values.length < 3) return;

    // Calculate mean and standard deviation
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + (val - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Calculate anomalies using z-score
    metricData.forEach((item, index) => {
      const value = values[index];
      const zScore = stdDev > 0 ? Math.abs(value - mean) / stdDev : 0;
      const deviation = Math.abs(value - mean);

      let isAnomaly = false;
      let severity: 'low' | 'medium' | 'high' = 'low';

      // Define anomaly thresholds based on metric type
      let threshold = 2; // Default z-score threshold
      
      if (metricType === 'blood_pressure') {
        // More sensitive for blood pressure
        threshold = 1.5;
      } else if (metricType === 'blood_sugar') {
        // Very sensitive for blood sugar
        threshold = 1.2;
      }

      if (zScore > threshold) {
        isAnomaly = true;
        if (zScore > threshold * 2) severity = 'high';
        else if (zScore > threshold * 1.5) severity = 'medium';
        else severity = 'low';
      }

      // Additional checks for specific metrics
      if (metricType === 'blood_pressure' && item.systolic) {
        // High blood pressure thresholds
        if (item.systolic > 140 || (item.diastolic && item.diastolic > 90)) {
          isAnomaly = true;
          severity = item.systolic > 180 || (item.diastolic && item.diastolic > 120) ? 'high' : 'medium';
        }
      } else if (metricType === 'blood_sugar' && value > 0) {
        // Blood sugar thresholds (mg/dL)
        if (value > 180 || value < 70) {
          isAnomaly = true;
          severity = value > 250 || value < 50 ? 'high' : 'medium';
        }
      }

      anomalies.set(item.id, {
        isAnomaly,
        severity,
        zScore,
        deviation
      });
    });
  });

  return anomalies;
};

/**
 * Filter data by time of day
 */
export const filterByTimeOfDay = (data: HealthData[], timeOfDay: 'morning' | 'afternoon' | 'evening'): HealthData[] => {
  return data.filter(item => {
    const date = new Date(item.recorded_at);
    const hour = date.getHours();

    switch (timeOfDay) {
      case 'morning':
        return hour >= 5 && hour < 12;
      case 'afternoon':
        return hour >= 12 && hour < 18;
      case 'evening':
        return hour >= 18 || hour < 5;
      default:
        return true;
    }
  });
};

/**
 * Find data with significant trends
 */
export const findTrendingData = (data: HealthData[], minConfidence = 0.6, minStrength: 'weak' | 'moderate' | 'strong' = 'moderate'): HealthData[] => {
  // Group by metric type
  const metricGroups = data.reduce((groups, item) => {
    if (!groups[item.metric_type]) {
      groups[item.metric_type] = [];
    }
    groups[item.metric_type].push(item);
    return groups;
  }, {} as Record<string, HealthData[]>);

  const trendingData: HealthData[] = [];

  Object.values(metricGroups).forEach(metricData => {
    if (metricData.length < 5) return; // Need minimum data for trend analysis

    const trend = calculateTrend(metricData);
    
    // Check if trend meets criteria
    const strengthScore = trend.strength === 'strong' ? 3 : trend.strength === 'moderate' ? 2 : 1;
    const minStrengthScore = minStrength === 'strong' ? 3 : minStrength === 'moderate' ? 2 : 1;

    if (trend.confidence >= minConfidence && strengthScore >= minStrengthScore && trend.direction !== 'stable') {
      trendingData.push(...metricData);
    }
  });

  return trendingData;
};

/**
 * Find anomalous data points
 */
export const findAnomalousData = (data: HealthData[], minSeverity: 'low' | 'medium' | 'high' = 'low'): HealthData[] => {
  const anomalies = detectAnomalies(data);
  const severityScore = minSeverity === 'high' ? 3 : minSeverity === 'medium' ? 2 : 1;

  return data.filter(item => {
    const anomaly = anomalies.get(item.id);
    if (!anomaly?.isAnomaly) return false;

    const itemSeverityScore = anomaly.severity === 'high' ? 3 : anomaly.severity === 'medium' ? 2 : 1;
    return itemSeverityScore >= severityScore;
  });
};

/**
 * Get statistics summary for data
 */
export const getDataStatistics = (data: HealthData[]) => {
  const trendingData = findTrendingData(data, 0.5, 'weak');
  const anomalousData = findAnomalousData(data, 'low');
  const morningData = filterByTimeOfDay(data, 'morning');
  const afternoonData = filterByTimeOfDay(data, 'afternoon');
  const eveningData = filterByTimeOfDay(data, 'evening');

  return {
    total: data.length,
    trending: trendingData.length,
    anomalous: anomalousData.length,
    morning: morningData.length,
    afternoon: afternoonData.length,
    evening: eveningData.length
  };
};