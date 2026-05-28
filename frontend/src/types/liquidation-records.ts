import { Asset } from './assets';
import { UserSummary } from './users';
import { CouncilMember } from './council';

export type LiquidationStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'CANCELLED';

export type LiquidationItem = {
  id: number;
  liquidationRecordId: number;
  assetId: number;
  assetCondition: string;
  reason: string;
  estimatedRemainingValue: string | number | null;
  asset: Asset;
};

export type LiquidationRecord = {
  id: number;
  liquidationCode: string;
  createdBy: number;
  liquidationDate: string;
  status: LiquidationStatus;
  note: string | null;
  createdAt: string;
  updatedAt?: string | null;
  liquidationItems: LiquidationItem[];
  createdByUser: UserSummary;
  councilMembers?: CouncilMember[];
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
