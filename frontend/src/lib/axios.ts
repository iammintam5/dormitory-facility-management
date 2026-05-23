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
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth();
    }

    return Promise.reject(error);
  },
);
