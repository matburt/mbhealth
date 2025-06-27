export interface Family {
  id: number;
  name: string;
  description?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: number;
  family_id: number;
  user_id: number;
  role: 'admin' | 'member' | 'viewer';
  joined_at: string;
  user: {
    id: number;
    username: string;
    full_name?: string;
    email: string;
  };
}

export interface FamilyCreate {
  name: string;
  description?: string;
}

export interface FamilyUpdate {
  name?: string;
  description?: string;
}

export interface FamilyInvite {
  family_id: number;
  email: string;
  role: 'member' | 'viewer';
}

export interface FamilyInvitation {
  id: number;
  family_id: number;
  email: string;
  role: 'member' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  family: {
    id: number;
    name: string;
  };
} 