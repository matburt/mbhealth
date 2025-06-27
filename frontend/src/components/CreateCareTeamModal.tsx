import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { careTeamsService } from '../services/careTeams';
import { CareTeamCreate } from '../types/careTeams';

interface CreateCareTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCareTeamCreated: () => void;
}

interface CreateCareTeamFormData {
  name: string;
  description: string;
  specialty: string;
}

const CreateCareTeamModal: React.FC<CreateCareTeamModalProps> = ({ 
  isOpen, 
  onClose, 
  onCareTeamCreated 
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCareTeamFormData>();

  const onSubmit = async (data: CreateCareTeamFormData) => {
    try {
      const careTeamData: CareTeamCreate = {
        name: data.name.trim(),
        description: data.description.trim() || undefined,
        specialty: data.specialty.trim() || undefined,
      };

      await careTeamsService.createCareTeam(careTeamData);
      toast.success('Care team created successfully');
      reset();
      onClose();
      onCareTeamCreated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create care team');
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create New Care Team</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Care Team Name *
            </label>
            <input
              {...register('name', { 
                required: 'Care team name is required',
                minLength: {
                  value: 2,
                  message: 'Care team name must be at least 2 characters'
                }
              })}
              type="text"
              className="input-field w-full"
              placeholder="Enter care team name..."
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialty
            </label>
            <input
              {...register('specialty')}
              type="text"
              className="input-field w-full"
              placeholder="e.g., Cardiology, Primary Care, Endocrinology..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              className="input-field w-full"
              rows={3}
              placeholder="Optional description of the care team..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Care Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCareTeamModal; 