import React from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { familiesService } from '../services/families';
import { FamilyInvite } from '../types/families';

interface InviteMemberModalProps {
  familyId: number;
  familyName: string;
  isOpen: boolean;
  onClose: () => void;
  onInviteSent: () => void;
}

interface InviteMemberFormData {
  email: string;
  role: 'member' | 'viewer';
}

const InviteMemberModal: React.FC<InviteMemberModalProps> = ({ 
  familyId, 
  familyName, 
  isOpen, 
  onClose, 
  onInviteSent 
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberFormData>({
    defaultValues: {
      role: 'member'
    }
  });

  const onSubmit = async (data: InviteMemberFormData) => {
    try {
      const inviteData: FamilyInvite = {
        family_id: familyId,
        email: data.email.trim().toLowerCase(),
        role: data.role,
      };

      await familiesService.inviteMember(inviteData);
      toast.success('Invitation sent successfully');
      reset();
      onClose();
      onInviteSent();
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to send invitation');
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
          <h2 className="text-xl font-semibold text-gray-900">Invite Member</h2>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Invite someone to join <span className="font-medium">{familyName}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Please enter a valid email address'
                }
              })}
              type="email"
              className="input-field w-full"
              placeholder="Enter email address..."
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
            <select
              {...register('role', { required: 'Role is required' })}
              className="input-field w-full"
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Members can add/edit health data. Viewers can only view data.
            </p>
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
              {isSubmitting ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteMemberModal; 