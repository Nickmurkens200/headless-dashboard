'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api, getStoredTokens, clearStoredTokens } from '@/lib/api';

interface User {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  role: string;
}

interface AuthConfig {
  authMode: 'NONE' | 'LOCAL' | 'SSO' | 'MIXED';
  allowPublicRegistration: boolean;
  ssoIssuer?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  authConfig: AuthConfig | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens) {
      setUser(null);
      return;
    }

    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      clearStoredTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      try {
        // Get auth config
        const config = await api.getAuthConfig();
        setAuthConfig(config);

        // If auth is disabled, skip user check
        if (config.authMode === 'NONE') {
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Check for existing tokens
        await refreshUser();
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    setUser(response.user);
  };

  const register = async (email: string, password: string, username?: string, displayName?: string) => {
    const response = await api.register(email, password, username, displayName);
    setUser(response.user);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const isAuthenticated = !!user || authConfig?.authMode === 'NONE';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        authConfig,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to require authentication
export function useRequireAuth(redirectTo = '/login') {
  const { isAuthenticated, isLoading, authConfig } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && authConfig?.authMode !== 'NONE') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, authConfig, redirectTo]);

  return { isAuthenticated, isLoading };
}

// Hook to require admin role
export function useRequireAdmin(redirectTo = '/') {
  const { user, isLoading, authConfig } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (authConfig?.authMode === 'NONE') {
        // Allow access if auth is disabled
        return;
      }
      if (!user || user.role !== 'ADMIN') {
        window.location.href = redirectTo;
      }
    }
  }, [user, isLoading, authConfig, redirectTo]);

  return { user, isLoading, isAdmin: user?.role === 'ADMIN' || authConfig?.authMode === 'NONE' };
}
