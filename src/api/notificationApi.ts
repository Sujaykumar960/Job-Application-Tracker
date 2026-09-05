import { apiClient, withFallback } from './client';
import {
  CareerNotification,
  NotificationCategory,
  INITIAL_NOTIFICATIONS,
} from '../data/mockNotifications';

const NOTIFICATIONS_STORAGE_KEY = 'careerx_notifications_v2';

function getLocalNotifications(): CareerNotification[] {
  const saved = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_NOTIFICATIONS;
    }
  }
  return INITIAL_NOTIFICATIONS;
}

export const notificationApi = {
  /**
   * Fetch notifications with optional category filter
   */
  getNotifications: async (category?: NotificationCategory | 'all'): Promise<CareerNotification[]> => {
    let list = getLocalNotifications();
    if (category && category !== 'all') {
      list = list.filter((n) => n.category === category);
    }

    return withFallback(
      apiClient.get<CareerNotification[]>('/notifications', { params: { category } }),
      list
    );
  },

  /**
   * Mark an individual notification as read
   */
  markAsRead: async (id: string): Promise<{ success: boolean }> => {
    const list = getLocalNotifications();
    const updated = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ success: boolean }>(`/notifications/${id}/read`),
      { success: true }
    );
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const list = getLocalNotifications();
    const updated = list.map((n) => ({ ...n, isRead: true }));
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ success: boolean }>('/notifications/read-all'),
      { success: true }
    );
  },

  /**
   * Delete a single notification
   */
  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const list = getLocalNotifications();
    const filtered = list.filter((n) => n.id !== id);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(filtered));

    return withFallback(
      apiClient.delete<{ success: boolean }>(`/notifications/${id}`),
      { success: true }
    );
  },

  /**
   * Clear all read notifications
   */
  clearRead: async (): Promise<{ success: boolean }> => {
    const list = getLocalNotifications();
    const filtered = list.filter((n) => !n.isRead);
    localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(filtered));

    return withFallback(
      apiClient.post<{ success: boolean }>('/notifications/clear-read'),
      { success: true }
    );
  },
};

export default notificationApi;
