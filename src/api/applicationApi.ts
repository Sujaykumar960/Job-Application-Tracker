import { apiClient } from './client';
import { Application } from '../types';

export const applicationApi = {
  /**
   * Fetch all tracked job applications with optional status filter
   */
  getApplications: async (status?: string): Promise<Application[]> => {
    const response = await apiClient.get<Application[]>('/applications', { params: { status } });
    return response.data;
  },

  /**
   * Fetch a single application by ID
   */
  getApplicationById: async (id: string): Promise<Application> => {
    const response = await apiClient.get<Application>(`/applications/${id}`);
    return response.data;
  },

  /**
   * Submit a new job application record
   */
  createApplication: async (data: Partial<Application>): Promise<Application> => {
    const response = await apiClient.post<Application>('/applications', data);
    return response.data;
  },

  /**
   * Update an existing application's stage, priority, or notes
   */
  updateApplication: async (id: string, data: Partial<Application>): Promise<Application> => {
    const response = await apiClient.patch<Application>(`/applications/${id}`, data);
    return response.data;
  },

  /**
   * Delete an application record
   */
  deleteApplication: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/applications/${id}`);
    return response.data;
  },
};

export default applicationApi;
