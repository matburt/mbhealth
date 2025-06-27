import api from './api';
import { 
  Family, 
  FamilyCreate, 
  FamilyUpdate, 
  FamilyMember, 
  FamilyInvite, 
  FamilyInvitation 
} from '../types/families';

export const familiesService = {
  // Family management
  async getFamilies(): Promise<Family[]> {
    const response = await api.get<Family[]>('/families/');
    return response.data;
  },

  async getFamily(id: number): Promise<Family> {
    const response = await api.get<Family>(`/families/${id}`);
    return response.data;
  },

  async createFamily(family: FamilyCreate): Promise<Family> {
    const response = await api.post<Family>('/families/', family);
    return response.data;
  },

  async updateFamily(id: number, family: FamilyUpdate): Promise<Family> {
    const response = await api.put<Family>(`/families/${id}`, family);
    return response.data;
  },

  async deleteFamily(id: number): Promise<void> {
    await api.delete(`/families/${id}`);
  },

  // Family members
  async getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
    const response = await api.get<FamilyMember[]>(`/families/${familyId}/members`);
    return response.data;
  },

  async removeFamilyMember(familyId: number, memberId: number): Promise<void> {
    await api.delete(`/families/${familyId}/members/${memberId}`);
  },

  async updateMemberRole(familyId: number, memberId: number, role: string): Promise<FamilyMember> {
    const response = await api.put<FamilyMember>(`/families/${familyId}/members/${memberId}`, { role });
    return response.data;
  },

  // Invitations
  async inviteMember(invite: FamilyInvite): Promise<void> {
    await api.post('/families/invite', invite);
  },

  async getInvitations(): Promise<FamilyInvitation[]> {
    const response = await api.get<FamilyInvitation[]>('/families/invitations');
    return response.data;
  },

  async acceptInvitation(invitationId: number): Promise<void> {
    await api.post(`/families/invitations/${invitationId}/accept`);
  },

  async declineInvitation(invitationId: number): Promise<void> {
    await api.post(`/families/invitations/${invitationId}/decline`);
  },

  async cancelInvitation(invitationId: number): Promise<void> {
    await api.delete(`/families/invitations/${invitationId}`);
  }
}; 