import { apiClient } from './client';
import { AtsBreakdown } from '../types';
import { ResumeItem } from '../components/resume/ResumeUploadZone';
import { PillarMetric } from '../components/resume/AtsPillars';
import { BulletImprovement } from '../components/resume/AiBulletOptimizer';

export type { ResumeItem, PillarMetric, BulletImprovement };

export interface MissingKeywordItem {
  name: string;
  priority: 'High' | 'Medium' | 'Low';
  category: string;
}

export interface FormattingCheckItem {
  label: string;
  status: string;
  detail: string;
}

export interface ResumeAnalysisResult {
  atsScore: number;
  atsBreakdown: AtsBreakdown;
  pillars: PillarMetric[];
  strengths: string[];
  weaknesses: string[];
  missingKeywords: MissingKeywordItem[];
  extractedSkills: Record<string, string[]>;
  bulletImprovements: BulletImprovement[];
  recommendations: string[];
  projects?: Array<Record<string, any>>;
  education?: Array<Record<string, any>>;
  formattingHealth?: FormattingCheckItem[];
  rawResumeText?: string;
  jobDescription?: string;
  analyzedAt?: string;
  modelUsed?: string;
}

export const resumeApi = {
  /**
   * List all resumes belonging to current authenticated user
   */
  getResumes: async (): Promise<ResumeItem[]> => {
    const response = await apiClient.get<ResumeItem[]>('/resumes');
    return response.data;
  },

  /**
   * Fetch user's currently active resume
   */
  getActiveResume: async (): Promise<ResumeItem> => {
    const response = await apiClient.get<ResumeItem>('/resumes/active');
    return response.data;
  },

  /**
   * Set specific resume as active
   */
  setActiveResume: async (id: string): Promise<{ success: boolean; id: string; isActive: boolean; message: string }> => {
    const response = await apiClient.patch<{ success: boolean; id: string; isActive: boolean; message: string }>(
      `/resumes/${id}/active`
    );
    return response.data;
  },

  /**
   * Delete resume from database and storage
   */
  deleteResume: async (id: string): Promise<{ success: boolean; id: string; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; id: string; message: string }>(`/resumes/${id}`);
    return response.data;
  },

  /**
   * Upload resume document (PDF / DOCX) for parsing
   */
  uploadResume: async (file: File): Promise<ResumeItem> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ResumeItem>('/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Run full AI-powered ATS resume parsing and rubric evaluation against Groq
   */
  analyzeResume: async (resumeId?: string, jobDescription?: string): Promise<ResumeAnalysisResult> => {
    const response = await apiClient.post<ResumeAnalysisResult>('/resumes/analyze', {
      resumeId,
      jobDescription,
    });
    return response.data;
  },

  /**
   * Get latest cached or persisted resume analysis results
   */
  getResumeAnalysis: async (resumeId?: string): Promise<ResumeAnalysisResult> => {
    const url = resumeId ? `/resumes/${resumeId}/analysis` : '/resumes/analysis';
    const response = await apiClient.get<ResumeAnalysisResult>(url);
    return response.data;
  },
};

export default resumeApi;
