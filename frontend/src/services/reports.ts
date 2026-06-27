import { apiClient, unwrapApiResponse } from '../lib/api-client';

export type AdminDashboardSummary = {
  role: 'ADMIN';
  totalUsers: number;
  totalStudents: number;
  totalManagers: number;
  totalAssets: number;
  totalDamageReports: number;
};

export type ManagerDashboardSummary = {
  role: 'MANAGER';
  totalBuildings: number;
  totalRooms: number;
  totalAssets: number;
  damagedAssets: number;
  maintenanceProcessing: number;
  liquidationPending: number;
};

export type StudentDashboardSummary = {
  role: 'STUDENT';
  currentRoom: {
    assignmentId: string;
    roomId: string;
    roomCode: string;
    floorNumber: number | null;
    buildingId: string;
    buildingName: string;
    bedId: string;
  } | null;
  assetCount: number;
  damageReportProcessing: number;
};

export type DamageByMonth = {
  month: string;
  count: number;
};

export async function getDashboardSummary() {
  const response = await apiClient.get('/reports/summary');
  return unwrapApiResponse<
    AdminDashboardSummary | ManagerDashboardSummary | StudentDashboardSummary
  >(response.data);
}

export async function getDamageByMonth() {
  const response = await apiClient.get('/reports/damage-by-month');
  return unwrapApiResponse<DamageByMonth[]>(response.data);
}
