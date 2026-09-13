import { apiClient } from './client';
import { Application, JobItem, RecruiterCandidate } from '../types';

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
    const response = await apiClient.get<RecruiterMetrics>('/recruiter/metrics');
    return response.data;
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
    const response = await apiClient.get<RecruiterCandidate[]>('/recruiter/candidates', { params: filters });
    return response.data;
  },

  /**
   * Fetch candidate dossier by ID
   */
  getCandidateById: async (id: string): Promise<RecruiterCandidate> => {
    const response = await apiClient.get<RecruiterCandidate>(`/recruiter/candidates/${id}`);
    return response.data;
  },

  /**
   * Toggle candidate shortlist status
   */
  toggleShortlistCandidate: async (candidateId: string): Promise<{ isShortlisted: boolean }> => {
    const response = await apiClient.post<{ isShortlisted: boolean }>(`/recruiter/candidates/${candidateId}/shortlist`);
    return response.data;
  },

  /**
   * Fetch all jobs posted by the authenticated recruiter
   */
  getRecruiterJobs: async (): Promise<JobItem[]> => {
    const response = await apiClient.get<JobItem[]>('/recruiter/jobs');
    return response.data;
  },

  /**
   * Fetch applications for a specific job owned by the recruiter
   */
  getJobApplications: async (jobId: string): Promise<Application[]> => {
    const response = await apiClient.get<Application[]>(`/recruiter/jobs/${jobId}/applications`);
    return response.data;
  },

  /**
   * Fetch all applications across all jobs owned by the recruiter
   */
  getAllApplications: async (jobId?: string): Promise<Application[]> => {
    const response = await apiClient.get<Application[]>('/recruiter/applications', {
      params: jobId ? { jobId } : undefined,
    });
    return response.data;
  },

  /**
   * Update recruitment pipeline stage for a candidate application
   */
  updateApplicationStatus: async (
    applicationId: string,
    status: string,
    notes?: string
  ): Promise<Application> => {
    const response = await apiClient.patch<Application>(
      `/recruiter/applications/${applicationId}/status`,
      { status, notes }
    );
    return response.data;
  },

  /**
   * Post a new job listing
   */
  createJob: async (jobData: Partial<JobItem>): Promise<JobItem> => {
    const response = await apiClient.post<JobItem>('/jobs', jobData);
    return response.data;
  },

  /**
   * Update an existing job listing
   */
  updateJob: async (jobId: string, jobData: Partial<JobItem>): Promise<JobItem> => {
    const response = await apiClient.patch<JobItem>(`/jobs/${jobId}`, jobData);
    return response.data;
  },

  /**
   * Delete a job listing
   */
  deleteJob: async (jobId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/jobs/${jobId}`);
    return response.data;
  },

  /**
   * Get resume download/view URL for an applicant
   */
  getResumeDownloadUrl: (applicationId: string): string => {
    return `/api/recruiter/applications/${applicationId}/resume`;
  },
};

export default recruiterApi;
