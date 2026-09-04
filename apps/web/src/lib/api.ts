import axios from 'axios';

export function getApiBaseUrl(): string {
  // 1. If an environment variable is explicitly provided, always honor it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }

  // 2. In browser environment: if running on localhost/127.0.0.1, use port 5000; otherwise relative /api or default Render backend
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // For hosted environments without NEXT_PUBLIC_API_URL, use same-origin proxy or cloud backend
    return window.location.origin;
  }

  // 3. SSR fallback
  return 'http://localhost:5000';
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
