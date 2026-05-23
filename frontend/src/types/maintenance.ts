import { Asset } from './assets';
import { User } from './users';

export type MaintenanceType = 'SCHEDULED' | 'AD_HOC' | 'AFTER_INVENTORY';
export type MaintenanceResultStatus =
  | 'GOOD'
  | 'NEED_MONITORING'
  | 'NEED_REPAIR'
  | 'RECOMMEND_LIQUIDATION';

export type MaintenancePlan = {
  id: number;
  assetId: number;
  createdBy: number;
  cycleMonths: number;
  nextDueDate: string;
  isActive: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  asset: Asset;
  createdByUser: User;
  maintenanceRecords?: MaintenanceRecord[];
};

export type MaintenanceRecord = {
  id: number;
  maintenanceCode: string;
  planId?: number | null;
  assetId: number;
  performedBy: number;
  maintenanceDate: string;
  maintenanceType: MaintenanceType;
  content: string;
  resultStatus: MaintenanceResultStatus;
  nextMaintenanceDate?: string | null;
  cost?: string | number | null;
  materialNote?: string | null;
  note?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  asset: Asset;
  plan?: MaintenancePlan | null;
  performedByUser: User;
};

export type MaintenancePlansResponse = {
  items: MaintenancePlan[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MaintenanceRecordsResponse = {
  items: MaintenanceRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type DueAssetsResponse = {
  items: MaintenancePlan[];
  summary: {
    overdueCount: number;
    dueSoonCount: number;
    days: number;
  };
};

export type MaintenanceDashboardSummary = {
  overdueCount: number;
  dueSoonCount: number;
  activePlans: number;
  totalRecords: number;
};

export type MaintenanceRecordExportResponse = MaintenanceRecord & {
  printable: {
    title: string;
    generatedAt: string;
    assetLabel: string;
    performedByLabel: string;
  };
};
