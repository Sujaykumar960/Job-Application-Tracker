import { apiClient } from './client';
import { PublicUserProfile, UserProfile } from '../types';

export const userApi = {
  /**
   * Fetch user profile (authenticated user or specific userId)
   */
  getProfile: async (userId?: string): Promise<UserProfile> => {
    const url = userId ? `/users/${userId}` : '/users/me';
    const response = await apiClient.get<UserProfile>(url);
    return response.data;
  },

  /**
   * Fetch sanitized public profile (LinkedIn-style) for another user or yourself
   */
  getPublicProfile: async (userId: string): Promise<PublicUserProfile> => {
    const response = await apiClient.get<PublicUserProfile>(`/users/${userId}/profile`);
    return response.data;
  },

  /**
   * Update profile fields (bio, headline, skills, location)
   */
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const response = await apiClient.patch<UserProfile>('/users/me', data);
    return response.data;
  },

  /**
   * Update recruiter privacy directives & profile visibility
   */
  updatePrivacySettings: async (settings: any): Promise<any> => {
    const response = await apiClient.put<any>('/users/me/privacy', settings);
    return response.data;
  },

  /**
   * Upload user profile avatar photo
   */
  uploadAvatar: async (formData: FormData): Promise<{ avatarUrl: string }> => {
    const response = await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};

export default userApi;
