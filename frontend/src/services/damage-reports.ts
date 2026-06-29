import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { DamageReport, DamageReportsResponse, DamageReportPriority } from '../types/damage-reports';

export async function getDamageReports(params?: Record<string, string | number | boolean | undefined>) {
  const response = await apiClient.get('/damage-reports', { params });
  return unwrapApiResponse<DamageReportsResponse>(response.data);
}

export async function getStudentDamageReports(params?: Record<string, string | number | boolean | undefined>) {
  const response = await apiClient.get('/damage-reports', { params });
  return unwrapApiResponse<DamageReportsResponse>(response.data);
}

export async function getDamageReportById(id: string | number) {
  const response = await apiClient.get(`/damage-reports/${id}`);
  return unwrapApiResponse<DamageReport>(response.data);
}

export async function updateDamageReport(id: string | number, payload: {
  assetId?: number;
  description?: string;
  priority?: DamageReportPriority;
}) {
  const response = await apiClient.patch(`/damage-reports/${id}`, payload);
  return unwrapApiResponse<DamageReport>(response.data);
}

export async function createDamageReport(payload: {
  assetId?: string | number;
  assetCode?: string;
  buildingId?: string | number;
  buildingCode?: string;
  roomId?: string | number;
  roomCode?: string;
  title?: string;
  priority: DamageReportPriority;
  description: string;
  attachments?: string[];
}) {
  const response = await apiClient.post('/damage-reports', payload);
  return unwrapApiResponse<DamageReport>(response.data);
}

export async function reviewDamageReport(id: string | number) {
  const response = await apiClient.patch(`/damage-reports/${id}/review`);
  return unwrapApiResponse<DamageReport>(response.data);
}

export async function approveDamageReport(id: string | number) {
  const response = await apiClient.patch(`/damage-reports/${id}/approve`);
  return unwrapApiResponse<DamageReport>(response.data);
}

export async function rejectDamageReport(id: string | number, reason?: string) {
  const response = await apiClient.patch(`/damage-reports/${id}/reject`, { reason });
  return unwrapApiResponse<DamageReport>(response.data);
}

export async function cancelReport(id: string | number, reason?: string) {
  const response = await apiClient.patch(`/damage-reports/${id}/cancel`, { reason });
  return unwrapApiResponse<DamageReport>(response.data);
}
