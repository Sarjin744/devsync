'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api';
import type { UserPublic } from '@devsync/shared';

interface AuthContextType {
  user: UserPublic | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'devsync_access_token',
  REFRESH_TOKEN: 'devsync_refresh_token',
  USER: 'devsync_user',
} as const;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        setIsLoading(false);
        return;
      }

      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);
      if (storedUser) {
        setUser(JSON.parse(storedUser) as UserPublic);
      }

      // Fetch fresh user from API
      const response = await apiClient.get('/api/auth/me');
      const freshUser = response.data.data as UserPublic;
      setUser(freshUser);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
    } catch {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    const data = response.data.data;
    const loggedInUser = data.user;
    const accessToken = data.accessToken || data.tokens?.accessToken;
    const refreshToken = data.refreshToken || data.tokens?.refreshToken;

    if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (loggedInUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loggedInUser));
      setUser(loggedInUser as UserPublic);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await apiClient.post('/api/auth/register', { name, email, password });
    const data = response.data.data;
    const newUser = data.user;
    const accessToken = data.accessToken || data.tokens?.accessToken;
    const refreshToken = data.refreshToken || data.tokens?.refreshToken;

    if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (newUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(newUser));
      setUser(newUser as UserPublic);
    }
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignore errors
    }
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setUser(null);
  };

  const refreshUser = async () => {
    const response = await apiClient.get('/api/auth/me');
    const freshUser = response.data.data as UserPublic;
    setUser(freshUser);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isAuthenticated: !!user, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
