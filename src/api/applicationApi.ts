import { apiClient } from './client';
import { Application, ApplicationNote } from '../types';

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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },

  /**
   * Update an existing application's stage, priority, or notes
   */
  updateApplication: async (id: string, data: Partial<Application>): Promise<Application> => {
    const response = await apiClient.patch<Application>(`/applications/${id}`, data);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },

  /**
   * Delete an application record
   */
  deleteApplication: async (id: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/applications/${id}`);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('careerx:refresh_dashboard'));
    }
    return response.data;
  },

  /**
   * Fetch all notes for an application
   */
  getNotes: async (applicationId: string): Promise<ApplicationNote[]> => {
    const response = await apiClient.get<ApplicationNote[]>(`/applications/${applicationId}/notes`);
    return response.data;
  },

  /**
   * Add a short note to an application
   */
  addNote: async (applicationId: string, content: string): Promise<ApplicationNote> => {
    const response = await apiClient.post<ApplicationNote>(`/applications/${applicationId}/notes`, { content });
    return response.data;
  },

  /**
   * Delete a note from an application
   */
  deleteNote: async (applicationId: string, noteId: string): Promise<{ success: boolean }> => {
    const response = await apiClient.delete<{ success: boolean }>(`/applications/${applicationId}/notes/${noteId}`);
    return response.data;
  },
};

export default applicationApi;
