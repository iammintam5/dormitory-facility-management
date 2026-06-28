import { apiClient, unwrapApiResponse } from '../lib/api-client';

export type AssetStatus = 
  | 'AVAILABLE' 
  | 'IN_USE' 
  | 'DAMAGED' 
  | 'UNDER_MAINTENANCE' 
  | 'PENDING_LIQUIDATION' 
  | 'LIQUIDATED' 
  | 'INACTIVE';

export type AssetCondition = 'GOOD' | 'NEED_CHECK' | 'DAMAGED';

export type AssetRecord = {
  id: string;
  assetCode: string;
  assetName: string;
  categoryCode: string;
  categoryName: string;
  buildingCode: string | null;
  buildingName: string | null;
  roomCode: string | null;
  roomName: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  status: AssetStatus;
  statusLabel: string;
  condition: AssetCondition;
  conditionLabel: string;
  purchaseCost?: string | number | null;
  purchaseDate?: string | null;
  warrantyExpiryDate?: string | null;
  serialNumber?: string | null;
  description?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type AssetsResponse = {
  items: AssetRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export async function getAssets(params?: Record<string, string | number | boolean | undefined>) {
  const response = await apiClient.get('/assets', { params });
  return unwrapApiResponse<AssetsResponse>(response.data);
}

export async function createAsset(payload: {
  categoryId?: string;
  categoryCode?: string;
  buildingId?: string;
  buildingCode?: string;
  roomId?: string;
  roomCode?: string;
  supplierId?: string;
  supplierCode?: string;
  assetCode: string;
  assetName: string;
  serialNumber?: string;
  status?: AssetStatus;
  condition?: AssetCondition;
  description?: string;
  notes?: string;
  purchaseDate?: string;
  warrantyExpiryDate?: string;
  purchaseCost?: number | string;
}) {
  const response = await apiClient.post('/assets', payload);
  return unwrapApiResponse<AssetRecord>(response.data);
}

export async function createBulkAssets(payload: {
  categoryId?: string;
  categoryCode?: string;
  prefix: string;
  startNumber: number;
  endNumber: number;
  assetName: string;
  description?: string;
}) {
  const response = await apiClient.post('/assets/bulk', payload);
  // Backend returns count or an array depending on implementation
  return unwrapApiResponse<{ count: number }>(response.data);
}

export async function updateAsset(
  id: string,
  payload: Partial<Parameters<typeof createAsset>[0]>
) {
  const response = await apiClient.patch(`/assets/${id}`, payload);
  return unwrapApiResponse<AssetRecord>(response.data);
}

export async function deleteAsset(id: string) {
  const response = await apiClient.delete(`/assets/${id}`);
  return unwrapApiResponse<{ message: string }>(response.data);
}

export async function getAssetHistory(id: string) {
  const response = await apiClient.get(`/assets/${id}/history`);
  return unwrapApiResponse<Array<{
    action: string;
    actionLabel: string;
    oldStatus: AssetStatus | null;
    oldStatusLabel: string | null;
    newStatus: AssetStatus | null;
    newStatusLabel: string | null;
    content: string;
    createdAt: string;
  }>>(response.data);
}
