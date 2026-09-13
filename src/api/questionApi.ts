import { apiClient } from './client';
import { CodingProblem } from '../data/codingProblems';
import { ExecuteCodePayload, ExecutionResult, codeExecutionApi } from './codeExecution';

export const questionApi = {
  /**
   * Fetch all coding questions with optional difficulty/tag filtering
   */
  getQuestions: async (filter?: { difficulty?: string; tag?: string }): Promise<CodingProblem[]> => {
    const response = await apiClient.get<CodingProblem[]>('/questions', { params: filter });
    return response.data;
  },

  /**
   * Fetch single coding problem by ID or slug
   */
  getQuestionById: async (id: string): Promise<CodingProblem> => {
    const response = await apiClient.get<CodingProblem>(`/questions/${id}`);
    return response.data;
  },

  /**
   * Execute code against standard sample test cases
   */
  runCode: async (payload: ExecuteCodePayload): Promise<ExecutionResult> => {
    return codeExecutionApi.execute(payload);
  },

  /**
   * Submit code for full evaluation across all hidden test cases
   */
  submitCode: async (payload: ExecuteCodePayload): Promise<ExecutionResult> => {
    return codeExecutionApi.execute(payload);
  },
};

export default questionApi;
