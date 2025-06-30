import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { careTeamsService } from '../services/careTeams';
import { CareTeam, CareTeamMember } from '../types/careTeams';
import CreateCareTeamModal from '../components/CreateCareTeamModal';
import CareTeamCard from '../components/CareTeamCard';
import InviteCareTeamMemberModal from '../components/InviteCareTeamMemberModal';
import CareTeamInvitationsList from '../components/CareTeamInvitationsList';

const CareTeamsPage: React.FC = () => {
  const [careTeams, setCareTeams] = useState<CareTeam[]>([]);
  const [careTeamMembers, setCareTeamMembers] = useState<Record<number, CareTeamMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'care-teams' | 'invitations'>('care-teams');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedCareTeam, setSelectedCareTeam] = useState<CareTeam | null>(null);

  useEffect(() => {
    fetchCareTeams();
  }, []);

  const fetchCareTeams = async () => {
    setLoading(true);
    try {
      const careTeamsData = await careTeamsService.getCareTeams();
      setCareTeams(careTeamsData);

      // Fetch members for each care team
      const membersPromises = careTeamsData.map(async (careTeam) => {
        try {
          const members = await careTeamsService.getCareTeamMembers(careTeam.id);
          return { careTeamId: careTeam.id, members };
        } catch (error) {
          console.error(`Failed to fetch members for care team ${careTeam.id}:`, error);
          return { careTeamId: careTeam.id, members: [] };
        }
      });

      const membersResults = await Promise.all(membersPromises);
      const membersMap: Record<number, CareTeamMember[]> = {};
      membersResults.forEach(({ careTeamId, members }) => {
        membersMap[careTeamId] = members;
      });
      setCareTeamMembers(membersMap);
    } catch (error) {
      console.error('Failed to fetch care teams:', error);
      toast.error('Failed to load care teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCareTeamCreated = () => {
    fetchCareTeams();
  };

  const handleCareTeamUpdated = () => {
    fetchCareTeams();
  };

  const handleMemberRemoved = () => {
    fetchCareTeams();
  };

  const handleInviteMember = (careTeam: CareTeam) => {
    setSelectedCareTeam(careTeam);
    setInviteModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Care Teams</h1>
            <p className="text-gray-600">
              Manage your healthcare provider connections and share health data
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary"
          >
            Create Care Team
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('care-teams')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'care-teams'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Care Teams ({careTeams.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'invitations'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invitations
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'care-teams' ? (
        <div>
          {careTeams.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No care teams yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create a care team to start sharing health data with your healthcare providers
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary"
              >
                Create Your First Care Team
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {careTeams.map((careTeam) => (
                <div key={careTeam.id} className="relative">
                  <CareTeamCard
                    careTeam={careTeam}
                    members={careTeamMembers[careTeam.id] || []}
                    onCareTeamUpdated={handleCareTeamUpdated}
                    onMemberRemoved={handleMemberRemoved}
                  />
                  <div className="absolute top-6 right-6">
                    <button
                      onClick={() => handleInviteMember(careTeam)}
                      className="btn-secondary text-sm px-3 py-1"
                    >
                      Invite Provider
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Pending Invitations</h2>
            <p className="text-gray-600">
              Accept or decline invitations to join care teams
            </p>
          </div>
          <CareTeamInvitationsList />
        </div>
      )}

      {/* Modals */}
      <CreateCareTeamModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCareTeamCreated={handleCareTeamCreated}
      />

      {selectedCareTeam && (
        <InviteCareTeamMemberModal
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedCareTeam(null);
          }}
          careTeamId={selectedCareTeam.id}
          onInviteSent={() => {
            setInviteModalOpen(false);
            setSelectedCareTeam(null);
            // Optionally refresh the care team members list
          }}
        />
      )}
    </div>
  );
};

export default CareTeamsPage; 