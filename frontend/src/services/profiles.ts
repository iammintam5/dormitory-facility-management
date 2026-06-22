import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { getMockMyProfile, updateMockMyProfile } from '../lib/frontend-mock';
import { type BackendAuthUser } from '../types/auth';

export async function getMyProfile() {
  try {
    const response = await apiClient.get('/profiles/me');
    return unwrapApiResponse<BackendAuthUser>(response.data);
  } catch {
    return getMockMyProfile() as unknown as BackendAuthUser;
  }
}

export async function updateMyProfile(payload: {
  fullName?: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  notes?: string | null;
}) {
  try {
    const response = await apiClient.patch('/profiles/me', payload);
    return unwrapApiResponse<BackendAuthUser>(response.data);
  } catch {
    return updateMockMyProfile(payload) as unknown as BackendAuthUser;
  }
}
