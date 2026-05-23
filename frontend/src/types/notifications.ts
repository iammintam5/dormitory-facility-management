import { User } from './users';

export type NotificationStatus = 'UNREAD' | 'READ';

export type AppNotification = {
  id: number;
  userId: number;
  title: string;
  content: string;
  status: NotificationStatus;
  relatedTable?: string | null;
  relatedId?: number | null;
  createdAt: string;
  readAt?: string | null;
};

export type NotificationsResponse = {
  items: AppNotification[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type UnreadCountResponse = {
  count: number;
};

export type AuditLog = {
  id: number;
  userId?: number | null;
  action: string;
  tableName: string;
  recordId?: number | null;
  oldValue?: string | null;
  newValue?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: User | null;
};

export type AuditLogsResponse = {
  items: AuditLog[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
