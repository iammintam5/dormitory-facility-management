import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { getMockAssetCategoryRecords, createMockAssetCategoryRecord, updateMockAssetCategoryRecord, deleteMockAssetCategoryRecord } from '../lib/frontend-mock';

export type AssetCategoryRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getAssetCategories() {
  try {
    const response = await apiClient.get('/asset-categories');
    return unwrapApiResponse<AssetCategoryRecord[]>(response.data);
  } catch {
    return getMockAssetCategoryRecords() as unknown as AssetCategoryRecord[];
  }
}

export async function createAssetCategory(payload: {
  code: string;
  name: string;
  description?: string | null;
  unit?: string | null;
}) {
  try {
    const response = await apiClient.post('/asset-categories', payload);
    return unwrapApiResponse<AssetCategoryRecord>(response.data);
  } catch {
    return createMockAssetCategoryRecord(payload) as unknown as AssetCategoryRecord;
  }
}

export async function updateAssetCategory(
  id: string,
  payload: {
    code?: string;
    name?: string;
    description?: string | null;
    unit?: string | null;
  },
) {
  try {
    const response = await apiClient.patch(`/asset-categories/${id}`, payload);
    return unwrapApiResponse<AssetCategoryRecord>(response.data);
  } catch {
    return updateMockAssetCategoryRecord(id, payload) as unknown as AssetCategoryRecord;
  }
}

export async function deleteAssetCategory(id: string) {
  try {
    const response = await apiClient.delete(`/asset-categories/${id}`);
    return unwrapApiResponse<{ message: string }>(response.data);
  } catch {
    return deleteMockAssetCategoryRecord(id) as unknown as { message: string };
  }
}
