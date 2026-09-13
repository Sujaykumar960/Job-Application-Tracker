import { AuthResponse, LoginCredentials, RegisterData, UserProfile } from '../types';
import apiClient from './client';

const TOKEN_KEY = 'careerx_auth_token';
const USER_KEY = 'careerx_auth_user';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/login', credentials);
    const token = res.data.token || res.data.access_token;
    const user = res.data.user;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
      token,
      user,
    };
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const res = await apiClient.post<any>('/auth/register', data);
    const token = res.data.token || res.data.access_token;
    const user = res.data.user;

    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return {
      token,
      user,
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return res.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await apiClient.post<{ message: string }>('/auth/reset-password', {
      token,
      password: newPassword,
      newPassword,
    });
    return res.data;
  },

  async getMe(): Promise<UserProfile> {
    const res = await apiClient.get<UserProfile>('/auth/me');
    return res.data;
  },

  async refreshToken(): Promise<{ token: string }> {
    const res = await apiClient.post<{ token: string }>('/auth/refresh');
    return res.data;
  },

  getCurrentUser(): UserProfile | null {
    const userJson = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !userJson) return null;
    try {
      return JSON.parse(userJson);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
};

export default authApi;
