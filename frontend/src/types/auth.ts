export type UserRole = 'ADMIN' | 'MANAGER' | 'STUDENT';

export type AuthUser = {
  id: string;
  fullName: string;
  userCode: string;
  role: UserRole;
  email?: string | null;
  phone?: string | null;
  studentCode?: string | null;
  status?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  profile?: {
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

export type LoginResponse = {
  accessToken: string;
  user: BackendAuthUser;
};

export type BackendAuthUser = {
  id: string;
  fullName: string;
  username: string;
  email: string | null;
  phone: string | null;
  studentCode: string | null;
  status: string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    code: UserRole;
    name: string;
  };
  profile: AuthUser['profile'];
};
