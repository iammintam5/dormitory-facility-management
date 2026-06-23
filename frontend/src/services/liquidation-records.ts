import { apiClient, unwrapApiResponse } from '../lib/api-client';
import type { LiquidationRecord, LiquidationRecordsResponse, LiquidationRecordExportResponse } from '../types/liquidation-records';

export async function getLiquidationRecords(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get('/liquidation-records', { params });
  return unwrapApiResponse<LiquidationRecordsResponse>(response.data);
}

export async function getLiquidationRecord(id: number) {
  const response = await apiClient.get(`/liquidation-records/${id}`);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function updateLiquidationRecord(id: number, payload: { liquidationDate?: string; note?: string }) {
  const response = await apiClient.patch(`/liquidation-records/${id}`, payload);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function createLiquidationRecord(payload: {
  assetId: number;
  liquidationDate: string;
  assetCondition: string;
  reason: string;
  estimatedRemainingValue?: number;
  note?: string;
}) {
  const response = await apiClient.post('/liquidation-records', payload);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function submitApprovalLiquidation(id: number) {
  const response = await apiClient.post(`/liquidation-records/${id}/submit-approval`);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function approveLiquidation(id: number) {
  const response = await apiClient.post(`/liquidation-records/${id}/approve`);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function rejectLiquidation(id: number) {
  const response = await apiClient.post(`/liquidation-records/${id}/reject`);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function completeLiquidation(id: number) {
  const response = await apiClient.post(`/liquidation-records/${id}/complete`);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function cancelLiquidation(id: number) {
  const response = await apiClient.post(`/liquidation-records/${id}/cancel`);
  return unwrapApiResponse<LiquidationRecord>(response.data);
}

export async function getLiquidationRecordExport(id: number) {
  const response = await apiClient.get(`/liquidation-records/${id}/export`);
  return unwrapApiResponse<LiquidationRecordExportResponse>(response.data);
}
