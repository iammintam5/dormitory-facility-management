import { Room } from './locations';

export type AssetCategory = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  maintenanceCycleMonths?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  _count?: {
    assets: number;
  };
};

export type Asset = {
  id: number;
  categoryId: number;
  roomId?: number | null;
  assetCode: string;
  assetName: string;
  status:
    | 'AVAILABLE'
    | 'IN_USE'
    | 'UNDER_MAINTENANCE'
    | 'DAMAGED'
    | 'PENDING_LIQUIDATION'
    | 'LIQUIDATED';
  yearInUse?: number | null;
  description?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  category?: AssetCategory;
  room?: Room;
};

export type AssetsResponse = {
  items: Asset[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
