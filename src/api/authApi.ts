import { apiClient, withFallback } from './client';
import { LoginCredentials, RegisterData, AuthResponse, UserProfile } from '../types';

const MOCK_USER: UserProfile = {
  id: 'usr_001',
  name: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  role: 'seeker',
  headline: 'Distributed Systems & Backend Platform Engineer',
  location: 'Seattle, WA',
  atsScore: 88,
  skills: ['Go', 'Kafka', 'PostgreSQL', 'Redis Lua', 'Docker', 'Kubernetes'],
};

const MOCK_AUTH_RESPONSE: AuthResponse = {
  token: 'mock-jwt-token-alex-rivera-careerx-session',
  user: MOCK_USER,
};

export const authApi = {
  /**
   * Log in user with credentials, receiving JWT token and user profile
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return withFallback(
      apiClient.post<AuthResponse>('/auth/login', credentials),
      MOCK_AUTH_RESPONSE
    );
  },

  /**
   * Register a new seeker or recruiter account
   */
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const fallback: AuthResponse = {
      token: `mock-jwt-token-${Date.now()}`,
      user: {
        id: `usr_${Date.now()}`,
        name: data.name,
        email: data.email,
        role: data.role,
        skills: ['TypeScript', 'React', 'Go'],
        atsScore: 82,
      },
    };

    return withFallback(
      apiClient.post<AuthResponse>('/auth/register', data),
      fallback
    );
  },

  /**
   * Fetch authenticated user details from JWT token
   */
  getMe: async (): Promise<UserProfile> => {
    return withFallback(
      apiClient.get<UserProfile>('/auth/me'),
      MOCK_USER
    );
  },

  /**
   * Log out active session
   */
  logout: async (): Promise<{ success: boolean }> => {
    return withFallback(
      apiClient.post<{ success: boolean }>('/auth/logout'),
      { success: true }
    );
  },

  /**
   * Refresh JWT authentication token
   */
  refreshToken: async (): Promise<{ token: string }> => {
    return withFallback(
      apiClient.post<{ token: string }>('/auth/refresh'),
      { token: 'refreshed-mock-jwt-token' }
    );
  },
};

export default authApi;
