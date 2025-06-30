import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import { careTeamsService } from '../services/careTeams';
import { CareTeamInvitation } from '../types/careTeams';

interface CareTeamInvitationsListProps {}

const CareTeamInvitationsList: React.FC<CareTeamInvitationsListProps> = () => {
  const [invitations, setInvitations] = useState<CareTeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      const data = await careTeamsService.getInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Failed to load invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invitationId: number) => {
    try {
      setActionLoading(invitationId);
      await careTeamsService.acceptInvitation(invitationId);
      await loadInvitations(); // Refresh the list
    } catch (error) {
      console.error('Failed to accept invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (invitationId: number) => {
    try {
      setActionLoading(invitationId);
      await careTeamsService.declineInvitation(invitationId);
      await loadInvitations(); // Refresh the list
    } catch (error) {
      console.error('Failed to decline invitation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-gray-500 mt-2">Loading invitations...</p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-6">
        <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
        <p className="text-gray-500 mt-2">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">
                {invitation.care_team.name}
              </h3>
              {invitation.care_team.specialty && (
                <p className="text-sm text-gray-600 mt-1">
                  Specialty: {invitation.care_team.specialty}
                </p>
              )}
              <div className="mt-2 flex items-center text-sm text-gray-500">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {invitation.role}
                </span>
                {invitation.specialty && (
                  <span className="ml-2">Role: {invitation.specialty}</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Invited {new Date(invitation.created_at).toLocaleDateString()}
              </p>
            </div>
            
            <div className="flex space-x-2 ml-4">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={actionLoading === invitation.id}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {actionLoading === invitation.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Accept
                  </>
                )}
              </button>
              
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={actionLoading === invitation.id}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {actionLoading === invitation.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <>
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Decline
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CareTeamInvitationsList; 