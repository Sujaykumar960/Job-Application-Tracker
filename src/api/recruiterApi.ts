import { apiClient, withFallback } from './client';
import {
  RecruiterCandidate,
  INITIAL_RECRUITER_CANDIDATES,
} from '../data/mockRecruiterData';

const RECRUITER_STORAGE_KEY = 'careerx_recruiter_candidates_v2';

function getLocalCandidates(): RecruiterCandidate[] {
  const saved = localStorage.getItem(RECRUITER_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_RECRUITER_CANDIDATES;
    }
  }
  return INITIAL_RECRUITER_CANDIDATES;
}

export interface RecruiterMetrics {
  jobsPosted: number;
  applicationsCount: number;
  shortlistedCount: number;
  interviewsCount: number;
  hiredCount: number;
}

export const recruiterApi = {
  /**
   * Fetch recruiter top dashboard performance metrics
   */
  getRecruiterMetrics: async (): Promise<RecruiterMetrics> => {
    const candidates = getLocalCandidates();
    const shortlistedCount = candidates.filter((c) => c.isShortlisted).length;
    const interviewsCount = candidates.filter((c) => c.interviewStage && c.interviewStage !== 'Not Started').length;

    const fallback: RecruiterMetrics = {
      jobsPosted: 6,
      applicationsCount: 148,
      shortlistedCount,
      interviewsCount,
      hiredCount: 5,
    };

    return withFallback(
      apiClient.get<RecruiterMetrics>('/recruiter/metrics'),
      fallback
    );
  },

  /**
   * Search candidate discovery pool with 6-parameter filters
   */
  searchCandidates: async (filters?: {
    role?: string;
    skills?: string;
    experience?: string;
    location?: string;
    minAssessmentScore?: number;
    minJobMatch?: number;
  }): Promise<RecruiterCandidate[]> => {
    let list = getLocalCandidates();

    if (filters) {
      if (filters.role && filters.role !== 'All') {
        list = list.filter((c) => c.role.toLowerCase().includes(filters.role!.toLowerCase()));
      }
      if (filters.skills && filters.skills !== 'All') {
        list = list.filter((c) => c.skills.some((s) => s.toLowerCase() === filters.skills!.toLowerCase()));
      }
      if (filters.experience && filters.experience !== 'All') {
        list = list.filter((c) => c.experienceLevel.toLowerCase().includes(filters.experience!.toLowerCase()));
      }
      if (filters.location && filters.location !== 'All') {
        list = list.filter((c) => c.location.toLowerCase().includes(filters.location!.toLowerCase()));
      }
      if (filters.minAssessmentScore) {
        list = list.filter((c) => c.assessmentScore >= filters.minAssessmentScore!);
      }
      if (filters.minJobMatch) {
        list = list.filter((c) => c.jobMatch >= filters.minJobMatch!);
      }
    }

    return withFallback(
      apiClient.get<RecruiterCandidate[]>('/recruiter/candidates', { params: filters }),
      list
    );
  },

  /**
   * Fetch candidate dossier by ID
   */
  getCandidateById: async (id: string): Promise<RecruiterCandidate | null> => {
    const list = getLocalCandidates();
    const found = list.find((c) => c.id === id) || null;

    return withFallback(
      apiClient.get<RecruiterCandidate>(`/recruiter/candidates/${id}`),
      found
    );
  },

  /**
   * Toggle candidate shortlist status
   */
  toggleShortlistCandidate: async (candidateId: string): Promise<{ isShortlisted: boolean }> => {
    const list = getLocalCandidates();
    let isShortlisted = false;

    const updated = list.map((c) => {
      if (c.id === candidateId) {
        isShortlisted = !c.isShortlisted;
        return { ...c, isShortlisted };
      }
      return c;
    });

    localStorage.setItem(RECRUITER_STORAGE_KEY, JSON.stringify(updated));

    return withFallback(
      apiClient.post<{ isShortlisted: boolean }>(`/recruiter/candidates/${candidateId}/shortlist`),
      { isShortlisted }
    );
  },
};

export default recruiterApi;
