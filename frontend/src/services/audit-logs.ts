import { apiClient, unwrapApiResponse } from '../lib/api-client';

export type AuditLogItem = {
  id: string;
  actorUserId: string;
  actorName: string;
  actorUsername: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  content: string;
  oldValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditLogsResponse = {
  items: AuditLogItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function getAuditLogs(params: Record<string, string | number | undefined>) {
  const response = await apiClient.get('/audit-logs', { params });
  return unwrapApiResponse<AuditLogsResponse>(response.data);
}

export async function getAuditLogDetail(id: string) {
  const response = await apiClient.get(`/audit-logs/${id}`);
  return unwrapApiResponse<AuditLogItem>(response.data);
}
