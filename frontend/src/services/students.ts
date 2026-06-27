import { apiClient, unwrapApiResponse } from '../lib/api-client';

export const studentsApi = {
  getMyRoom: async () => {
    const response = await apiClient.get('/students/me/room');
    return unwrapApiResponse<any>(response.data);
  },

  getMyRoommates: async () => {
    const response = await apiClient.get('/students/me/roommates');
    return unwrapApiResponse<any[]>(response.data);
  },

  getMyRoomAssets: async () => {
    const response = await apiClient.get('/students/me/room-assets');
    return unwrapApiResponse<any[]>(response.data);
  },
};
