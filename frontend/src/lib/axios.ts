import axios from 'axios';
import { clearStoredAuth, getStoredAuth } from './auth-storage';

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const storedAuth = getStoredAuth();

  if (storedAuth?.accessToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${storedAuth.accessToken}`;
    console.log('[AxiosInterceptor] Request made with Bearer token:', {
      url: config.url,
      method: config.method,
      userCode: storedAuth.user?.userCode,
      role: storedAuth.user?.role,
      tokenLength: storedAuth.accessToken.length,
    });
  } else {
    console.warn('[AxiosInterceptor] No stored auth found for request:', {
      url: config.url,
      method: config.method,
    });
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log('[AxiosInterceptor] Response received:', {
      url: response.config.url,
      status: response.status,
      dataLength: JSON.stringify(response.data).length,
    });
    return response;
  },
  (error) => {
    console.error('[AxiosInterceptor] Response error:', {
      url: error.config?.url,
      status: error.response?.status,
      errorMessage: error.message,
      code: error.code,
    });

    if (error.response?.status === 401) {
      clearStoredAuth();
    }

    return Promise.reject(error);
  },
);
