import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { type BackendAuthUser, type LoginResponse } from '../types/auth';

export async function login(payload: { username: string; password: string }) {
  const response = await apiClient.post('/auth/login', payload);
  return unwrapApiResponse<LoginResponse>(response.data);
}

export async function logout() {
  return { loggedOut: true };
}

export async function getMe() {
  const response = await apiClient.get('/auth/me');
  return unwrapApiResponse<BackendAuthUser>(response.data);
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  const response = await apiClient.post('/auth/change-password', payload);
  return unwrapApiResponse<{ changed: boolean }>(response.data);
}
