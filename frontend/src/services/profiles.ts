import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { type BackendAuthUser } from '../types/auth';

export async function getMyProfile() {
  const response = await apiClient.get('/profiles/me');
  return unwrapApiResponse<BackendAuthUser>(response.data);
}

export async function updateMyProfile(payload: {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
}) {
  const response = await apiClient.patch('/profiles/me', payload);
  return unwrapApiResponse<BackendAuthUser>(response.data);
}
