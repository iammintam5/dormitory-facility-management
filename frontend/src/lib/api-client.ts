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
      if (error.config?.url && !error.config.url.includes('/auth/login')) {
        clearStoredAuth();
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
      }
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

// --- Global API Cache Implementation ---
const requestCache = new Map<string, { data: any, timestamp: number, promise?: Promise<any> }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

const originalGet = apiClient.get;

apiClient.get = function (url: string, config?: any) {
  const cacheKey = url + (config?.params ? JSON.stringify(config.params) : '');
  
  if (requestCache.has(cacheKey)) {
    const cached = requestCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      if (cached.promise) return cached.promise;
      // Trả về data y hệt format của Axios Response
      return Promise.resolve({ 
        data: cached.data, 
        status: 200, 
        statusText: 'OK', 
        headers: {}, 
        config: config || {} as any 
      });
    }
  }

  // Deduplicate: Nếu API đang được gọi, trả về promise đang chờ
  const promise = originalGet.call(apiClient, url, config).then((response: any) => {
    requestCache.set(cacheKey, {
      data: response.data,
      timestamp: Date.now()
    });
    return response;
  }).catch((error: any) => {
    requestCache.delete(cacheKey);
    throw error;
  });

  requestCache.set(cacheKey, { data: null, timestamp: Date.now(), promise });

  return promise;
};

// Intercept mutations to invalidate cache
const methodsToIntercept = ['post', 'put', 'patch', 'delete'] as const;
methodsToIntercept.forEach((method) => {
  const originalMethod = apiClient[method];
  apiClient[method] = function (...args: any[]) {
    requestCache.clear();
    return (originalMethod as any).apply(apiClient, args);
  };
});
