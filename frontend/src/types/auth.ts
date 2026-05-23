export type UserRole = 'ADMIN' | 'QL_CSVC' | 'STUDENT';

export type AuthUser = {
  id: number;
  fullName: string;
  userCode: string;
  role: UserRole;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};
