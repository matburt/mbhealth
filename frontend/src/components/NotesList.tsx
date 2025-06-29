import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTimezone } from '../contexts/TimezoneContext';
import { notesService } from '../services/notes';
import { Note } from '../types/notes';

interface NotesListProps {
  healthDataId: number;
  onNotesChange?: () => void;
}

const NotesList: React.FC<NotesListProps> = ({ healthDataId, onNotesChange }) => {
  const { user } = useAuth();
  const { formatDateTime } = useTimezone();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [healthDataId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const notesData = await notesService.getNotes(healthDataId);
      setNotes(notesData);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (note: Note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;

    try {
      await notesService.updateNote(editingId, { content: editContent });
      toast.success('Note updated successfully');
      setEditingId(null);
      setEditContent('');
      fetchNotes();
      onNotesChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to update note');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setDeletingId(id);
    try {
      await notesService.deleteNote(id);
      toast.success('Note deleted successfully');
      fetchNotes();
      onNotesChange?.();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete note');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500">No notes yet</p>
        <p className="text-sm text-gray-400">Add a note to track additional information</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="bg-gray-50 rounded-lg p-4">
          {editingId === note.id ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="input-field w-full"
                rows={3}
                placeholder="Enter your note..."
              />
              <div className="flex justify-end space-x-2">
                <button
                  onClick={handleCancelEdit}
                  className="btn-secondary text-sm px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary text-sm px-3 py-1"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {note.user_id === user?.id ? 'You' : 'User'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(note.created_at, 'datetime')}
                  </span>
                  {note.updated_at !== note.created_at && (
                    <span className="text-xs text-gray-400">(edited)</span>
                  )}
                </div>
                {note.user_id === user?.id && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(note)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-xs text-red-600 hover:text-red-700"
                      disabled={deletingId === note.id}
                    >
                      {deletingId === note.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
            </>
          )}
        </div>
      ))}
    </div>
  );
};

export default NotesList; 