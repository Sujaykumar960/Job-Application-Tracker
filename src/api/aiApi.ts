import { apiClient } from './client';

export interface AiResponse {
  title: string;
  markdownContent: string;
  suggestedCodeSnippet?: string;
}

export const aiApi = {
  /**
   * Request a progressive algorithmic hint for the active coding problem
   */
  getCodingHint: async (problemId: string, userCode: string, language: string): Promise<AiResponse> => {
    const response = await apiClient.post<AiResponse>('/ai/hint', { problemId, userCode, language });
    return response.data;
  },

  /**
   * Explain compilation or runtime execution error with fix recommendations
   */
  explainError: async (code: string, errorOutput: string, language: string): Promise<AiResponse> => {
    const response = await apiClient.post<AiResponse>('/ai/explain-error', { code, errorOutput, language });
    return response.data;
  },

  /**
   * Step-by-step walkthrough of submitted code
   */
  explainCode: async (code: string, language: string): Promise<AiResponse> => {
    const response = await apiClient.post<AiResponse>('/ai/explain-code', { code, language });
    return response.data;
  },

  /**
   * Suggest optimizations for space/time complexity
   */
  optimizeCode: async (code: string, language: string): Promise<AiResponse> => {
    const response = await apiClient.post<AiResponse>('/ai/optimize', { code, language });
    return response.data;
  },

  /**
   * Synthesize edge-case unit test scenarios
   */
  generateTests: async (code: string, language: string): Promise<AiResponse> => {
    const response = await apiClient.post<AiResponse>('/ai/generate-tests', { code, language });
    return response.data;
  },
};

export default aiApi;
