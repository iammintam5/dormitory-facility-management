import axios from 'axios';
import { clearStoredAuth, getStoredAuth } from './auth-storage';

export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const storedAuth = getStoredAuth();
  if (storedAuth?.accessToken) {
    config.headers.Authorization = `Bearer ${storedAuth.accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearStoredAuth();
    }

    return Promise.reject(error);
  },
);

export function unwrapApiResponse<T>(payload: ApiEnvelope<T> | T): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    Object.prototype.hasOwnProperty.call(payload, 'success')
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export function getApiErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra. Vui lòng thử lại.') {
  if (axios.isAxiosError(error)) {
    const message =
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message;

    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}
