import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { getMockManagedUsers, getMockRoles, createMockManagedUser, updateMockManagedUser, lockMockUser, unlockMockUser, resetMockUserPassword } from '../lib/frontend-mock';

export type UserRoleOption = {
  id: string;
  code: 'ADMIN' | 'MANAGER' | 'STUDENT';
  name: string;
};

export type ManagedUser = {
  id: string;
  fullName: string;
  username: string;
  studentCode: string | null;
  email: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  role: UserRoleOption;
  profile: {
    id: string;
    avatarUrl: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    address: string | null;
    faculty: string | null;
    className: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    notes: string | null;
  } | null;
};

export type UsersResponse = {
  items: ManagedUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function getUsers(params: Record<string, string | number | boolean | undefined>) {
  try {
    const response = await apiClient.get('/users', { params });
    return unwrapApiResponse<UsersResponse>(response.data);
  } catch {
    return getMockManagedUsers(params as any) as unknown as UsersResponse;
  }
}

export async function getRoles() {
  try {
    const response = await apiClient.get('/users/roles');
    return unwrapApiResponse<UserRoleOption[]>(response.data);
  } catch {
    return getMockRoles() as unknown as UserRoleOption[];
  }
}

export async function createUser(payload: {
  roleId: string;
  fullName: string;
  username: string;
  password: string;
  email?: string;
  phone?: string;
  studentCode?: string;
}) {
  try {
    const response = await apiClient.post('/users', payload);
    return unwrapApiResponse<ManagedUser>(response.data);
  } catch {
    return createMockManagedUser(payload) as unknown as ManagedUser;
  }
}

export async function updateUser(
  id: string,
  payload: {
    roleId?: string;
    fullName?: string;
    username?: string;
    password?: string;
    email?: string | null;
    phone?: string | null;
    studentCode?: string | null;
  },
) {
  try {
    const response = await apiClient.patch(`/users/${id}`, payload);
    return unwrapApiResponse<ManagedUser>(response.data);
  } catch {
    return updateMockManagedUser(id, payload) as unknown as ManagedUser;
  }
}

export async function lockUser(id: string) {
  try {
    const response = await apiClient.patch(`/users/${id}/lock`);
    return unwrapApiResponse<ManagedUser>(response.data);
  } catch {
    return lockMockUser(id) as unknown as ManagedUser;
  }
}

export async function unlockUser(id: string) {
  try {
    const response = await apiClient.patch(`/users/${id}/unlock`);
    return unwrapApiResponse<ManagedUser>(response.data);
  } catch {
    return unlockMockUser(id) as unknown as ManagedUser;
  }
}

export async function resetUserPassword(id: string, newPassword: string) {
  try {
    const response = await apiClient.post(`/users/${id}/reset-password`, { newPassword });
    return unwrapApiResponse<{ userId: string }>(response.data);
  } catch {
    return resetMockUserPassword(id, newPassword);
  }
}
