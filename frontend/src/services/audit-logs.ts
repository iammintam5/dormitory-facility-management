import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { getMockAuditLogs, getMockAuditLogDetail } from '../lib/frontend-mock';

export type AuditLogItem = {
  id: string;
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  content: string;
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
  try {
    const response = await apiClient.get('/audit-logs', { params });
    return unwrapApiResponse<AuditLogsResponse>(response.data);
  } catch {
    return getMockAuditLogs(params as any) as unknown as AuditLogsResponse;
  }
}

export async function getAuditLogDetail(id: string) {
  try {
    const response = await apiClient.get(`/audit-logs/${id}`);
    return unwrapApiResponse<AuditLogItem>(response.data);
  } catch {
    return getMockAuditLogDetail(id) as unknown as AuditLogItem;
  }
}
