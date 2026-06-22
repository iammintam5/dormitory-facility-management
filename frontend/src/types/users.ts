export type Role = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
};

export type User = {
  id: number;
  fullName: string;
  userCode: string;
  email?: string | null;
  phone?: string | null;
  status: 'ACTIVE' | 'LOCKED' | 'INACTIVE';
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  role: Role;
};

export type UserSummary = Pick<User, 'id' | 'fullName' | 'userCode'>;

export type UsersResponse = {
  items: User[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
