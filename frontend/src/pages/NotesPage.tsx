import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { notesService } from '../services/notes';
import { healthService } from '../services/health';
import { Note } from '../types/notes';
import { HealthData } from '../types/health';
import { useAuth } from '../contexts/AuthContext';

interface NoteWithHealthData extends Note {
  health_data: HealthData;
}

const NotesPage: React.FC = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteWithHealthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, mine, others
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      // Get all health data first
      const healthData = await healthService.getHealthData();
      
      // Get notes for each health data entry
      const notesPromises = healthData.map(async (data) => {
        try {
          const dataNotes = await notesService.getNotes(data.id);
          return dataNotes.map(note => ({
            ...note,
            health_data: data
          }));
        } catch (error) {
          console.error(`Failed to fetch notes for health data ${data.id}:`, error);
          return [];
        }
      });

      const allNotes = await Promise.all(notesPromises);
      const flattenedNotes = allNotes.flat().sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setNotes(flattenedNotes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

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

  const filteredNotes = notes.filter(note => {
    // Filter by ownership
    if (filter === 'mine' && note.user_id !== user?.id) return false;
    if (filter === 'others' && note.user_id === user?.id) return false;
    
    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        note.content.toLowerCase().includes(searchLower) ||
        note.health_data.metric_type.toLowerCase().includes(searchLower) ||
        getMetricDisplay(note.health_data).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg p-6">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-20 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Notes</h1>
        <p className="text-gray-600">
          View and manage notes across all your health data entries
        </p>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field w-full"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Notes</option>
            <option value="mine">My Notes</option>
            <option value="others">Others' Notes</option>
          </select>
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm || filter !== 'all' ? 'No notes found' : 'No notes yet'}
          </h3>
          <p className="text-gray-500">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Add notes to your health data entries to get started'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredNotes.map((note) => (
            <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getMetricIcon(note.health_data.metric_type)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900 capitalize">
                      {note.health_data.metric_type.replace('_', ' ')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {getMetricDisplay(note.health_data)} • {format(new Date(note.health_data.recorded_at), 'MMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {note.user_id === user?.id ? 'You' : 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                  {note.updated_at !== note.created_at && (
                    <p className="text-xs text-gray-400">(edited)</p>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
            <p className="text-sm text-gray-600">Total Notes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-600">
              {notes.filter(note => note.user_id === user?.id).length}
            </p>
            <p className="text-sm text-gray-600">My Notes</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {notes.filter(note => note.user_id !== user?.id).length}
            </p>
            <p className="text-sm text-gray-600">Others' Notes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesPage; 