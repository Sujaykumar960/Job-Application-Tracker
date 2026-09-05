import { apiClient, withFallback } from './client';
import { UserProfile } from '../types';

const MOCK_PROFILE: UserProfile = {
  id: 'usr_001',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  role: 'seeker',
  headline: 'Distributed Systems & Backend Platform Engineer',
  bio: 'Computer Science graduate from UW with backend internship experience at CloudScale. Passionate about distributed transaction pipelines, Kafka event streaming, and low-latency systems in Go.',
  location: 'Seattle, WA',
  atsScore: 88,
  skills: ['Go', 'Kafka', 'PostgreSQL', 'Redis Lua', 'Docker', 'Kubernetes', 'AWS', 'gRPC'],
};

export const userApi = {
  /**
   * Fetch user profile (authenticated user or specific userId)
   */
  getProfile: async (userId?: string): Promise<UserProfile> => {
    const url = userId ? `/users/${userId}` : '/users/me';
    return withFallback(
      apiClient.get<UserProfile>(url),
      MOCK_PROFILE
    );
  },

  /**
   * Update profile fields (bio, headline, skills, location)
   */
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> => {
    const updated = { ...MOCK_PROFILE, ...data };
    return withFallback(
      apiClient.patch<UserProfile>('/users/me', data),
      updated
    );
  },

  /**
   * Update recruiter privacy directives & profile visibility
   */
  updatePrivacySettings: async (settings: any): Promise<any> => {
    return withFallback(
      apiClient.put<any>('/users/me/privacy', settings),
      { success: true, settings }
    );
  },

  /**
   * Upload user profile avatar photo
   */
  uploadAvatar: async (formData: FormData): Promise<{ avatarUrl: string }> => {
    return withFallback(
      apiClient.post<{ avatarUrl: string }>('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
      { avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }
    );
  },
};

export default userApi;
