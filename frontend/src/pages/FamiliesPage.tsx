import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { familiesService } from '../services/families';
import { Family, FamilyMember } from '../types/families';
import CreateFamilyModal from '../components/CreateFamilyModal';
import FamilyCard from '../components/FamilyCard';
import InviteMemberModal from '../components/InviteMemberModal';
import InvitationsList from '../components/InvitationsList';

const FamiliesPage: React.FC = () => {
  const [families, setFamilies] = useState<Family[]>([]);
  const [familyMembers, setFamilyMembers] = useState<Record<number, FamilyMember[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'families' | 'invitations'>('families');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);

  useEffect(() => {
    fetchFamilies();
  }, []);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const familiesData = await familiesService.getFamilies();
      setFamilies(familiesData);

      // Fetch members for each family
      const membersPromises = familiesData.map(async (family) => {
        try {
          const members = await familiesService.getFamilyMembers(family.id);
          return { familyId: family.id, members };
        } catch (error) {
          console.error(`Failed to fetch members for family ${family.id}:`, error);
          return { familyId: family.id, members: [] };
        }
      });

      const membersResults = await Promise.all(membersPromises);
      const membersMap: Record<number, FamilyMember[]> = {};
      membersResults.forEach(({ familyId, members }) => {
        membersMap[familyId] = members;
      });
      setFamilyMembers(membersMap);
    } catch (error) {
      console.error('Failed to fetch families:', error);
      toast.error('Failed to load families');
    } finally {
      setLoading(false);
    }
  };

  const handleFamilyCreated = () => {
    fetchFamilies();
  };

  const handleFamilyUpdated = () => {
    fetchFamilies();
  };

  const handleMemberRemoved = () => {
    fetchFamilies();
  };

  const handleInviteSent = () => {
    // Refresh families to show updated member count
    fetchFamilies();
  };

  const handleInvitationHandled = () => {
    // Refresh families when invitation is accepted
    fetchFamilies();
  };

  const handleInviteMember = (family: Family) => {
    setSelectedFamily(family);
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Families</h1>
            <p className="text-gray-600">
              Manage your family connections and share health data
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary"
          >
            Create Family
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('families')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'families'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Families ({families.length})
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
      {activeTab === 'families' ? (
        <div>
          {families.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No families yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create a family to start sharing health data with your loved ones
              </p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="btn-primary"
              >
                Create Your First Family
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {families.map((family) => (
                <div key={family.id} className="relative">
                  <FamilyCard
                    family={family}
                    members={familyMembers[family.id] || []}
                    onFamilyUpdated={handleFamilyUpdated}
                    onMemberRemoved={handleMemberRemoved}
                  />
                  <div className="absolute top-6 right-6">
                    <button
                      onClick={() => handleInviteMember(family)}
                      className="btn-secondary text-sm px-3 py-1"
                    >
                      Invite Member
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
              Accept or decline invitations to join families
            </p>
          </div>
          <InvitationsList onInvitationHandled={handleInvitationHandled} />
        </div>
      )}

      {/* Modals */}
      <CreateFamilyModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onFamilyCreated={handleFamilyCreated}
      />

      {selectedFamily && (
        <InviteMemberModal
          familyId={selectedFamily.id}
          familyName={selectedFamily.name}
          isOpen={inviteModalOpen}
          onClose={() => {
            setInviteModalOpen(false);
            setSelectedFamily(null);
          }}
          onInviteSent={handleInviteSent}
        />
      )}
    </div>
  );
};

export default FamiliesPage; 