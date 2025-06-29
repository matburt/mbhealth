import api from './api';
import { User } from '../types/auth';

export interface UpdateProfileRequest {
  full_name?: string;
  email?: string;
  timezone?: string;
  ai_context_profile?: string;
}

class UserService {
  /**
   * Update user profile
   */
  async updateProfile(userId: number, data: UpdateProfileRequest): Promise<User> {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  }

  /**
   * Get user profile
   */
  async getProfile(userId: number): Promise<User> {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }
}

export const userService = new UserService();