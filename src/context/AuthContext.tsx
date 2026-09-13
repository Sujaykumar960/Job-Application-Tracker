import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile, RoleType, LoginCredentials, RegisterData } from '../types';
import { authApi } from '../api/auth';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: RoleType;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: RoleType) => void;
  toggleRole: () => void;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => authApi.getCurrentUser());
  const [token, setToken] = useState<string | null>(() => authApi.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth state on mount and revalidate with real backend session
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = authApi.getToken();
      const storedUser = authApi.getCurrentUser();

      if (!storedToken) {
        if (isMounted) {
          setToken(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      // Optimistically retain stored session to avoid UI flash
      if (storedUser && isMounted) {
        setToken(storedToken);
        setUser(storedUser);
      }

      // Verify token freshness against real backend /auth/me
      try {
        const freshProfile = await authApi.getMe();
        if (isMounted) {
          setUser(freshProfile);
          setToken(storedToken);
          localStorage.setItem('careerx_auth_user', JSON.stringify(freshProfile));
        }
      } catch (err: any) {
        // If 401 Unauthorized, token has expired or user was revoked
        if (err?.response?.status === 401) {
          if (isMounted) {
            setToken(null);
            setUser(null);
          }
          localStorage.removeItem('careerx_auth_token');
          localStorage.removeItem('careerx_auth_user');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Global listener for token expiration / unauthorized responses
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('careerx_auth_token');
      localStorage.removeItem('careerx_auth_user');
    };
    window.addEventListener('careerx:unauthorized', handleUnauthorized);

    return () => {
      isMounted = false;
      window.removeEventListener('careerx:unauthorized', handleUnauthorized);
    };
  }, []);

  const clearError = () => setError(null);

  const login = async (credentials: LoginCredentials) => {
    setError(null);
    try {
      const response = await authApi.login(credentials);
      setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    }
  };

  const register = async (data: RegisterData) => {
    setError(null);
    try {
      const response = await authApi.register(data);
      setToken(response.token);
      setUser(response.user);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = (newRole: RoleType) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      localStorage.setItem('careerx_auth_user', JSON.stringify(updatedUser));
    }
  };

  const toggleRole = () => {
    const currentRole = user?.role || 'seeker';
    const nextRole: RoleType = currentRole === 'seeker' ? 'recruiter' : 'seeker';
    switchRole(nextRole);
  };

  const role: RoleType = user?.role || 'seeker';
  const isAuthenticated = Boolean(token && user);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        switchRole,
        toggleRole,
        error,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
