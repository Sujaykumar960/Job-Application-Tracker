import { apiClient } from './client';
import {
  CareerNotification,
  NotificationCategory,
} from '../types';

export const notificationApi = {
  /**
   * Fetch notifications with optional category filter
   */
  getNotifications: async (category?: NotificationCategory | 'all'): Promise<CareerNotification[]> => {
    const response = await apiClient.get<CareerNotification[]>('/notifications', { params: { category } });
    return response.data;
  },

  /**
   * Mark an individual notification as read
   */
  markAsRead: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>(`/notifications/${id}/read`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/notifications/read-all');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },

  /**
   * Delete a single notification
   */
  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },

  /**
   * Clear all read notifications
   */
  clearRead: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post<{ success: boolean }>('/notifications/clear-read');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },
};

export default notificationApi;
