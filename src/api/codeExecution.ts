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
    const response = await apiClient.post<ExecutionResult>('/code/execute', payload);
    return response.data;
  },
};
