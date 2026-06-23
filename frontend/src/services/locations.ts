import { apiClient, unwrapApiResponse } from '../lib/api-client';

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
  const response = await apiClient.get('/locations/buildings');
  return unwrapApiResponse<BuildingRecord[]>(response.data);
}

export async function createBuilding(payload: {
  code: string;
  name: string;
  genderZone?: string | null;
  status?: 'ACTIVE' | 'INACTIVE';
  description?: string | null;
}) {
  const response = await apiClient.post('/locations/buildings', payload);
  return unwrapApiResponse<BuildingRecord>(response.data);
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
  const response = await apiClient.patch(`/locations/buildings/${id}`, payload);
  return unwrapApiResponse<BuildingRecord>(response.data);
}

export async function deleteBuilding(id: string) {
  const response = await apiClient.delete(`/locations/buildings/${id}`);
  return unwrapApiResponse<{ message: string }>(response.data);
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
  const response = await apiClient.get('/locations/rooms', { params });
  return unwrapApiResponse<RoomRecord[]>(response.data);
}

export async function createRoom(payload: {
  roomCode: string;
  floorId: number;
  capacity?: number;
  note?: string;
}) {
  const response = await apiClient.post('/rooms', payload);
  return unwrapApiResponse(response.data);
}

export async function updateRoom(
  id: number,
  payload: { roomCode?: string; capacity?: number; note?: string },
) {
  const response = await apiClient.patch(`/rooms/${id}`, payload);
  return unwrapApiResponse(response.data);
}

export async function deleteRoom(id: number) {
  const response = await apiClient.delete(`/rooms/${id}`);
  return unwrapApiResponse(response.data);
}
