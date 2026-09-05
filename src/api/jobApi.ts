import { apiClient, withFallback } from './client';
import { JobItem, JobFilterState } from '../types';
import { MOCK_JOBS } from '../data/mockData';

export const jobApi = {
  /**
   * Fetch job listings with optional multi-facet filters
   */
  getJobs: async (filters?: Partial<JobFilterState>): Promise<JobItem[]> => {
    let result = [...MOCK_JOBS];

    if (filters) {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.company.toLowerCase().includes(q) ||
            j.description.toLowerCase().includes(q)
        );
      }
      if (filters.location && filters.location !== 'All') {
        result = result.filter((j) => j.location.toLowerCase().includes(filters.location!.toLowerCase()));
      }
    }

    return withFallback(
      apiClient.get<JobItem[]>('/jobs', { params: filters }),
      result
    );
  },

  /**
   * Fetch single job details by ID
   */
  getJobById: async (id: string): Promise<JobItem | null> => {
    const found = MOCK_JOBS.find((j) => j.id === id) || null;

    return withFallback(
      apiClient.get<JobItem>(`/jobs/${id}`),
      found
    );
  },

  /**
   * Analyze candidate resume compatibility against specific job description
   */
  getJobMatchAnalysis: async (
    jobId: string
  ): Promise<{ matchScore: number; matchedSkills: string[]; missingSkills: string[]; recommendations: string[] }> => {
    const job = MOCK_JOBS.find((j) => j.id === jobId);

    const fallback = {
      matchScore: job?.matchScore || 88,
      matchedSkills: job?.skills.filter((s) => s.isMatched).map((s) => s.name) || ['Go', 'PostgreSQL', 'Kafka'],
      missingSkills: job?.skills.filter((s) => !s.isMatched).map((s) => s.name) || ['Docker', 'AWS'],
      recommendations: [
        'Review transactional outbox design patterns.',
        'Complete the Kafka message ordering exercise in the Learning Hub.',
      ],
    };

    return withFallback(
      apiClient.post<typeof fallback>(`/jobs/${jobId}/match`),
      fallback
    );
  },
};

export default jobApi;
