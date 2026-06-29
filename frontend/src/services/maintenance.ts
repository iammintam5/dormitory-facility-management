import { apiClient, unwrapApiResponse } from '../lib/api-client';
import type { MaintenancePlan, MaintenanceRecord } from '../types/maintenance';

export type MaintenanceRecordsResponse = {
  items: MaintenanceRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MaintenanceDashboardSummary = {
  overdueCount: number;
  dueSoonCount: number;
  activePlans: number;
  totalRecords: number;
};

export async function getMaintenancePlans() {
  const response = await apiClient.get('/maintenance/plans');
  return unwrapApiResponse<MaintenancePlan[]>(response.data);
}

export async function getMaintenanceRecords(page = 1, pageSize = 10) {
  const response = await apiClient.get('/maintenance/records', { params: { page, pageSize } });
  return unwrapApiResponse<MaintenanceRecordsResponse>(response.data);
}

export async function updateMaintenanceRecord(id: number, payload: {
  maintenanceDate?: string;
  maintenanceType?: string;
  content?: string;
  nextMaintenanceDate?: string;
  cost?: number;
  materialNote?: string;
  note?: string;
}) {
  const response = await apiClient.patch(`/maintenance/records/${id}`, payload);
  return unwrapApiResponse<MaintenanceRecord>(response.data);
}

export async function completeMaintenanceRecord(id: number, payload: {
  resultStatus: string;
  returnMode?: string;
  content?: string;
  nextMaintenanceDate?: string;
  cost?: number;
  materialNote?: string;
  note?: string;
}) {
  const response = await apiClient.patch(`/maintenance/records/${id}/complete`, payload);
  return unwrapApiResponse<MaintenanceRecord>(response.data);
}

export async function createMaintenanceRecord(payload: {
  planId?: number;
  assetId: number;
  maintenanceDate: string;
  maintenanceType: string;
  content: string;
  resultStatus?: string;
  nextMaintenanceDate?: string;
  cost?: number;
  materialNote?: string;
  note?: string;
  damageReportId?: number;

}) {
  const response = await apiClient.post('/maintenance/records', payload);
  return unwrapApiResponse<MaintenanceRecord>(response.data);
}

export async function getMaintenanceDashboard() {
  const response = await apiClient.get('/maintenance/dashboard');
  return unwrapApiResponse<MaintenanceDashboardSummary>(response.data);
}

export async function getMaintenanceHistory(assetId: number) {
  const response = await apiClient.get(`/maintenance/history/${assetId}`);
  return unwrapApiResponse<MaintenanceRecord[]>(response.data);
}

export async function startMaintenanceRecord(id: number) {
  const response = await apiClient.patch(`/maintenance/records/${id}/start`);
  return unwrapApiResponse<MaintenanceRecord>(response.data);
}

export async function cancelMaintenanceRecord(id: number, payload?: { reason?: string }) {
  const response = await apiClient.patch(`/maintenance/records/${id}/cancel`, payload);
  return unwrapApiResponse<MaintenanceRecord>(response.data);
}

export async function createDirectCompletedRecord(payload: {
  damageReportId: number;
  performedBy?: number;
  maintenanceDate?: string;
  content: string;
  resultStatus: string;
  cost?: number;
  materialNote?: string;
  note?: string;
}) {
  const response = await apiClient.post('/maintenance/records/complete-direct', payload);
  return unwrapApiResponse<MaintenanceRecord>(response.data);
}
