import { apiClient, unwrapApiResponse } from '../lib/api-client';
import type { InventoryCheck, InventoryChecksResponse, InventoryCheckExportResponse } from '../types/inventory-checks';

export async function getInventoryChecks(params?: Record<string, string | number | undefined>) {
  const response = await apiClient.get('/inventory-checks', { params });
  return unwrapApiResponse<InventoryChecksResponse>(response.data);
}

export async function getInventoryCheck(id: number) {
  const response = await apiClient.get(`/inventory-checks/${id}`);
  return unwrapApiResponse<InventoryCheck>(response.data);
}

export async function createInventoryCheck(payload: {
  roomId: number;
  checkDate: string;
  generalNote?: string;
}) {
  const response = await apiClient.post('/inventory-checks', payload);
  return unwrapApiResponse<InventoryCheck>(response.data);
}

export async function updateInventoryCheck(id: number, payload: { checkDate?: string; generalNote?: string }) {
  const response = await apiClient.patch(`/inventory-checks/${id}`, payload);
  return unwrapApiResponse<InventoryCheck>(response.data);
}

export async function saveInventoryCheckItems(
  id: number,
  items: Array<{ itemId: number; actualQuantity: number; actualCondition?: string; note?: string }>,
) {
  const response = await apiClient.post(`/inventory-checks/${id}/items`, { items });
  return unwrapApiResponse<InventoryCheck>(response.data);
}

export async function completeInventoryCheck(id: number, generalNote?: string) {
  const response = await apiClient.post(`/inventory-checks/${id}/complete`, { generalNote });
  return unwrapApiResponse<InventoryCheck>(response.data);
}

export async function getInventoryCheckExport(id: number) {
  const response = await apiClient.get(`/inventory-checks/${id}/export`);
  return unwrapApiResponse<InventoryCheckExportResponse>(response.data);
}
