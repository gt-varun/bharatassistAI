import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const getStorage = (): Storage | null => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
};

let accessToken: string | null = getStorage()?.getItem('access_token') ?? null;
let refreshToken: string | null = getStorage()?.getItem('refresh_token') ?? null;

export const hasAccessToken = () => Boolean(accessToken);

export const setAuthTokens = (access: string, refresh: string) => {
  accessToken = access;
  refreshToken = refresh;
  const storage = getStorage();
  storage?.setItem('access_token', access);
  storage?.setItem('refresh_token', refresh);
};

export const clearAuthTokens = () => {
  accessToken = null;
  refreshToken = null;
  const storage = getStorage();
  storage?.removeItem('access_token');
  storage?.removeItem('refresh_token');
};

// Automatic Bearer Token Attachment, plus the reader's language on every
// request — scheme records carry verified translations, and the API returns
// them in whichever language the interface is currently in.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  const lang = getStorage()?.getItem('bharatassist_language');
  if (lang && config.headers) {
    config.headers['Accept-Language'] = lang;
  }

  return config;
});

// Refresh-on-401 Handling Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && refreshToken && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        if (res.data?.success && res.data?.data?.accessToken) {
          setAuthTokens(res.data.data.accessToken, res.data.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        // The application is behind sign-in, so a dead session has to end at
        // the door. RequireAuth picks this up and redirects.
        clearAuthTokens();
        getStorage()?.removeItem('bharatassist_user');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('bharatassist:signed-out'));
        }
      }
    }
    return Promise.reject(error);
  }
);
