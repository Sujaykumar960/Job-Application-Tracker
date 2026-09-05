import React, { useState } from 'react';
import { Badge } from '../common/Badge';
import { ExecutionResult, TestCase } from '../../api/codeExecution';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface TestResultsPanelProps {
  testCases: TestCase[];
  executionResult: ExecutionResult | null;
  isExecuting: boolean;
  customInput: string;
  onCustomInputChange: (val: string) => void;
  isCustomInputActive: boolean;
  onToggleCustomInput: (active: boolean) => void;
}

export const TestResultsPanel: React.FC<TestResultsPanelProps> = ({
  testCases,
  executionResult,
  isExecuting,
  customInput,
  onCustomInputChange,
  isCustomInputActive,
  onToggleCustomInput,
}) => {
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0);

  const activeCases = executionResult?.testCaseResults || testCases;
  const currentCase = activeCases[selectedCaseIdx] || activeCases[0];

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Accepted':
        return <Badge variant="success">Accepted ✓</Badge>;
      case 'Wrong Answer':
        return <Badge variant="danger">Wrong Answer ✗</Badge>;
      case 'Runtime Error':
      case 'Compilation Error':
        return <Badge variant="danger">{status}</Badge>;
      case 'Time Limit Exceeded':
        return <Badge variant="warning">Time Limit Exceeded</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-[#D9D9D9] overflow-hidden shadow-sm flex flex-col text-xs">
      {/* Top Header: Execution Status, Runtime & Memory Stats */}
      <div className="px-4 py-2.5 bg-[#F3F6F8] border-b border-[#E8E8E8] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-[#0A66C2]" />
            Execution Console
          </span>

          {executionResult && getStatusBadge(executionResult.status)}

          {isExecuting && (
            <span className="text-[11px] font-mono text-[#8A6100] flex items-center gap-1">
              <Sparkles className="w-3 h-3 animate-spin" />
              Running in sandbox container...
            </span>
          )}
        </div>

        {/* Benchmarks: Execution time & Memory usage */}
        {executionResult && !isExecuting && (
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1 text-[#38434F]">
              <Clock className="w-3 h-3 text-emerald-600" />
              <span>Runtime: </span>
              <strong className="text-emerald-700 font-bold">
                {executionResult.executionTimeMs} ms
              </strong>
              <span className="text-[#788896]">
                (Beats {executionResult.percentileSpeed}%)
              </span>
            </div>

            <div className="flex items-center gap-1 text-[#38434F]">
              <Cpu className="w-3 h-3 text-[#0A66C2]" />
              <span>Memory: </span>
              <strong className="text-[#0A66C2] font-bold">
                {executionResult.memoryUsageMb} MB
              </strong>
              <span className="text-[#788896]">
                (Beats {executionResult.percentileMemory}%)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Test Cases Tabs & Custom Input Toggle */}
      <div className="px-4 py-2 bg-white border-b border-[#E8E8E8] flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          {activeCases.map((tc, idx) => (
            <button
              key={tc.id || idx}
              onClick={() => {
                onToggleCustomInput(false);
                setSelectedCaseIdx(idx);
              }}
              className={cn(
                'px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition flex items-center gap-1.5 border',
                !isCustomInputActive && selectedCaseIdx === idx
                  ? 'bg-[#E8F3FF] border-[#0A66C2] text-[#1D2226] shadow-xs'
                  : 'bg-[#F3F6F8] border-[#D9D9D9] text-[#56687A] hover:text-[#1D2226]'
              )}
            >
              <span>Case {idx + 1}</span>
              {tc.passed !== undefined && (
                tc.passed ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ) : (
                  <XCircle className="w-3 h-3 text-[#B3261E]" />
                )
              )}
            </button>
          ))}

          {/* Custom Input Tab */}
          <button
            onClick={() => onToggleCustomInput(true)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition border',
              isCustomInputActive
                ? 'bg-[#E8F3FF] border-[#0A66C2] text-[#1D2226] shadow-xs'
                : 'bg-[#F3F6F8] border-[#D9D9D9] text-[#56687A] hover:text-[#1D2226]'
            )}
          >
            Custom Input
          </button>
        </div>

        {executionResult && (
          <span className="text-[10px] font-mono text-[#788896]">
            Passed: {executionResult.passedCount} / {executionResult.totalCount}
          </span>
        )}
      </div>

      {/* Content Area: Selected Test Case vs Custom Input vs Stdout */}
      <div className="p-3.5 space-y-3 font-mono text-xs">
        {isCustomInputActive ? (
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-mono text-[#788896] block">
              Custom Stdin Parameters
            </label>
            <textarea
              rows={3}
              value={customInput}
              onChange={(e) => onCustomInputChange(e.target.value)}
              placeholder="e.g. [2, 7, 11, 15], target = 9"
              className="w-full bg-white text-[#1D2226] text-xs rounded-xl border border-[#D9D9D9] p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
            />
          </div>
        ) : currentCase ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Input Box */}
            <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
              <span className="text-[10px] text-[#788896] uppercase">Input</span>
              <p className="text-[#1D2226] whitespace-pre-wrap font-semibold">{currentCase.input}</p>
            </div>

            {/* Expected Output */}
            <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
              <span className="text-[10px] text-[#788896] uppercase">Expected Output</span>
              <p className="text-emerald-700 whitespace-pre-wrap font-semibold">{currentCase.expectedOutput}</p>
            </div>

            {/* Actual Output if evaluated */}
            {currentCase.actualOutput && (
              <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1 col-span-1 sm:col-span-2">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[#788896] uppercase">Your Sandbox Return Output</span>
                  {currentCase.passed ? (
                    <span className="text-emerald-700 font-bold">Matches Expected ✓</span>
                  ) : (
                    <span className="text-[#B3261E] font-bold">Mismatch ✗</span>
                  )}
                </div>
                <p
                  className={cn(
                    'whitespace-pre-wrap font-semibold',
                    currentCase.passed ? 'text-emerald-700' : 'text-[#B3261E]'
                  )}
                >
                  {currentCase.actualOutput}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Stdout / Stderr logs */}
        {executionResult?.stdout && (
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
            <span className="text-[10px] text-[#788896] uppercase">Sandbox Console Stdout</span>
            <pre className="text-[#1D2226] text-[11px] whitespace-pre-wrap leading-relaxed">
              {executionResult.stdout}
            </pre>
          </div>
        )}

        {executionResult?.stderr && (
          <div className="p-2.5 rounded-xl bg-[#FCE8E6] border border-[#f8cbc7] space-y-1 text-[#B3261E]">
            <span className="text-[10px] text-[#B3261E] uppercase">Stderr Diagnostic Trace</span>
            <pre className="text-[11px] whitespace-pre-wrap leading-relaxed">
              {executionResult.stderr}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestResultsPanel;
