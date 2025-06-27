export interface CareTeam {
  id: number;
  name: string;
  description?: string;
  specialty?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CareTeamMember {
  id: number;
  care_team_id: number;
  user_id: number;
  role: 'admin' | 'provider' | 'viewer';
  specialty?: string;
  joined_at: string;
  user: {
    id: number;
    username: string;
    full_name?: string;
    email: string;
  };
}

export interface CareTeamCreate {
  name: string;
  description?: string;
  specialty?: string;
}

export interface CareTeamUpdate {
  name?: string;
  description?: string;
  specialty?: string;
}

export interface CareTeamInvite {
  care_team_id: number;
  email: string;
  role: 'provider' | 'viewer';
  specialty?: string;
}

export interface CareTeamInvitation {
  id: number;
  care_team_id: number;
  email: string;
  role: 'provider' | 'viewer';
  specialty?: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  care_team: {
    id: number;
    name: string;
    specialty?: string;
  };
} 