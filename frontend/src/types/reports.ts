export type ReportsFilters = {
  fromDate?: string;
  toDate?: string;
  blockId?: number;
  roomId?: number;
};

export type StatusBreakdown = {
  status: string;
  count: number;
};

export type MonthlyCount = {
  month: string;
  count: number;
};

export type AssetsByRoom = {
  roomId: number | null;
  roomCode: string;
  blockName: string;
  floorNumber: number | null;
  totalAssets: number;
};

export type AssetsByCategory = {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  totalAssets: number;
};

export type ReportsSummary = {
  totalAssets: number;
  assetsByStatus: StatusBreakdown[];
  totalRooms: number;
  totalStudents: number;
  pendingDamageReports: number;
  maintenanceDueCount: number;
  liquidatedAssetsCount: number;
};
