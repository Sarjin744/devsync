import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, STORAGE_KEYS } from '../services/api';
import { disconnectMobileSocket } from '../services/socket';
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStoredUser = useCallback(async () => {
    try {
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

      if (storedUser && token) {
        setUser(JSON.parse(storedUser) as UserPublic);
        // Refresh user data from server
        try {
          const freshUser = await api.getCurrentUser() as UserPublic;
          setUser(freshUser);
          await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
        } catch {
          // Token might be expired, clear storage
          await clearStorage();
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStoredUser();
  }, [loadStoredUser]);

  const clearStorage = async () => {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ACCESS_TOKEN,
      STORAGE_KEYS.REFRESH_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  };

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password }) as {
      user: UserPublic;
      accessToken?: string;
      refreshToken?: string;
      tokens?: { accessToken: string; refreshToken: string };
    };

    const accessToken = response.accessToken || response.tokens?.accessToken;
    const refreshToken = response.refreshToken || response.tokens?.refreshToken;

    if (accessToken) await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (response.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      setUser(response.user);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    const response = await api.register({ name, email, password }) as {
      user: UserPublic;
      accessToken?: string;
      refreshToken?: string;
      tokens?: { accessToken: string; refreshToken: string };
    };

    const accessToken = response.accessToken || response.tokens?.accessToken;
    const refreshToken = response.refreshToken || response.tokens?.refreshToken;

    if (accessToken) await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    if (refreshToken) await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    if (response.user) {
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      setUser(response.user);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore logout errors
    }
    disconnectMobileSocket();
    await clearStorage();
    setUser(null);
  };

  const refreshUser = async () => {
    const freshUser = await api.getCurrentUser() as UserPublic;
    setUser(freshUser);
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(freshUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
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

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
