import { apiClient, unwrapApiResponse } from '../lib/api-client';

export type AssetReceiptItemRecord = {
  id: string;
  assetId: string;
  quantity: number;
  unitPrice: number;
  warrantyMonths: number;
  note: string;
  asset?: any; // Nested asset details
};

export type AssetReceiptRecord = {
  id: string;
  receiptCode: string;
  type: 'IMPORT' | 'EXPORT' | 'HANDOVER' | 'RECLAIM';
  receiptDate: string;
  supplierName?: string;
  supplierAddress?: string;
  supplierPhone?: string;
  contractNumber?: string;
  documentNumber?: string;
  totalAmount?: number | string;
  note?: string;
  createdAt: string;
  items?: AssetReceiptItemRecord[];
  _count?: {
    items: number;
  };
  creator?: {
    fullName: string;
  };
};

export async function createImportReceipt(payload: any): Promise<AssetReceiptRecord> {
  const response = await apiClient.post<AssetReceiptRecord>('/asset-receipts', payload);
  return unwrapApiResponse<AssetReceiptRecord>(response.data);
}

export async function createHandoverReceipt(payload: { targetRoomId: number, assetIds: number[], note?: string, receiptDate?: string }): Promise<AssetReceiptRecord> {
  const response = await apiClient.post<AssetReceiptRecord>('/asset-receipts/handover', payload);
  return unwrapApiResponse<AssetReceiptRecord>(response.data);
}

export async function createReclaimReceipt(payload: { fromRoomId: number, assetIds: number[], note?: string, receiptDate?: string }): Promise<AssetReceiptRecord> {
  const response = await apiClient.post<AssetReceiptRecord>('/asset-receipts/reclaim', payload);
  return unwrapApiResponse<AssetReceiptRecord>(response.data);
}

export async function createExportReceipt(payload: any): Promise<AssetReceiptRecord> {
  const response = await apiClient.post<AssetReceiptRecord>('/asset-receipts/export', payload);
  return unwrapApiResponse<AssetReceiptRecord>(response.data);
}

export async function getAssetReceipts(params?: Record<string, any>): Promise<AssetReceiptRecord[]> {
  const response = await apiClient.get<AssetReceiptRecord[]>('/asset-receipts', { params });
  return unwrapApiResponse<AssetReceiptRecord[]>(response.data);
}

export async function getAssetReceipt(id: string): Promise<AssetReceiptRecord> {
  const response = await apiClient.get<AssetReceiptRecord>(`/asset-receipts/${id}`);
  return unwrapApiResponse<AssetReceiptRecord>(response.data);
}
