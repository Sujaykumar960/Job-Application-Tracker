import { AuthResponse, LoginCredentials, RegisterData, UserProfile } from '../types';
import apiClient from './client';

const TOKEN_KEY = 'careerx_auth_token';
const USER_KEY = 'careerx_auth_user';
const USERS_DB_KEY = 'careerx_users_db';

// Helper to simulate realistic network delay
const delay = (ms: number = 350) => new Promise((resolve) => setTimeout(resolve, ms));

// Pre-seeded default demo user
const DEFAULT_DEMO_USER: UserProfile = {
  id: 'usr-demo-1',
  name: 'Alex Rivera',
  email: 'alex.rivera@devmail.io',
  role: 'seeker',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
  headline: 'Full Stack & Distributed Systems Engineer',
  bio: 'Building low-latency sync engines and high-throughput microservices. Passionate about developer tooling and architecture.',
  location: 'Seattle, WA',
  atsScore: 88,
  skills: ['React', 'TypeScript', 'Node.js', 'Go', 'Python', 'PostgreSQL', 'Docker', 'Tailwind CSS'],
};

function getRegisteredUsers(): Array<{ email: string; passwordHash: string; user: UserProfile }> {
  const data = localStorage.getItem(USERS_DB_KEY);
  if (!data) {
    const initial = [
      {
        email: 'alex.rivera@devmail.io',
        passwordHash: 'password123',
        user: DEFAULT_DEMO_USER,
      },
      {
        email: 'recruiter@stripe.com',
        passwordHash: 'password123',
        user: {
          id: 'usr-recruiter-1',
          name: 'Sarah Lin',
          email: 'recruiter@stripe.com',
          role: 'recruiter' as const,
          avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop',
          headline: 'Staff Technical Recruiter @ Stripe',
          bio: 'Hiring high-impact infrastructure and platform engineering talent.',
          location: 'San Francisco, CA',
          skills: ['Talent Sourcing', 'Technical Interviewing', 'Pipeline Strategy'],
        },
      },
    ];
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<any>('/auth/login', credentials);
      const token = res.data.token || res.data.access_token;
      const user = res.data.user;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return {
        token,
        user,
      };
    } catch (apiErr: any) {
      // If backend returned an error response (e.g. 401 Bad Credentials), raise it directly
      if (apiErr.response?.data?.message || apiErr.response?.data?.detail) {
        throw new Error(apiErr.response.data.message || apiErr.response.data.detail);
      }

      // Offline fallback
      await delay(350);
      const email = credentials.email.trim().toLowerCase();
      const users = getRegisteredUsers();
      const existing = users.find((u) => u.email.toLowerCase() === email);

      if (!existing || existing.passwordHash !== credentials.password) {
        throw new Error('Invalid email or password. Check credentials and try again.');
      }

      const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
        JSON.stringify({ sub: existing.user.id, email: existing.user.email, role: existing.user.role })
      )}.mock_signature_careerx_${Date.now()}`;

      localStorage.setItem(TOKEN_KEY, mockJwt);
      localStorage.setItem(USER_KEY, JSON.stringify(existing.user));

      return {
        token: mockJwt,
        user: existing.user,
      };
    }
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const res = await apiClient.post<any>('/auth/register', data);
      const token = res.data.token || res.data.access_token;
      const user = res.data.user;

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));

      return {
        token,
        user,
      };
    } catch (apiErr: any) {
      if (apiErr.response?.data?.message || apiErr.response?.data?.detail) {
        throw new Error(apiErr.response.data.message || apiErr.response.data.detail);
      }

      // Offline fallback
      await delay(350);
      const email = data.email.trim().toLowerCase();
      const users = getRegisteredUsers();
      const exists = users.some((u) => u.email.toLowerCase() === email);

      if (exists) {
        throw new Error('An account with this email address already exists.');
      }

      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: data.name.trim(),
        email,
        role: data.role,
        avatar: undefined,
        headline: data.role === 'seeker' ? 'Software Engineer' : 'Technical Recruiter',
        bio: '',
        location: 'Remote',
        atsScore: 75,
        skills: ['TypeScript', 'React', 'Problem Solving'],
      };

      users.push({
        email,
        passwordHash: data.password,
        user: newUser,
      });

      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));

      const mockJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(
        JSON.stringify({ sub: newUser.id, email: newUser.email, role: newUser.role })
      )}.mock_signature_careerx_${Date.now()}`;

      localStorage.setItem(TOKEN_KEY, mockJwt);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));

      return {
        token: mockJwt,
        user: newUser,
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    try {
      const res = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
      return res.data;
    } catch (apiErr: any) {
      if (apiErr.response?.data?.message || apiErr.response?.data?.detail) {
        throw new Error(apiErr.response.data.message || apiErr.response.data.detail);
      }
      await delay(300);
      const users = getRegisteredUsers();
      const exists = users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (!exists) {
        throw new Error('No account found with that email address.');
      }
      return {
        message: 'Password reset link has been dispatched to your email address.',
      };
    }
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const res = await apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword });
      return res.data;
    } catch (apiErr: any) {
      if (apiErr.response?.data?.message || apiErr.response?.data?.detail) {
        throw new Error(apiErr.response.data.message || apiErr.response.data.detail);
      }
      await delay(300);
      if (!token) {
        throw new Error('Invalid or expired reset token.');
      }
      return {
        message: 'Your password has been successfully reset. You may now sign in.',
      };
    }
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
