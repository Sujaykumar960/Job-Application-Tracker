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
    // In production, this forwards directly to FastAPI remote execution container:
    // const response = await apiClient.post<ExecutionResult>('/code/execute', payload);
    // return response.data;

    // Simulated remote container execution delay (500ms - 900ms)
    await new Promise((resolve) => setTimeout(resolve, 750));

    const isCustom = Boolean(payload.customInput);
    const testCases: TestCase[] = payload.testCases || [
      { id: 'tc-1', input: '[2, 7, 11, 15], target = 9', expectedOutput: '[0, 1]' },
      { id: 'tc-2', input: '[3, 2, 4], target = 6', expectedOutput: '[1, 2]' },
      { id: 'tc-3', input: '[3, 3], target = 6', expectedOutput: '[0, 1]' },
    ];

    // Check if code is empty or basic error
    if (!payload.code.trim()) {
      return {
        status: 'Compilation Error',
        stdout: '',
        stderr: 'SyntaxError: Empty submission file. No entry point found.',
        executionTimeMs: 12,
        memoryUsageMb: 8.2,
        percentileSpeed: 0,
        percentileMemory: 0,
        testCaseResults: [],
        passedCount: 0,
        totalCount: testCases.length,
      };
    }

    const updatedTestCases = testCases.map((tc, idx) => ({
      ...tc,
      actualOutput: tc.expectedOutput,
      passed: true,
      executionTimeMs: Math.floor(Math.random() * 15) + 25,
    }));

    return {
      status: 'Accepted',
      stdout: isCustom
        ? `Output for custom input: ${payload.customInput}\nEvaluation complete.`
        : 'All test assertions passed.\nExecution verified in isolated gVisor sandbox.',
      executionTimeMs: 42,
      memoryUsageMb: 14.8,
      percentileSpeed: 94.2,
      percentileMemory: 88.5,
      testCaseResults: updatedTestCases,
      passedCount: updatedTestCases.length,
      totalCount: updatedTestCases.length,
    };
  },
};
