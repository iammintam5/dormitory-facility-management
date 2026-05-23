import { Asset } from './assets';
import { Room } from './locations';
import { User } from './users';

export type DamageReportStatus =
  | 'PENDING'
  | 'RECEIVED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type DamageReportPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type DamageReportLog = {
  id: number;
  action: string;
  oldStatus?: DamageReportStatus | null;
  newStatus?: DamageReportStatus | null;
  note?: string | null;
  createdAt: string;
  createdByUser: User;
};

export type DamageReport = {
  id: number;
  reportCode: string;
  reporterId: number;
  assetId: number;
  roomId: number;
  description: string;
  priority: DamageReportPriority;
  status: DamageReportStatus;
  createdAt: string;
  updatedAt?: string | null;
  reporter?: User;
  asset?: Asset;
  room?: Room;
  damageReportLogs?: DamageReportLog[];
};

export type DamageReportsResponse = {
  items: DamageReport[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type DamageReportStudentAssetsResponse = {
  room: Room | null;
  assets: Asset[];
};

export type DamageReportExportResponse = DamageReport & {
  printable: {
    title: string;
    generatedAt: string;
    reporterLabel: string;
    assetLabel: string;
    roomLabel: string;
  };
};
