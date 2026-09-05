import React, { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { ProblemDescriptionPanel } from '../components/coding/ProblemDescriptionPanel';
import { CodeEditorPanel } from '../components/coding/CodeEditorPanel';
import { TestResultsPanel } from '../components/coding/TestResultsPanel';
import {
  AiAssistantDrawer,
  AiActionType,
  AiAssistantResponse,
} from '../components/coding/AiAssistantDrawer';
import { CODING_PROBLEMS, CodingProblem } from '../data/codingProblems';
import { codeExecutionApi, ExecutionResult } from '../api/codeExecution';
import {
  Code2,
  Terminal,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Flame,
  Bookmark,
  Shuffle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CodingPracticePage: React.FC = () => {
  // Problem State
  const [currentProblemId, setCurrentProblemId] = useState<string>(CODING_PROBLEMS[0].id);
  const currentProblem: CodingProblem =
    CODING_PROBLEMS.find((p) => p.id === currentProblemId) || CODING_PROBLEMS[0];

  // Language & Code Editor State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('go');
  const [code, setCode] = useState<string>(
    currentProblem.starterCode[selectedLanguage] || currentProblem.starterCode.go
  );

  // Execution & Test Results State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [isCustomInputActive, setIsCustomInputActive] = useState(false);

  // AI Coding Assistant State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AiAssistantResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Switch problem
  const handleSelectProblem = (id: string) => {
    const prob = CODING_PROBLEMS.find((p) => p.id === id);
    if (prob) {
      setCurrentProblemId(id);
      setCode(prob.starterCode[selectedLanguage] || prob.starterCode.go || '');
      setExecutionResult(null);
      setIsAiDrawerOpen(false);
    }
  };

  // Switch language
  const handleLanguageChange = (newLang: string) => {
    setSelectedLanguage(newLang);
    setCode(currentProblem.starterCode[newLang] || currentProblem.starterCode.go || '');
    setExecutionResult(null);
  };

  // Reset code
  const handleResetCode = () => {
    if (window.confirm('Reset editor to original problem starter code?')) {
      setCode(currentProblem.starterCode[selectedLanguage] || currentProblem.starterCode.go || '');
      setExecutionResult(null);
    }
  };

  // Run code against test cases or custom input
  const handleRunCode = async () => {
    setIsExecuting(true);
    try {
      const res = await codeExecutionApi.execute({
        language: selectedLanguage,
        code,
        customInput: isCustomInputActive ? customInput : undefined,
        testCases: currentProblem.testCases,
      });
      setExecutionResult(res);
    } finally {
      setIsExecuting(false);
    }
  };

  // Submit code (full suite evaluation)
  const handleSubmitCode = async () => {
    setIsExecuting(true);
    try {
      const res = await codeExecutionApi.execute({
        language: selectedLanguage,
        code,
        testCases: currentProblem.testCases,
      });
      setExecutionResult(res);
      if (res.status === 'Accepted') {
        setToastMessage(`🎉 Solution for "${currentProblem.title}" Accepted! Speed: ${res.executionTimeMs}ms (Beats ${res.percentileSpeed}%). Logged to Career Progress.`);
        setTimeout(() => setToastMessage(null), 5000);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle AI Assistant Actions (Hint, Explain Error, Explain Code, Optimize, Generate Tests)
  const handleAiAction = (action: AiActionType) => {
    setIsAiDrawerOpen(true);
    setIsAiLoading(true);

    setTimeout(() => {
      setIsAiLoading(false);

      switch (action) {
        case 'hint':
          setAiResponse({
            action: 'hint',
            title: 'Algorithmic Intuition & Data Structure Hint',
            badge: 'Key Idea',
            content: `To achieve true O(1) time complexity for both \`get\` and \`put\`, you need two synchronized data structures:
1. A **Hash Map** (\`map[int]*Node\`) for O(1) key lookup.
2. A **Doubly-Linked List** with dummy \`head\` and \`tail\` sentinels to remove and re-insert nodes in O(1) time without traversing.
When accessing a key with \`get\`, remove the node from its current spot and insert it immediately after \`head\`. When adding exceeds capacity, drop \`tail.prev\`.`,
          });
          break;

        case 'explain_error':
          setAiResponse({
            action: 'explain_error',
            title: 'Static Analysis & Edge-Case Vulnerabilities',
            badge: 'Diagnostic',
            content: `Potential pitfalls identified in your implementation:
1. **Nil Pointer Dereference**: Check if dummy head and tail are properly linked before inserting: \`head.next = tail\` and \`tail.prev = head\`.
2. **Duplicate Key Updates**: When putting an existing key, remember to update its value AND move it to the most recently used position.
3. **Capacity = 1 Edge Case**: Ensure that evicting a single node correctly updates \`tail.prev\` to \`head\`.`,
          });
          break;

        case 'explain_code':
          setAiResponse({
            action: 'explain_code',
            title: 'Step-by-Step Code Walkthrough',
            badge: 'Explanation',
            content: `Here is the architectural execution flow of this solution:
* \`Constructor(capacity)\`: Initializes the map and links \`head <-> tail\` sentinels.
* \`moveToHead(node)\`: Unlinks the node from its neighbors in 4 pointer re-assignments and stitches it between \`head\` and \`head.next\`.
* \`removeTail()\`: Extracts \`tail.prev\` and deletes its entry from the hash map to release memory.`,
          });
          break;

        case 'optimize':
          setAiResponse({
            action: 'optimize',
            title: 'Time & Space Complexity Optimization',
            badge: 'Optimal',
            timeComplexity: 'O(1) average per operation',
            spaceComplexity: 'O(capacity) space in hash map',
            content: `Your algorithm achieves optimal O(1) amortized bounds.
For high-concurrency production systems (like Redis/Memcached), consider:
- Partitioning the cache into 16 striped mutex shards to avoid single-lock contention.
- Pre-allocating node structs in a contiguous slice to maximize CPU L1/L2 cache locality.`,
            codeSnippet: `// Striped LRU Cache slice layout for memory locality
type Node struct {
    key, val   int
    prev, next *Node
}`,
          });
          break;

        case 'generate_tests':
          setAiResponse({
            action: 'generate_tests',
            title: 'Adversarial Edge-Case Test Suite',
            badge: 'Test Generator',
            content: `Generated 3 high-stress boundary test cases covering cache eviction and concurrency:`,
            codeSnippet: `// Test Case 1: Capacity = 1 thrashing
c := Constructor(1)
c.Put(1, 10); c.Put(2, 20); // 1 evicted
assert(c.Get(1) == -1 && c.Get(2) == 20)

// Test Case 2: Overwrite existing key without increasing size
c2 := Constructor(2)
c2.Put(1, 1); c2.Put(2, 2); c2.Put(1, 100) // update 1
c2.Put(3, 3) // evicts 2, keeps 1
assert(c2.Get(2) == -1 && c2.Get(1) == 100)`,
          });
          break;
      }
    }, 600);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        title="Interactive Coding & Algorithmic Practice"
        description="Solve FAANG interview problems in Monaco Editor with sandboxed remote execution readiness and AI copilot support."
        badge={
          <Badge variant="brand" size="sm">
            Monaco IDE v4.6
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/learning/languages">
              <Button size="sm" variant="outline" icon={<Code2 className="w-3.5 h-3.5 text-brand-400" />}>
                Language Tracks
              </Button>
            </Link>
            <Link to="/learning">
              <Button size="sm" variant="secondary" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Learning Hub
              </Button>
            </Link>
          </div>
        }
      />

      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/progress"
            className="font-semibold text-emerald-800 underline text-xs flex items-center gap-1 flex-shrink-0"
          >
            View Career Progress <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* AI Assistant Drawer Popover */}
      {isAiDrawerOpen && (
        <AiAssistantDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          response={aiResponse}
          isLoading={isAiLoading}
          onApplySnippet={(snippet) => {
            setCode((prev) => `${prev}\n\n${snippet}`);
            setIsAiDrawerOpen(false);
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* MAIN TWO-COLUMN LAYOUT: LEFT (PROBLEM) & RIGHT (CODE EDITOR + OUTPUT)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: PROBLEM DESCRIPTION (5 Cols) */}
        <div className="lg:col-span-5 h-[calc(100vh-170px)] min-h-[460px]">
          <ProblemDescriptionPanel
            problem={currentProblem}
            availableProblems={CODING_PROBLEMS}
            onSelectProblem={handleSelectProblem}
          />
        </div>

        {/* RIGHT COLUMN: CODE EDITOR & OUTPUT CONSOLE (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 h-[calc(100vh-170px)] min-h-[460px] overflow-y-auto">
          {/* TOP: Monaco Code Editor */}
          <div className="flex-1 min-h-[260px]">
            <CodeEditorPanel
              language={selectedLanguage}
              onLanguageChange={handleLanguageChange}
              code={code}
              onCodeChange={(newCode) => setCode(newCode)}
              onReset={handleResetCode}
              onRun={handleRunCode}
              onSubmit={handleSubmitCode}
              isExecuting={isExecuting}
              onAiAction={handleAiAction}
              isAiLoading={isAiLoading}
            />
          </div>

          {/* BOTTOM: Output / Test Results */}
          <div className="flex-shrink-0">
            <TestResultsPanel
              testCases={currentProblem.testCases}
              executionResult={executionResult}
              isExecuting={isExecuting}
              customInput={customInput}
              onCustomInputChange={setCustomInput}
              isCustomInputActive={isCustomInputActive}
              onToggleCustomInput={setIsCustomInputActive}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingPracticePage;
