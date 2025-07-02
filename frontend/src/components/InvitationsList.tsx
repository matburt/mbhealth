import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { familiesService } from '../services/families';
import { FamilyInvitation } from '../types/families';

interface InvitationsListProps {
  onInvitationHandled: () => void;
}

const InvitationsList: React.FC<InvitationsListProps> = ({ onInvitationHandled }) => {
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    setLoading(true);
    try {
      const data = await familiesService.getInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    setProcessingId(invitationId);
    try {
      await familiesService.acceptInvitation(invitationId);
      toast.success('Invitation accepted successfully');
      fetchInvitations();
      onInvitationHandled();
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to accept invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: number) => {
    setProcessingId(invitationId);
    try {
      await familiesService.declineInvitation(invitationId);
      toast.success('Invitation declined');
      fetchInvitations();
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (invitationId: number) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    setProcessingId(invitationId);
    try {
      await familiesService.cancelInvitation(invitationId);
      toast.success('Invitation cancelled');
      fetchInvitations();
    } catch (error: unknown) {
      toast.error(error.response?.data?.detail || 'Failed to cancel invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'member':
        return 'bg-blue-100 text-blue-800';
      case 'viewer':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <div key={invitation.id} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium text-gray-900">{invitation.family.name}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                  {invitation.role}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Invitation sent to {invitation.email}
              </p>
              <p className="text-xs text-gray-500">
                Sent {format(new Date(invitation.created_at), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
            <div className="flex space-x-2">
              {invitation.status === 'pending' ? (
                <>
                  <button
                    onClick={() => handleAccept(invitation.id)}
                    disabled={processingId === invitation.id}
                    className="btn-primary text-sm px-3 py-1"
                  >
                    {processingId === invitation.id ? 'Accepting...' : 'Accept'}
                  </button>
                  <button
                    onClick={() => handleDecline(invitation.id)}
                    disabled={processingId === invitation.id}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    {processingId === invitation.id ? 'Declining...' : 'Decline'}
                  </button>
                  <button
                    onClick={() => handleCancel(invitation.id)}
                    disabled={processingId === invitation.id}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    {processingId === invitation.id ? 'Cancelling...' : 'Cancel'}
                  </button>
                </>
              ) : (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  invitation.status === 'accepted' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {invitation.status}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default InvitationsList; 