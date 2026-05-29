import { Asset } from './assets';
import { Room } from './locations';
import { User } from './users';

export type HandoverStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type HandoverItem = {
  id: number;
  assetId: number;
  quantity: number;
  conditionAtHandover: string;
  conditionAtReturn?: string | null;
  note?: string | null;
  asset: Asset;
};

export type Handover = {
  id: number;
  handoverCode: string;
  roomId: number;
  studentId: number;
  createdBy: number;
  handoverDate: string;
  status: HandoverStatus;
  returnedAt?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  room: Room;
  student: User;
  createdByUser?: User;
  handoverItems: HandoverItem[];
};

export type HandoversResponse = {
  items: Handover[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type HandoverExportResponse = Handover & {
  printable: {
    title: string;
    generatedAt: string;
    roomLabel: string;
    studentLabel: string;
  };
};
