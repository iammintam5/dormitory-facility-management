import { apiClient, unwrapApiResponse } from '../lib/api-client';
import type { AppNotification, NotificationsResponse, UnreadCountResponse } from '../types/notifications';

export async function getNotifications(page = 1, pageSize = 12) {
  const response = await apiClient.get('/notifications', { params: { page, pageSize } });
  return unwrapApiResponse<NotificationsResponse>(response.data);
}

export async function getUnreadCount() {
  const response = await apiClient.get('/notifications/unread-count');
  return unwrapApiResponse<UnreadCountResponse>(response.data);
}

export async function markNotificationRead(id: number) {
  const response = await apiClient.post(`/notifications/${id}/mark-read`);
  return unwrapApiResponse<AppNotification>(response.data);
}

export async function markAllNotificationsRead() {
  const response = await apiClient.post('/notifications/mark-all-read');
  return unwrapApiResponse<{ success: boolean }>(response.data);
}
