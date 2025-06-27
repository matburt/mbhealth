import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { healthService } from '../services/health';
import { HealthData } from '../types/health';

const RecentHealthData: React.FC = () => {
  const [recentData, setRecentData] = useState<HealthData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentData = async () => {
      try {
        const data = await healthService.getRecentHealthData(5);
        setRecentData(data);
      } catch (error) {
        console.error('Failed to fetch recent health data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentData();
  }, []);

  const getMetricDisplay = (data: HealthData) => {
    switch (data.metric_type) {
      case 'blood_pressure':
        return `${data.systolic}/${data.diastolic} ${data.unit}`;
      case 'blood_sugar':
        return `${data.value} ${data.unit}`;
      case 'weight':
        return `${data.value} ${data.unit}`;
      case 'heart_rate':
        return `${data.value} ${data.unit}`;
      case 'temperature':
        return `${data.value} ${data.unit}`;
      default:
        return `${data.value} ${data.unit}`;
    }
  };

  const getMetricColor = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return 'text-health-blood';
      case 'blood_sugar':
        return 'text-health-sugar';
      case 'weight':
        return 'text-health-weight';
      default:
        return 'text-gray-600';
    }
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return '🩸';
      case 'blood_sugar':
        return '🩸';
      case 'weight':
        return '⚖️';
      case 'heart_rate':
        return '❤️';
      case 'temperature':
        return '🌡️';
      default:
        return '📊';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Health Data</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Recent Health Data</h3>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No health data recorded yet</p>
          <Link to="/health-data" className="btn-primary">
            Add Your First Entry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Recent Health Data</h3>
        <Link to="/health-data" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
          View All →
        </Link>
      </div>
      
      <div className="space-y-3">
        {recentData.map((data) => (
          <div key={data.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-xl">{getMetricIcon(data.metric_type)}</span>
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {data.metric_type.replace('_', ' ')}
                </p>
                <p className={`text-sm font-semibold ${getMetricColor(data.metric_type)}`}>
                  {getMetricDisplay(data)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">
                {format(new Date(data.recorded_at), 'MMM d, h:mm a')}
              </p>
              {data.notes && (
                <p className="text-xs text-gray-600 mt-1 max-w-xs truncate">
                  {data.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentHealthData; 