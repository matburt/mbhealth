export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  timezone: string;
  ai_context_profile?: string;
  weight_unit: 'kg' | 'lbs';
  temperature_unit: 'c' | 'f';
  height_unit: 'cm' | 'ft';
  created_at: string;
  updated_at: string;
} 