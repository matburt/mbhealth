import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { healthService } from '../services/health';
import { HealthData } from '../types/health';
import { useAuth } from '../contexts/AuthContext';
import { createUnitConverter, getUnitLabel, shouldConvertMetric } from '../utils/units';

interface MetricStats {
  count: number;
  latest?: HealthData;
  average?: number;
}

const DashboardStats: React.FC = () => {
  const [stats, setStats] = useState<Record<string, MetricStats>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Create unit converter based on user preferences
  const unitConverter = useMemo(() => user ? createUnitConverter(user) : null, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const metricTypes = ['blood_pressure', 'blood_sugar', 'weight', 'heart_rate'];
        const statsData: Record<string, MetricStats> = {};

        for (const metricType of metricTypes) {
          try {
            const data = await healthService.getHealthDataByType(metricType, 10);
            if (data.length > 0) {
              const values = data.map(d => d.metric_type === 'blood_pressure' ? d.systolic! : d.value);
              const average = values.reduce((sum, val) => sum + val, 0) / values.length;
              
              statsData[metricType] = {
                count: data.length,
                latest: data[0],
                average: Math.round(average * 10) / 10
              };
            } else {
              statsData[metricType] = { count: 0 };
            }
          } catch (error) {
            console.error(`Failed to fetch ${metricType} data:`, error);
            statsData[metricType] = { count: 0 };
          }
        }

        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const getMetricInfo = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return {
          label: 'Blood Pressure',
          icon: '🩸',
          color: 'bg-health-blood/10 text-health-blood',
          unit: 'mmHg'
        };
      case 'blood_sugar':
        return {
          label: 'Blood Sugar',
          icon: '🩸',
          color: 'bg-health-sugar/10 text-health-sugar',
          unit: 'mg/dL'
        };
      case 'weight':
        return {
          label: 'Weight',
          icon: '⚖️',
          color: 'bg-health-weight/10 text-health-weight',
          unit: unitConverter ? getUnitLabel('weight', unitConverter.getUserUnitForMetric('weight')) : 'kg'
        };
      case 'heart_rate':
        return {
          label: 'Heart Rate',
          icon: '❤️',
          color: 'bg-red-100 text-red-600',
          unit: 'bpm'
        };
      default:
        return {
          label: metricType.replace('_', ' '),
          icon: '📊',
          color: 'bg-gray-100 text-gray-600',
          unit: ''
        };
    }
  };

  const getLatestValue = (metricType: string, data?: HealthData) => {
    if (!data) return 'No data';
    
    if (metricType === 'blood_pressure') {
      return `${data.systolic}/${data.diastolic} ${data.unit}`;
    }

    // Convert to user's preferred units if applicable
    if (unitConverter && shouldConvertMetric(metricType) && data.value !== null) {
      const converted = unitConverter.convertToUserUnits(data.value, metricType, data.unit);
      return `${converted.value.toFixed(1)} ${converted.unit}`;
    } else {
      return `${data.value} ${data.unit}`;
    }
  };

  const getAverageValue = (metricType: string, average: number, latestData?: HealthData) => {
    if (!latestData) return average;

    // Convert average to user's preferred units if applicable
    if (unitConverter && shouldConvertMetric(metricType)) {
      const converted = unitConverter.convertToUserUnits(average, metricType, latestData.unit);
      return converted.value.toFixed(1);
    } else {
      return average;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Object.entries(stats).map(([metricType, metricStats]) => {
        const info = getMetricInfo(metricType);
        
        return (
          <div key={metricType} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${info.color}`}>
                <span className="text-xl">{info.icon}</span>
              </div>
              <Link 
                to={`/health-data?metric_type=${metricType}`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View →
              </Link>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {info.label}
            </h3>
            
            <div className="space-y-2">
              <p className="text-2xl font-bold text-gray-900">
                {getLatestValue(metricType, metricStats.latest)}
              </p>
              
              <div className="flex justify-between text-sm text-gray-500">
                <span>{metricStats.count} entries</span>
                {metricStats.average && (
                  <span>Avg: {getAverageValue(metricType, metricStats.average, metricStats.latest)} {info.unit}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats; 