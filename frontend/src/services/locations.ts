import { apiClient, unwrapApiResponse } from '../lib/api-client';
import { getMockBuildingRecords, createMockBuildingRecord, updateMockBuildingRecord, deleteMockBuildingRecord, getMockRoomRecords } from '../lib/frontend-mock';

export type BuildingRecord = {
  id: string;
  code: string;
  name: string;
  genderZone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  description: string | null;
  rooms: Array<{
    id: string;
    code: string;
    floorNumber: number;
    beds: Array<{ id: string; bedLabel: string }>;
    assignments: Array<{ id: string }>;
  }>;
};

export async function getBuildings() {
  try {
    const response = await apiClient.get('/locations/buildings');
    return unwrapApiResponse<BuildingRecord[]>(response.data);
  } catch {
    return getMockBuildingRecords() as unknown as BuildingRecord[];
  }
}

export async function createBuilding(payload: {
  code: string;
  name: string;
  genderZone?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  description?: string | null;
}) {
  try {
    const response = await apiClient.post('/locations/buildings', payload);
    return unwrapApiResponse<BuildingRecord>(response.data);
  } catch {
    return createMockBuildingRecord(payload) as unknown as BuildingRecord;
  }
}

export async function updateBuilding(
  id: string,
  payload: {
    code?: string;
    name?: string;
    genderZone?: string | null;
    status?: 'ACTIVE' | 'INACTIVE';
    description?: string | null;
  },
) {
  try {
    const response = await apiClient.patch(`/locations/buildings/${id}`, payload);
    return unwrapApiResponse<BuildingRecord>(response.data);
  } catch {
    return updateMockBuildingRecord(id, payload) as unknown as BuildingRecord;
  }
}

export async function deleteBuilding(id: string) {
  try {
    const response = await apiClient.delete(`/locations/buildings/${id}`);
    return unwrapApiResponse<{ message: string }>(response.data);
  } catch {
    return deleteMockBuildingRecord(id) as unknown as { message: string };
  }
}

export type RoomRecord = {
  id: string;
  code: string;
  roomCode: string;
  name: string | null;
  buildingId: string;
  buildingCode: string;
  buildingName: string | null;
  floorNumber: number;
  capacity: number;
  currentStudents: number;
  roomType: string | null;
  areaM2: number | null;
  status: string;
  statusLabel: string;
  condition: string;
  conditionLabel: string;
};

export async function getRooms(params?: Record<string, string | number | boolean | undefined>) {
  try {
    const response = await apiClient.get('/locations/rooms', { params });
    return unwrapApiResponse<RoomRecord[]>(response.data);
  } catch {
    return getMockRoomRecords(params) as unknown as RoomRecord[];
  }
}
