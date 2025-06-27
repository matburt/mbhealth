import React from 'react';
import { format } from 'date-fns';
import { HealthData } from '../types/health';
import NotesList from './NotesList';
import AddNoteForm from './AddNoteForm';

interface NotesModalProps {
  healthData: HealthData;
  isOpen: boolean;
  onClose: () => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ healthData, isOpen, onClose }) => {
  const handleNoteChange = () => {};

  const getMetricDisplay = (data: HealthData) => {
    switch (data.metric_type) {
      case 'blood_pressure':
        return `${data.systolic}/${data.diastolic} ${data.unit}`;
      default:
        return `${data.value} ${data.unit}`;
    }
  };

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'blood_pressure':
        return '\ud83e\ude78';
      case 'blood_sugar':
        return '\ud83e\ude78';
      case 'weight':
        return '\u2696\ufe0f';
      case 'heart_rate':
        return '\u2764\ufe0f';
      case 'temperature':
        return '\ud83c\udf21\ufe0f';
      default:
        return '\ud83d\udcca';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Notes</h2>
            <div className="flex items-center mt-1 text-sm text-gray-600">
              <span className="text-lg mr-2">{getMetricIcon(healthData.metric_type)}</span>
              <span className="capitalize">{healthData.metric_type.replace('_', ' ')}</span>
              <span className="mx-2">\u2022</span>
              <span className="font-medium">{getMetricDisplay(healthData)}</span>
              <span className="mx-2">\u2022</span>
              <span>{format(new Date(healthData.recorded_at), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            \u00d7
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Add Note Form */}
            <AddNoteForm
              healthDataId={healthData.id}
              onNoteAdded={handleNoteChange}
            />

            {/* Notes List */}
            <NotesList
              healthDataId={healthData.id}
              onNotesChange={handleNoteChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesModal; 