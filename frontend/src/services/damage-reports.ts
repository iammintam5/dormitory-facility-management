import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { DamageReport, DamageReportsResponse, DamageReportPriority } from '../types/damage-reports';
import {
  getMockDamageReportsPaginated,
  getMockDamageReport,
  createMockDamageReport,
  runMockDamageWorkflow,
} from '../lib/frontend-mock';

export async function getDamageReports(params?: Record<string, string | number | boolean | undefined>) {
  try {
    const response = await apiClient.get('/damage-reports', { params });
    return unwrapApiResponse<DamageReportsResponse>(response.data);
  } catch {
    const result = await getMockDamageReportsPaginated(params);
    return result as unknown as DamageReportsResponse;
  }
}

export async function getStudentDamageReports(params?: Record<string, string | number | boolean | undefined>) {
  try {
    const response = await apiClient.get('/damage-reports', { params });
    return unwrapApiResponse<DamageReportsResponse>(response.data);
  } catch {
    const result = await getMockDamageReportsPaginated(params);
    return result as unknown as DamageReportsResponse;
  }
}

export async function getDamageReportById(id: string | number) {
  try {
    const response = await apiClient.get(`/damage-reports/${id}`);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    const result = await getMockDamageReport(Number(id));
    return result as unknown as DamageReport;
  }
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
  try {
    const response = await apiClient.post('/damage-reports', payload);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    const result = await createMockDamageReport({
      assetId: Number(payload.assetId ?? 1),
      roomId: Number(payload.roomId ?? 1),
      description: payload.description,
      priority: payload.priority,
    });
    return result as unknown as DamageReport;
  }
}

export async function acceptDamageReport(id: string | number) {
  try {
    const response = await apiClient.post(`/damage-reports/${id}/accept`);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    await runMockDamageWorkflow(Number(id), 'accept');
    const result = await getMockDamageReport(Number(id));
    return result as unknown as DamageReport;
  }
}

export async function rejectDamageReport(id: string | number) {
  try {
    const response = await apiClient.post(`/damage-reports/${id}/reject`);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    await runMockDamageWorkflow(Number(id), 'reject');
    const result = await getMockDamageReport(Number(id));
    return result as unknown as DamageReport;
  }
}

export async function startProcessingReport(id: string | number) {
  try {
    const response = await apiClient.post(`/damage-reports/${id}/start-processing`);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    await runMockDamageWorkflow(Number(id), 'start-processing');
    const result = await getMockDamageReport(Number(id));
    return result as unknown as DamageReport;
  }
}

export async function completeReport(id: string | number) {
  try {
    const response = await apiClient.post(`/damage-reports/${id}/complete`);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    await runMockDamageWorkflow(Number(id), 'complete');
    const result = await getMockDamageReport(Number(id));
    return result as unknown as DamageReport;
  }
}

export async function cancelReport(id: string | number) {
  try {
    const response = await apiClient.post(`/damage-reports/${id}/cancel`);
    return unwrapApiResponse<DamageReport>(response.data);
  } catch {
    await runMockDamageWorkflow(Number(id), 'cancel');
    const result = await getMockDamageReport(Number(id));
    return result as unknown as DamageReport;
  }
}

