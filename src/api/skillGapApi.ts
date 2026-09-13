import { apiClient } from './client';
import { SkillGapAnalysisResponse, JobMatchAnalysisResult } from '../types';

export const skillGapApi = {
  /**
   * Fetch real skill gap matrix and competency radar data for authenticated user.
   */
  getSkillGapAnalysis: async (params?: {
    track?: string;
    jobId?: string;
  }): Promise<SkillGapAnalysisResponse> => {
    const response = await apiClient.get<SkillGapAnalysisResponse>('/skill-gap', { params });
    return response.data;
  },

  /**
   * Evaluate candidate competencies against custom-pasted job description text.
   */
  analyzeCustomJob: async (data: {
    jobDescription: string;
    jobTitle?: string;
    companyName?: string;
    resumeId?: string;
  }): Promise<JobMatchAnalysisResult> => {
    const response = await apiClient.post<JobMatchAnalysisResult>('/skill-gap/custom', data);
    return response.data;
  },
};

export default skillGapApi;
