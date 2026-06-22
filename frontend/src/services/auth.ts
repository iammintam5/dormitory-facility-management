import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { type BackendAuthUser, type LoginResponse } from '../types/auth';

export async function login(payload: { username: string; password: string }) {
  // Mock authentication logic because backend APIs were deleted by user request
  return new Promise<LoginResponse>((resolve, reject) => {
    setTimeout(() => {
      const u = payload.username;
      const p = payload.password;
      
      let role: 'ADMIN' | 'MANAGER' | 'STUDENT' | null = null;
      let fullName = '';
      
      if (u === 'admin' && p === 'admin') {
        role = 'ADMIN';
        fullName = 'Admin User';
      } else if (u === 'manager' && p === 'manager') {
        role = 'MANAGER';
        fullName = 'Manager User';
      } else if (u === 'student' && p === 'student') {
        role = 'STUDENT';
        fullName = 'Student User';
      }

      if (role) {
        const mockUser: BackendAuthUser = {
          id: `${role.toLowerCase()}-1`,
          username: u,
          email: `${u}@example.com`,
          fullName,
          phone: '0123456789',
          studentCode: role === 'STUDENT' ? 'SV20230001' : null,
          role: { id: `${role.toLowerCase()}-role`, code: role, name: role },
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          profile: {
            id: `${role.toLowerCase()}-profile`,
            avatarUrl: null,
            dateOfBirth: '2000-01-01',
            gender: 'Nam',
            address: 'Hà Nội',
            faculty: null,
            className: null,
            emergencyName: null,
            emergencyPhone: null,
            notes: ''
          }
        };

        resolve({
          accessToken: 'mock-jwt-token-123456',
          user: mockUser
        });
      } else {
        reject(new Error('Invalid credentials'));
      }
    }, 500);
  });
}

export async function logout() {
  return new Promise<{ loggedOut: boolean }>((resolve) => {
    setTimeout(() => {
      resolve({ loggedOut: true });
    }, 200);
  });
}

export async function getMe() {
  // Try to use real API, but if it fails (backend missing), use a generic fallback or read from local storage in auth-context
  try {
    const response = await apiClient.get('/auth/me');
    return unwrapApiResponse<BackendAuthUser>(response.data);
  } catch (error) {
    // If we have a mock token, we just mock the response
    const token = localStorage.getItem('auth_store');
    if (token && token.includes('mock-jwt-token-123456')) {
      const authData = JSON.parse(token);
      const user = authData.user;
      // Reconstruct BackendAuthUser format from the stored AuthUser
      return {
        id: String(user.id),
        username: user.userCode,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        studentCode: user.studentCode,
        role: { id: `${user.role.toLowerCase()}-role`, code: user.role, name: user.role },
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        profile: user.profile ? {
          id: user.profile.id ?? `${user.role.toLowerCase()}-profile`,
          avatarUrl: user.profile.avatarUrl ?? null,
          gender: user.profile.gender ?? null,
          dateOfBirth: user.profile.dateOfBirth ?? null,
          address: user.profile.address ?? null,
          faculty: user.profile.faculty ?? null,
          className: user.profile.className ?? null,
          emergencyName: user.profile.emergencyName ?? null,
          emergencyPhone: user.profile.emergencyPhone ?? null,
          notes: user.profile.notes ?? null,
        } : null
      } as unknown as BackendAuthUser;
    }
    throw error;
  }
}

export async function changePassword(payload: {
  currentPassword: string;
  newPassword: string;
}) {
  return new Promise<{ changed: boolean }>((resolve) => {
    setTimeout(() => resolve({ changed: true }), 500);
  });
}
