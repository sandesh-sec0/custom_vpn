/**
 * AuthContext — Global authentication state
 *
 * Provides login, logout, and current user state to the entire app.
 * Token is stored in sessionStorage (cleared on tab close).
 * Listens for the 'vpn:auth:expired' event fired by apiClient on 401.
 */

import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '@/api/client';
import type { AuthToken, LoginRequest, User } from '@/api/types';
import {
  clearAllAuth,
  getStoredUser,
  setStoredUser,
} from '@/utils/auth';
import { parseError } from '@/utils/errors';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: User) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => {
    // Rehydrate from sessionStorage on mount
    const user = getStoredUser();
    return {
      isAuthenticated: !!user,
      isLoading: false,
      user,
      error: null,
    };
  });

  // Listen for 401 events fired by the API client
  useEffect(() => {
    function handleAuthExpired() {
      clearAllAuth();
      setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
    }
    window.addEventListener('vpn:auth:expired', handleAuthExpired);
    return () => window.removeEventListener('vpn:auth:expired', handleAuthExpired);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    setState(s => ({ ...s, isLoading: true, error: null }));
    try {
      const data = await apiClient.post<AuthToken>('/auth/login', credentials);
      setStoredUser(data.user);
      setState({ isAuthenticated: true, isLoading: false, user: data.user, error: null });
    } catch (err) {
      setState(s => ({ ...s, isLoading: false, error: parseError(err) }));
      throw err; // Re-throw so LoginForm can react
    }
  }, []);

  const logout = useCallback(async () => {
    setState(s => ({ ...s, isLoading: true }));
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore errors on logout — we clear client state regardless
    } finally {
      clearAllAuth();
      setState({ isAuthenticated: false, isLoading: false, user: null, error: null });
    }
  }, []);

  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  const updateUser = useCallback((user: User) => {
    setStoredUser(user);
    setState(s => ({ ...s, user }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    clearError,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
