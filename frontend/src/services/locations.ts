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
  floors?: number;
  rooms?: number;
  defaultCapacity?: number;
  defaultRoomType?: string | null;
  defaultAreaM2?: number | null;
  defaultCondition?: string | null;
  defaultNote?: string | null;
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

export async function batchUpdateRooms(
  buildingId: string,
  payload: {
    roomIds: number[];
    capacity?: number;
    roomType?: string | null;
    areaM2?: number | null;
    condition?: string | null;
    note?: string | null;
  },
) {
  const response = await apiClient.patch(`/locations/buildings/${buildingId}/rooms/batch`, payload);
  return unwrapApiResponse<{ message: string }>(response.data);
}

export async function getRooms(params?: Record<string, string | number | boolean | undefined>) {
  const response = await apiClient.get('/locations/rooms', { params });
  return unwrapApiResponse<RoomRecord[]>(response.data);
}

// GET /rooms returns rooms with nested student assignments
export async function getAllRoomsWithAssignments() {
  const response = await apiClient.get('/rooms');
  return unwrapApiResponse<Array<{
    id: number;
    roomCode: string;
    capacity: number;
    note: string | null;
    floor: {
      floorNumber: number;
      building: { code: string; name: string };
    };
    roomStudentAssignments: Array<{
      id: number;
      isActive: boolean;
      startDate: string;
      student: {
        id: number;
        fullName: string;
        userCode: string;
        studentCode: string | null;
        phone: string | null;
        profile: {
          faculty: string | null;
          course: string | null;
        } | null;
      };
    }>;
  }>>(response.data);
}

export async function getRoomStudents(roomId: number) {
  const response = await apiClient.get(`/rooms/${roomId}/students`);
  return unwrapApiResponse<Array<{
    id: number;
    fullName: string;
    userCode: string;
    email: string | null;
    phone: string | null;
    studentCode: string | null;
    status: string;
    createdAt: string;
  }>>(response.data);
}

export async function assignStudentToRoom(roomId: number, studentId: number) {
  const response = await apiClient.post(`/rooms/${roomId}/students`, { studentId });
  return unwrapApiResponse<{ id: number }>(response.data);
}

export async function removeStudentFromRoom(roomId: number, studentId: number) {
  const response = await apiClient.delete(`/rooms/${roomId}/students/${studentId}`);
  return unwrapApiResponse<{ removed: boolean }>(response.data);
}

export async function transferStudentToRoom(roomId: number, studentId: number) {
  const response = await apiClient.post(`/rooms/${roomId}/transfer`, { studentId });
  return unwrapApiResponse<{
    message: string;
    previousRoomId: number;
    newRoom: { id: number; roomCode: string; buildingName: string; floorNumber: number };
    student: { id: number; fullName: string };
  }>(response.data);
}

export async function getRoomAssets(roomId: number) {
  const response = await apiClient.get(`/rooms/${roomId}/assets`);
  return unwrapApiResponse<Array<{
    id: number;
    assetCode: string;
    assetName: string;
    categoryId: number;
    status: string;
    description: string | null;
    yearInUse: number | null;
    createdAt: string;
    category: { id: number; code: string; name: string } | null;
  }>>(response.data);
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
