import React from 'react';
import { useForm } from 'react-hook-form';

interface InviteCareTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InviteCareTeamMemberFormData {
  email: string;
  role: 'provider' | 'viewer';
  specialty: string;
}

const InviteCareTeamMemberModal: React.FC<InviteCareTeamMemberModalProps> = ({ 
  isOpen, 
  onClose
}) => {
  useForm<InviteCareTeamMemberFormData>({
    defaultValues: {
      role: 'provider'
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Care Provider</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <p className="text-gray-600">Invite functionality will be implemented here.</p>
        </div>
      </div>
    </div>
  );
};

export default InviteCareTeamMemberModal; 