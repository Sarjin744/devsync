import axios from 'axios';

export function getApiBaseUrl(): string {
  // 1. If explicit production environment variable is provided, use it
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes('localhost')) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. If running on a public web domain (Render or any browser)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://devsync-api-nxq1.onrender.com';
    }
  }

  // 3. Localhost fallback for local development
  return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

// Update baseURL dynamically per request if needed
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('devsync_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 — refresh token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('devsync_refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const baseUrl = getApiBaseUrl();
        const response = await axios.post(`${baseUrl}/api/auth/refresh`, {
          refreshToken,
        });

        const tokenData = response.data.data;
        const accessToken = tokenData.accessToken || tokenData.tokens?.accessToken;
        const newRefreshToken = tokenData.refreshToken || tokenData.tokens?.refreshToken;

        if (accessToken) {
          localStorage.setItem('devsync_access_token', accessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem('devsync_refresh_token', newRefreshToken);
        }

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch {
        // Clear auth and redirect
        localStorage.removeItem('devsync_access_token');
        localStorage.removeItem('devsync_refresh_token');
        localStorage.removeItem('devsync_user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
