import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { notesService } from '../services/notes';
import { NoteCreate } from '../types/notes';

interface AddNoteFormProps {
  healthDataId: number;
  onNoteAdded?: () => void;
}

interface AddNoteFormData {
  content: string;
}

const AddNoteForm: React.FC<AddNoteFormProps> = ({ healthDataId, onNoteAdded }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddNoteFormData>();

  const onSubmit = async (data: AddNoteFormData) => {
    setIsSubmitting(true);
    try {
      const noteData: NoteCreate = {
        health_data_id: healthDataId,
        content: data.content.trim(),
      };

      await notesService.createNote(noteData);
      toast.success('Note added successfully');
      reset();
      setIsExpanded(false);
      onNoteAdded?.();
    } catch (error: unknown) {
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full text-left p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors text-gray-500 hover:text-gray-700"
      >
        <div className="flex items-center">
          <span className="text-lg mr-2">📝</span>
          <span>Add a note...</span>
        </div>
      </button>
    );
  }

  return (
    <div className="border-2 border-gray-200 rounded-lg p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Note
          </label>
          <textarea
            {...register('content', { 
              required: 'Note content is required',
              minLength: {
                value: 1,
                message: 'Note cannot be empty'
              }
            })}
            className="input-field w-full"
            rows={3}
            placeholder="Add your note here..."
            autoFocus
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              reset();
            }}
            className="btn-secondary text-sm px-3 py-1"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary text-sm px-3 py-1"
          >
            {isSubmitting ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddNoteForm; 