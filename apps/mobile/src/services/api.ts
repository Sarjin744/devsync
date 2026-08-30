import AsyncStorage from '@react-native-async-storage/async-storage';

// In production, point to your Render URL
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@devsync/access_token',
  REFRESH_TOKEN: '@devsync/refresh_token',
  USER: '@devsync/user',
} as const;

async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.success && data.data?.tokens) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.data.tokens.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.tokens.refreshToken);
      return data.data.tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  let token = await getAccessToken();

  const makeRequest = async (accessToken: string | null) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  };

  let response = await makeRequest(token);

  // Try refreshing token on 401
  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await makeRequest(newToken);
    }
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? 'An error occurred');
  }

  return data.data as T;
}

export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string }) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () => request('/api/auth/logout', { method: 'POST' }),

  getCurrentUser: () => request('/api/auth/me'),

  // Dashboard
  getDashboard: () => request('/api/dashboard'),

  // Projects
  getProjects: () => request('/api/projects'),
  getProject: (id: string) => request(`/api/projects/${id}`),
  createProject: (body: { name: string; description?: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(body) }),

  // Tasks
  getTasks: (projectId: string) => request(`/api/tasks?projectId=${projectId}`),
  getTask: (id: string) => request(`/api/tasks/${id}`),
  createTask: (body: object) =>
    request('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTaskStatus: (id: string, status: string) =>
    request(`/api/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Messages
  getMessages: (projectId: string, page = 1) =>
    request(`/api/messages/project/${projectId}?page=${page}&limit=50`),

  // Notifications
  getNotifications: () => request('/api/notifications'),
  getUnreadCount: () => request('/api/notifications/unread-count'),
  markAsRead: (id: string) => request(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllAsRead: () => request('/api/notifications/read-all', { method: 'PATCH' }),

  // Activity
  getProjectActivity: (projectId: string) => request(`/api/activity/project/${projectId}`),

  // Users
  getProfile: (userId: string) => request(`/api/users/${userId}`),
  updateProfile: (body: { name?: string; bio?: string }) =>
    request('/api/users/profile', { method: 'PUT', body: JSON.stringify(body) }),
};

export { STORAGE_KEYS, API_BASE_URL };
