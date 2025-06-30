import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { careTeamsService } from '../services/careTeams';
import { CareTeamInvite } from '../types/careTeams';

interface InviteCareTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  careTeamId?: number;
  onInviteSent?: () => void;
}

interface InviteCareTeamMemberFormData {
  email: string;
  role: 'provider' | 'viewer';
  specialty?: string;
}

const InviteCareTeamMemberModal: React.FC<InviteCareTeamMemberModalProps> = ({ 
  isOpen, 
  onClose,
  careTeamId,
  onInviteSent
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<InviteCareTeamMemberFormData>({
    defaultValues: {
      role: 'provider'
    }
  });

  const onSubmit = async (data: InviteCareTeamMemberFormData) => {
    if (!careTeamId) {
      setError('No care team selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const inviteData: CareTeamInvite = {
        care_team_id: careTeamId,
        email: data.email,
        role: data.role,
        specialty: data.specialty || undefined
      };

      await careTeamsService.inviteMember(inviteData);
      
      reset();
      onInviteSent?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      setError(error.response?.data?.detail || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Care Provider</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address'
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="provider@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              id="role"
              {...register('role', { required: 'Role is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="provider">Provider</option>
              <option value="viewer">Viewer</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Providers can add notes and data. Viewers can only view information.
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
              Specialty (Optional)
            </label>
            <input
              type="text"
              id="specialty"
              {...register('specialty')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Cardiology, Physical Therapy"
            />
            <p className="mt-1 text-sm text-gray-500">
              Their medical specialty or area of expertise.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                  Sending...
                </>
              ) : (
                'Send Invitation'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteCareTeamMemberModal; 