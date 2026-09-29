import { apiClient } from './client';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed?: boolean;
  executionTimeMs?: number;
}

export interface ExecuteCodePayload {
  language: string;
  code: string;
  customInput?: string;
  testCases?: TestCase[];
}

export type ExecutionStatus =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Runtime Error'
  | 'Time Limit Exceeded'
  | 'Compilation Error';

export interface ExecutionResult {
  status: ExecutionStatus;
  stdout: string;
  stderr?: string;
  executionTimeMs: number;
  memoryUsageMb: number;
  percentileSpeed: number;
  percentileMemory: number;
  testCaseResults: TestCase[];
  passedCount: number;
  totalCount: number;
}

/**
 * Executes code via backend execution sandbox (FastAPI).
 * IMPORTANT: No arbitrary user code is ever executed locally in the browser runtime.
 */
export const codeExecutionApi = {
  execute: async (payload: ExecuteCodePayload): Promise<ExecutionResult> => {
    try {
      const response = await apiClient.post<ExecutionResult>('/code/execute', payload);
      return response.data;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.detail ||
        err?.message ||
        'Unable to reach code execution sandbox server. Please verify backend is running.';
      return {
        status: 'Runtime Error',
        stdout: '',
        stderr: errorMsg,
        executionTimeMs: 0,
        memoryUsageMb: 0,
        percentileSpeed: 0,
        percentileMemory: 0,
        testCaseResults: (payload.testCases || []).map((tc) => ({
          ...tc,
          passed: false,
          actualOutput: 'Execution Error',
          executionTimeMs: 0,
        })),
        passedCount: 0,
        totalCount: payload.testCases?.length || 0,
      };
    }
  },
};
