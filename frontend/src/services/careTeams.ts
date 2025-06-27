import api from './api';
import { 
  CareTeam, 
  CareTeamCreate, 
  CareTeamUpdate, 
  CareTeamMember, 
  CareTeamInvite, 
  CareTeamInvitation 
} from '../types/careTeams';

export const careTeamsService = {
  // Care team management
  async getCareTeams(): Promise<CareTeam[]> {
    const response = await api.get<CareTeam[]>('/care-teams/');
    return response.data;
  },

  async getCareTeam(id: number): Promise<CareTeam> {
    const response = await api.get<CareTeam>(`/care-teams/${id}`);
    return response.data;
  },

  async createCareTeam(careTeam: CareTeamCreate): Promise<CareTeam> {
    const response = await api.post<CareTeam>('/care-teams/', careTeam);
    return response.data;
  },

  async updateCareTeam(id: number, careTeam: CareTeamUpdate): Promise<CareTeam> {
    const response = await api.put<CareTeam>(`/care-teams/${id}`, careTeam);
    return response.data;
  },

  async deleteCareTeam(id: number): Promise<void> {
    await api.delete(`/care-teams/${id}`);
  },

  // Care team members
  async getCareTeamMembers(careTeamId: number): Promise<CareTeamMember[]> {
    const response = await api.get<CareTeamMember[]>(`/care-teams/${careTeamId}/members`);
    return response.data;
  },

  async removeCareTeamMember(careTeamId: number, memberId: number): Promise<void> {
    await api.delete(`/care-teams/${careTeamId}/members/${memberId}`);
  },

  async updateMemberRole(careTeamId: number, memberId: number, role: string, specialty?: string): Promise<CareTeamMember> {
    const response = await api.put<CareTeamMember>(`/care-teams/${careTeamId}/members/${memberId}`, { 
      role, 
      specialty 
    });
    return response.data;
  },

  // Invitations
  async inviteMember(invite: CareTeamInvite): Promise<void> {
    await api.post('/care-teams/invite', invite);
  },

  async getInvitations(): Promise<CareTeamInvitation[]> {
    const response = await api.get<CareTeamInvitation[]>('/care-teams/invitations');
    return response.data;
  },

  async acceptInvitation(invitationId: number): Promise<void> {
    await api.post(`/care-teams/invitations/${invitationId}/accept`);
  },

  async declineInvitation(invitationId: number): Promise<void> {
    await api.post(`/care-teams/invitations/${invitationId}/decline`);
  },

  async cancelInvitation(invitationId: number): Promise<void> {
    await api.delete(`/care-teams/invitations/${invitationId}`);
  }
}; 