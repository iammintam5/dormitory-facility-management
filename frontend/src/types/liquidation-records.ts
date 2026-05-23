import { Asset } from './assets';
import { UserSummary } from './users';

export type LiquidationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type LiquidationRecord = {
  id: number;
  liquidationCode: string;
  assetId: number;
  createdBy: number;
  liquidationDate: string;
  assetCondition: string;
  reason: string;
  estimatedRemainingValue: string | number | null;
  status: LiquidationStatus;
  note: string | null;
  createdAt: string;
  updatedAt?: string | null;
  asset: Asset;
  createdByUser: UserSummary;
};

export type LiquidationRecordsResponse = {
  items: LiquidationRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type LiquidationRecordExportResponse = LiquidationRecord & {
  printable: {
    title: string;
    generatedAt: string;
    assetLabel: string;
    createdByLabel: string;
  };
};
