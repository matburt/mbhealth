import React, { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { familiesService } from '../services/families';
import { Family, FamilyMember } from '../types/families';
import { useAuth } from '../contexts/AuthContext';

interface FamilyCardProps {
  family: Family;
  members: FamilyMember[];
  onFamilyUpdated: () => void;
  onMemberRemoved: () => void;
  onInviteMember: () => void;
}

const FamilyCard: React.FC<FamilyCardProps> = ({ 
  family, 
  members, 
  onFamilyUpdated, 
  onMemberRemoved,
  onInviteMember
}) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingMember, setRemovingMember] = useState<number | null>(null);

  const isAdmin = members.find(m => m.user_id === user?.id)?.role === 'admin';
  const isCreator = family.created_by === user?.id;

  const handleDeleteFamily = async () => {
    if (!confirm('Are you sure you want to delete this family? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await familiesService.deleteFamily(family.id);
      toast.success('Family deleted successfully');
      onFamilyUpdated();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete family');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Are you sure you want to remove this member from the family?')) {
      return;
    }

    setRemovingMember(memberId);
    try {
      await familiesService.removeFamilyMember(family.id, memberId);
      toast.success('Member removed successfully');
      onMemberRemoved();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {family.name}
            </h3>
            {family.description && (
              <p className="text-gray-600 text-sm mb-2">{family.description}</p>
            )}
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
              <span>Created {format(new Date(family.created_at), 'MMM d, yyyy')}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={onInviteMember}
              className="btn-secondary text-sm px-3 py-1"
            >
              Invite Member
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              {isExpanded ? 'Hide Details' : 'View Details'}
            </button>
            {(isAdmin || isCreator) && (
              <button
                onClick={handleDeleteFamily}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-6">
          <h4 className="font-medium text-gray-900 mb-4">Family Members</h4>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {member.user.full_name?.[0] || member.user.username[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user.full_name || member.user.username}
                    </p>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                    {member.role}
                  </span>
                  {isAdmin && member.user_id !== user?.id && (
                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingMember === member.id}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      {removingMember === member.id ? 'Removing...' : 'Remove'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {members.length === 0 && (
            <p className="text-gray-500 text-center py-4">No members yet</p>
          )}
        </div>
      )}
    </div>
  );
};

export default FamilyCard; 