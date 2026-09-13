import { apiClient } from './client';
import { LoginCredentials, RegisterData, AuthResponse, UserProfile } from '../types';

export const authApi = {
  /**
   * Log in user with credentials, receiving JWT token and user profile
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  /**
   * Register a new seeker or recruiter account
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  /**
   * Fetch authenticated user details from JWT token
   */
  getMe: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  /**
   * Log out active session
   */
  logout: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/auth/logout');
    return response.data;
  },

  /**
   * Refresh JWT authentication token
   */
  refreshToken: async (): Promise<{ token: string }> => {
    const response = await apiClient.post<{ token: string }>('/auth/refresh');
    return response.data;
  },
};

export default authApi;
