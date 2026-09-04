import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://devsync-api-nxq1.onrender.com';

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
    if (data.success && data.data) {
      const accessToken = data.data.accessToken || data.data.tokens?.accessToken;
      const newRefreshToken = data.data.refreshToken || data.data.tokens?.refreshToken;

      if (accessToken) await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (newRefreshToken) await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
      return accessToken ?? null;
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

  let data: any = {};
  try {
    data = await response.json();
  } catch {
    // If response body is not JSON (e.g. 502 Bad Gateway, Cloudflare HTML, network error page)
    data = { error: `Server error (status ${response.status})` };
  }

  if (!response.ok) {
    throw new Error(data.error ?? data.message ?? `Request failed with status ${response.status}`);
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
  getDashboardOverview: () => request('/api/dashboard/overview'),
  getProjectDashboard: (projectId: string) => request(`/api/projects/${projectId}/dashboard`),
  getProjectWorkload: (projectId: string) => request(`/api/projects/${projectId}/dashboard/workload`),
  getProjectProductivity: (projectId: string, range = '30d') =>
    request(`/api/projects/${projectId}/dashboard/productivity?range=${range}`),

  // Projects
  getProjects: (params?: { teamId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.teamId) query.append('teamId', params.teamId);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return request(`/api/projects${queryString ? `?${queryString}` : ''}`);
  },
  getProject: (id: string) => request(`/api/projects/${id}`),
  createProject: (body: { name: string; description?: string; teamId?: string }) =>
    request('/api/projects', { method: 'POST', body: JSON.stringify(body) }),
  updateProject: (id: string, body: { name?: string; description?: string }) =>
    request(`/api/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archiveProject: (id: string) => request(`/api/projects/${id}/archive`, { method: 'POST' }),
  restoreProject: (id: string) => request(`/api/projects/${id}/restore`, { method: 'POST' }),
  deleteProject: (id: string) => request(`/api/projects/${id}`, { method: 'DELETE' }),
  leaveProject: (id: string) => request(`/api/projects/${id}/leave`, { method: 'POST' }),

  // Project Members
  getProjectMembers: (projectId: string) => request(`/api/projects/${projectId}/members`),
  addProjectMember: (projectId: string, body: { userId: string; role?: string }) =>
    request(`/api/projects/${projectId}/members`, { method: 'POST', body: JSON.stringify(body) }),
  updateProjectMemberRole: (projectId: string, userId: string, role: string) =>
    request(`/api/projects/${projectId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeProjectMember: (projectId: string, userId: string) =>
    request(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' }),

  // Tasks
  getTasks: (projectId: string) => request(`/api/tasks?projectId=${projectId}`),
  getMyTasks: () => request('/api/tasks/my'),
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

  // Files
  getProjectFiles: (projectId: string, params?: { sort?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.sort) query.append('sort', params.sort);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString();
    return request(`/api/projects/${projectId}/files${queryString ? `?${queryString}` : ''}`);
  },
  deleteProjectFile: (fileId: string) => request(`/api/files/${fileId}`, { method: 'DELETE' }),
  renameProjectFile: (fileId: string, originalName: string) =>
    request(`/api/files/${fileId}`, { method: 'PATCH', body: JSON.stringify({ originalName }) }),

  // Search
  search: (query: string, params?: { type?: string; projectId?: string; page?: number; limit?: number }) => {
    const qParams = new URLSearchParams();
    qParams.append('q', query);
    if (params?.type) qParams.append('type', params.type);
    if (params?.projectId) qParams.append('projectId', params.projectId);
    if (params?.page) qParams.append('page', String(params.page));
    if (params?.limit) qParams.append('limit', String(params.limit));
    return request(`/api/search?${qParams.toString()}`);
  },

  // Activity
  getProjectActivity: (projectId: string) => request(`/api/activity/project/${projectId}`),

  // Users
  getMe: () => request('/api/users/me'),
  updateMe: (body: { name?: string; bio?: string; profileImage?: string }) =>
    request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),
  changePassword: (body: { currentPassword: string; newPassword: string; confirmNewPassword: string }) =>
    request('/api/users/me/password', { method: 'PATCH', body: JSON.stringify(body) }),
  searchUsers: (query: string) => request(`/api/users/search?q=${encodeURIComponent(query)}`),
  getProfile: (userId: string) => request(`/api/users/${userId}`),
  updateProfile: (body: { name?: string; bio?: string }) =>
    request('/api/users/me', { method: 'PATCH', body: JSON.stringify(body) }),

  // Teams
  getTeams: () => request('/api/teams'),
  getTeam: (id: string) => request(`/api/teams/${id}`),
  createTeam: (body: { name: string; description?: string }) =>
    request('/api/teams', { method: 'POST', body: JSON.stringify(body) }),
  updateTeam: (id: string, body: { name?: string; description?: string }) =>
    request(`/api/teams/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTeam: (id: string) => request(`/api/teams/${id}`, { method: 'DELETE' }),

  // Team Members
  getTeamMembers: (teamId: string) => request(`/api/teams/${teamId}/members`),
  updateMemberRole: (teamId: string, userId: string, role: string) =>
    request(`/api/teams/${teamId}/members/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (teamId: string, userId: string) =>
    request(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),

  // Invitations
  createTeamInvitation: (teamId: string, body: { email?: string; userId?: string; role?: string }) =>
    request(`/api/teams/${teamId}/invitations`, { method: 'POST', body: JSON.stringify(body) }),
  getInvitations: () => request('/api/invitations'),
  acceptInvitation: (id: string) => request(`/api/invitations/${id}/accept`, { method: 'POST' }),
  rejectInvitation: (id: string) => request(`/api/invitations/${id}/reject`, { method: 'POST' }),
};

export { STORAGE_KEYS, API_BASE_URL };
