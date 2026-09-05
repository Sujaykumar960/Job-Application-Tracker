import { apiClient, withFallback } from './client';
import { Application } from '../types';
import { MOCK_APPLICATIONS } from '../data/mockData';

const APPLICATIONS_STORAGE_KEY = 'careerx_applications_v2';

function getLocalApplications(): Application[] {
  const saved = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return MOCK_APPLICATIONS;
    }
  }
  return MOCK_APPLICATIONS;
}

export const applicationApi = {
  /**
   * Fetch all tracked job applications with optional status filter
   */
  getApplications: async (status?: string): Promise<Application[]> => {
    let local = getLocalApplications();
    if (status && status !== 'All') {
      local = local.filter((a) => a.status.toLowerCase() === status.toLowerCase());
    }

    return withFallback(
      apiClient.get<Application[]>('/applications', { params: { status } }),
      local
    );
  },

  /**
   * Fetch a single application by ID
   */
  getApplicationById: async (id: string): Promise<Application | null> => {
    const local = getLocalApplications().find((a) => a.id === id) || null;

    return withFallback(
      apiClient.get<Application>(`/applications/${id}`),
      local
    );
  },

  /**
   * Submit a new job application record
   */
  createApplication: async (data: Partial<Application>): Promise<Application> => {
    const newApp: Application = {
      id: `app-${Date.now()}`,
      company: data.company || 'Unknown Company',
      role: data.role || 'Software Engineer',
      location: data.location || 'Remote',
      appliedDate: data.appliedDate || new Date().toISOString().split('T')[0],
      status: data.status || 'Applied',
      priority: data.priority || 'Medium',
      matchScore: data.matchScore || 85,
      salaryRange: data.salaryRange,
      tags: data.tags || [],
      notes: data.notes,
      resume: data.resume || 'Alex_Rivera_Distributed_Systems.pdf',
    };

    const existing = getLocalApplications();
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify([newApp, ...existing]));

    return withFallback(
      apiClient.post<Application>('/applications', data),
      newApp
    );
  },

  /**
   * Update an existing application's stage, priority, or notes
   */
  updateApplication: async (id: string, data: Partial<Application>): Promise<Application> => {
    const existing = getLocalApplications();
    const updated = existing.map((a) => (a.id === id ? { ...a, ...data } : a));
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(updated));

    const result = updated.find((a) => a.id === id) as Application;

    return withFallback(
      apiClient.patch<Application>(`/applications/${id}`, data),
      result
    );
  },

  /**
   * Delete an application record
   */
  deleteApplication: async (id: string): Promise<{ success: boolean }> => {
    const existing = getLocalApplications();
    const filtered = existing.filter((a) => a.id !== id);
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(filtered));

    return withFallback(
      apiClient.delete<{ success: boolean }>(`/applications/${id}`),
      { success: true }
    );
  },
};

export default applicationApi;
