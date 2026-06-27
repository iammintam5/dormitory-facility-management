import { apiClient, unwrapApiResponse } from '../lib/api-client';

export type AssetCategoryRecord = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    assets: number;
  };
};

export async function getAssetCategories() {
  const response = await apiClient.get('/asset-categories');
  return unwrapApiResponse<AssetCategoryRecord[]>(response.data);
}

export async function createAssetCategory(payload: {
  code: string;
  name: string;
  description?: string | null;
  unit?: string | null;
}) {
  const response = await apiClient.post('/asset-categories', payload);
  return unwrapApiResponse<AssetCategoryRecord>(response.data);
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
  const response = await apiClient.patch(`/asset-categories/${id}`, payload);
  return unwrapApiResponse<AssetCategoryRecord>(response.data);
}

export async function deleteAssetCategory(id: string) {
  const response = await apiClient.delete(`/asset-categories/${id}`);
  return unwrapApiResponse<{ message: string }>(response.data);
}
