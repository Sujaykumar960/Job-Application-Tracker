import { apiClient } from './client';
import { CompanyProfile } from '../types/company';
import { JobItem } from '../types';

export const companyApi = {
  /**
   * Fetch partner technology companies with optional keyword filtering
   */
  getCompanies: async (query?: string): Promise<CompanyProfile[]> => {
    const response = await apiClient.get<CompanyProfile[]>('/companies', { params: { query } });
    return response.data;
  },

  /**
   * Fetch company dossier by slug or ID
   */
  getCompanyBySlug: async (slugOrId: string): Promise<CompanyProfile> => {
    const response = await apiClient.get<CompanyProfile>(`/companies/${slugOrId}`);
    return response.data;
  },

  /**
   * Fetch open engineering jobs for a company
   */
  getCompanyJobs: async (companyId: string): Promise<JobItem[]> => {
    const response = await apiClient.get<JobItem[]>(`/companies/${companyId}/jobs`);
    return response.data;
  },

  /**
   * Toggle follow/following status for a company
   */
  toggleFollowCompany: async (
    companyId: string
  ): Promise<{ isFollowing: boolean; followersCount: number }> => {
    const response = await apiClient.post<{ isFollowing: boolean; followersCount: number }>(`/companies/${companyId}/follow`);
    return response.data;
  },

  /**
   * Create a new company profile (Recruiter/Admin only)
   */
  createCompany: async (companyData: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    const response = await apiClient.post<CompanyProfile>('/companies', companyData);
    return response.data;
  },

  /**
   * Update an existing company profile (Recruiter/Admin only)
   */
  updateCompany: async (companyId: string, companyData: Partial<CompanyProfile>): Promise<CompanyProfile> => {
    const response = await apiClient.patch<CompanyProfile>(`/companies/${companyId}`, companyData);
    return response.data;
  },
};

export default companyApi;
