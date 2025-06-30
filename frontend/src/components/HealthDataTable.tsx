import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { healthService } from '../services/health';
import { HealthData } from '../types/health';
import { useTimezone } from '../contexts/TimezoneContext';
import { useAuth } from '../contexts/AuthContext';
import { createUnitConverter, shouldConvertMetric } from '../utils/units';
import NotesModal from './NotesModal';
import EditHealthDataModal from './EditHealthDataModal';

interface HealthDataTableProps {
  data: HealthData[];
  onDataChange: () => void;
}

const HealthDataTable: React.FC<HealthDataTableProps> = ({ data, onDataChange }) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedHealthData, setSelectedHealthData] = useState<HealthData | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingHealthData, setEditingHealthData] = useState<HealthData | null>(null);
  const { formatDateTime } = useTimezone();
  const { user } = useAuth();

  // Create unit converter based on user preferences
  const unitConverter = user ? createUnitConverter(user) : null;

  const getMetricDisplay = (data: HealthData) => {
    if (!unitConverter) {
      // Fallback if no user/converter available
      switch (data.metric_type) {
        case 'blood_pressure':
          return `${data.systolic}/${data.diastolic} ${data.unit}`;
        default:
          return `${data.value} ${data.unit}`;
      }
    }

    switch (data.metric_type) {
      case 'blood_pressure':
        // Blood pressure doesn't need conversion
        return `${data.systolic}/${data.diastolic} ${data.unit}`;
      default:
        if (shouldConvertMetric(data.metric_type) && data.value !== null) {
          const converted = unitConverter.convertToUserUnits(data.value, data.metric_type, data.unit);
          return `${converted.value.toFixed(1)} ${converted.unit}`;
        } else {
          return `${data.value} ${data.unit}`;
        }
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

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    setDeletingId(id);
    try {
      await healthService.deleteHealthData(id);
      toast.success('Entry deleted successfully');
      onDataChange();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenNotes = (healthData: HealthData) => {
    setSelectedHealthData(healthData);
    setNotesModalOpen(true);
  };

  const handleCloseNotes = () => {
    setNotesModalOpen(false);
    setSelectedHealthData(null);
  };

  const handleEdit = (healthData: HealthData) => {
    setEditingHealthData(healthData);
    setEditModalOpen(true);
  };

  const handleCloseEdit = () => {
    setEditModalOpen(false);
    setEditingHealthData(null);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No health data found</p>
        <p className="text-sm text-gray-400">Try adjusting your filters or add new data</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metric
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date & Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getMetricIcon(entry.metric_type)}</span>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {entry.metric_type.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-sm font-semibold ${getMetricColor(entry.metric_type)}`}>
                    {getMetricDisplay(entry)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDateTime(entry.recorded_at, 'datetime')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {entry.notes ? (
                    <span className="truncate max-w-xs block" title={entry.notes}>
                      {entry.notes}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleOpenNotes(entry)}
                      className="text-blue-600 hover:text-blue-900"
                      title="View/Add Notes"
                    >
                      📝
                    </button>
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={deletingId === entry.id}
                    >
                      {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes Modal */}
      {selectedHealthData && (
        <NotesModal
          healthData={selectedHealthData}
          isOpen={notesModalOpen}
          onClose={handleCloseNotes}
        />
      )}

      {/* Edit Health Data Modal */}
      {editingHealthData && (
        <EditHealthDataModal
          healthData={editingHealthData}
          isOpen={editModalOpen}
          onClose={handleCloseEdit}
          onDataChange={onDataChange}
        />
      )}
    </>
  );
};

export default HealthDataTable; 