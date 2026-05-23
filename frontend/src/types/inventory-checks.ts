import { Asset } from './assets';
import { Room } from './locations';
import { User } from './users';

export type InventoryCheckStatus = 'DRAFT' | 'COMPLETED';

export type InventoryCheckItem = {
  id: number;
  inventoryCheckId: number;
  assetId: number;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  actualCondition?: string | null;
  note?: string | null;
  asset: Asset & {
    room?: Room;
  };
};

export type InventoryCheck = {
  id: number;
  inventoryCode: string;
  roomId?: number | null;
  checkedBy: number;
  checkDate: string;
  status: InventoryCheckStatus;
  generalNote?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  room?: Room;
  checkedByUser: User;
  inventoryCheckItems: InventoryCheckItem[];
};

export type InventoryChecksResponse = {
  items: InventoryCheck[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type InventoryCheckExportResponse = InventoryCheck & {
  printable: {
    title: string;
    generatedAt: string;
    roomLabel: string;
    checkedByLabel: string;
  };
};
