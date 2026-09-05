import { apiClient, withFallback } from './client';
import { AtsBreakdown } from '../types';

export interface ResumeAnalysisResult {
  atsScore: number;
  atsBreakdown: AtsBreakdown;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: string[];
  skillGaps: string[];
  recommendations: string[];
}

const MOCK_RESUME_ANALYSIS: ResumeAnalysisResult = {
  atsScore: 88,
  atsBreakdown: {
    overallScore: 88,
    keywordsScore: 92,
    impactScore: 85,
    formattingScore: 90,
    completenessScore: 86,
  },
  strengths: [
    'Strong quantified achievements in distributed transactions ($1T processed).',
    'Demonstrated concurrency expertise with Goroutines, Kafka outbox, and Redis Lua.',
    'Clear section hierarchy matching standard parsing formats (Work, Education, Projects).',
  ],
  weaknesses: [
    'Could expand on cloud deployment infrastructure and Kubernetes pod topologies.',
    'Certifications section could include CKA or AWS Solutions Architect credentials.',
  ],
  missingKeywords: ['eBPF', 'Terraform', 'Service Mesh (Istio)', 'OpenTelemetry', 'gRPC-Web'],
  skillGaps: ['eBPF Linux Kernel Tracing', 'Terraform Multi-Cloud Infrastructure'],
  recommendations: [
    'Add specific latency reduction metrics to the Sliding Window Rate Limiter project.',
    'Include CI/CD pipeline automation keywords in the CloudScale internship description.',
    'Complete the CareerX Cloud Platform Assessment to verify Kubernetes proficiency.',
  ],
};

export const resumeApi = {
  /**
   * Upload resume document (PDF / DOCX) for parsing
   */
  uploadResume: async (formData: FormData): Promise<{ id: string; filename: string; size: string }> => {
    return withFallback(
      apiClient.post<{ id: string; filename: string; size: string }>('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
      {
        id: 'res-alex-rivera-2026',
        filename: 'Alex_Rivera_Distributed_Systems.pdf',
        size: '2.4 MB',
      }
    );
  },

  /**
   * Run full AI-powered ATS resume parsing and rubric evaluation
   */
  analyzeResume: async (resumeId?: string): Promise<ResumeAnalysisResult> => {
    return withFallback(
      apiClient.post<ResumeAnalysisResult>('/resume/analyze', { resumeId }),
      MOCK_RESUME_ANALYSIS
    );
  },

  /**
   * Get cached resume analysis results
   */
  getResumeAnalysis: async (): Promise<ResumeAnalysisResult> => {
    return withFallback(
      apiClient.get<ResumeAnalysisResult>('/resume/analysis'),
      MOCK_RESUME_ANALYSIS
    );
  },
};

export default resumeApi;
