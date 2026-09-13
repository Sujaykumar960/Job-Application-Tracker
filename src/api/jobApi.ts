import { apiClient } from './client';
import { JobItem, JobFilterState, JobMatchAnalysisResult } from '../types';

export const jobApi = {
  /**
   * Fetch job listings with optional multi-facet filters
   */
  getJobs: async (filters?: Partial<JobFilterState>): Promise<JobItem[]> => {
    const response = await apiClient.get<JobItem[]>('/jobs', { params: filters });
    return response.data;
  },

  /**
   * Fetch single job details by ID
   */
  getJobById: async (id: string): Promise<JobItem> => {
    const response = await apiClient.get<JobItem>(`/jobs/${id}`);
    return response.data;
  },

  /**
   * Fetch jobs ranked by deterministic match score for authenticated user
   */
  getJobMatches: async (limit: number = 20): Promise<JobItem[]> => {
    const response = await apiClient.get<JobItem[]>('/jobs/matches', { params: { limit } });
    return response.data;
  },

  /**
   * Analyze candidate resume compatibility against specific job description
   */
  getJobMatchAnalysis: async (
    jobId: string,
    resumeId?: string
  ): Promise<JobMatchAnalysisResult> => {
    const response = await apiClient.post<JobMatchAnalysisResult>(
      `/jobs/${jobId}/match`,
      null,
      { params: resumeId ? { resumeId } : {} }
    );
    return response.data;
  },
};

export default jobApi;
