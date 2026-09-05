import { apiClient, withFallback } from './client';
import { CODING_PROBLEMS, CodingProblem } from '../data/codingProblems';
import { ExecuteCodePayload, ExecutionResult, codeExecutionApi } from './codeExecution';

export const questionApi = {
  /**
   * Fetch all coding questions with optional difficulty/tag filtering
   */
  getQuestions: async (filter?: { difficulty?: string; tag?: string }): Promise<CodingProblem[]> => {
    let result = [...CODING_PROBLEMS];
    if (filter?.difficulty && filter.difficulty !== 'All') {
      result = result.filter((p: CodingProblem) => p.difficulty.toLowerCase() === filter.difficulty!.toLowerCase());
    }

    return withFallback(
      apiClient.get<CodingProblem[]>('/questions', { params: filter }),
      result
    );
  },

  /**
   * Fetch single coding problem by ID or slug
   */
  getQuestionById: async (id: string): Promise<CodingProblem | null> => {
    const found = CODING_PROBLEMS.find((p: CodingProblem) => p.id === id || p.slug === id) || null;

    return withFallback(
      apiClient.get<CodingProblem>(`/questions/${id}`),
      found
    );
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
