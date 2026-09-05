import { apiClient, withFallback } from './client';
import { CompanyProfile } from '../types/company';
import { JobItem } from '../types';
import { MOCK_COMPANIES } from '../data/mockCompanies';

const COMPANIES_STORAGE_KEY = 'careerx_companies_v2';

function getLocalCompanies(): CompanyProfile[] {
  const saved = localStorage.getItem(COMPANIES_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return MOCK_COMPANIES;
    }
  }
  return MOCK_COMPANIES;
}

export const companyApi = {
  /**
   * Fetch partner technology companies with optional keyword filtering
   */
  getCompanies: async (query?: string): Promise<CompanyProfile[]> => {
    let list = getLocalCompanies();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.industry.toLowerCase().includes(q) ||
          c.techStack.some((t) => t.toLowerCase().includes(q))
      );
    }

    return withFallback(
      apiClient.get<CompanyProfile[]>('/companies', { params: { query } }),
      list
    );
  },

  /**
   * Fetch company dossier by slug or ID
   */
  getCompanyBySlug: async (slugOrId: string): Promise<CompanyProfile | null> => {
    const list = getLocalCompanies();
    const found = list.find((c) => c.slug === slugOrId || c.id === slugOrId) || null;

    return withFallback(
      apiClient.get<CompanyProfile>(`/companies/${slugOrId}`),
      found
    );
  },

  /**
   * Fetch open engineering jobs for a company
   */
  getCompanyJobs: async (companyId: string): Promise<JobItem[]> => {
    const company = getLocalCompanies().find((c) => c.id === companyId);
    const jobs = company ? company.jobs : [];

    return withFallback(
      apiClient.get<JobItem[]>(`/companies/${companyId}/jobs`),
      jobs
    );
  },

  /**
   * Toggle follow/following status for a company
   */
  toggleFollowCompany: async (
    companyId: string
  ): Promise<{ isFollowing: boolean; followersCount: number }> => {
    const list = getLocalCompanies();
    let result = { isFollowing: false, followersCount: 0 };

    const updated = list.map((c) => {
      if (c.id === companyId) {
        const nextFollowing = !c.isFollowing;
        const count = nextFollowing ? c.followersCount + 1 : c.followersCount - 1;
        result = { isFollowing: nextFollowing, followersCount: count };
        return { ...c, isFollowing: nextFollowing, followersCount: count };
      }
      return c;
    });

    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ isFollowing: boolean; followersCount: number }>(`/companies/${companyId}/follow`),
      result
    );
  },
};

export default companyApi;
