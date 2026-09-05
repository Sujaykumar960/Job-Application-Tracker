import React, { useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Button } from '../common/Button';
import {
  Play,
  Check,
  RotateCcw,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  FlaskConical,
  Code2,
} from 'lucide-react';
import { AiActionType } from './AiAssistantDrawer';

export interface CodeEditorPanelProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  code: string;
  onCodeChange: (newCode: string) => void;
  onReset: () => void;
  onRun: () => void;
  onSubmit: () => void;
  isExecuting: boolean;
  onAiAction: (action: AiActionType) => void;
  isAiLoading: boolean;
}

const SUPPORTED_LANGUAGES = [
  { id: 'go', name: 'Go', monacoLang: 'go' },
  { id: 'python', name: 'Python 3', monacoLang: 'python' },
  { id: 'typescript', name: 'TypeScript', monacoLang: 'typescript' },
  { id: 'javascript', name: 'JavaScript', monacoLang: 'javascript' },
  { id: 'cpp', name: 'C++', monacoLang: 'cpp' },
  { id: 'java', name: 'Java', monacoLang: 'java' },
  { id: 'rust', name: 'Rust', monacoLang: 'rust' },
];

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = ({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onReset,
  onRun,
  onSubmit,
  isExecuting,
  onAiAction,
  isAiLoading,
}) => {
  const currentMonacoLang =
    SUPPORTED_LANGUAGES.find((l) => l.id === language)?.monacoLang || 'go';

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    // Customize editor settings if necessary
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
      lineNumbers: 'on',
      folding: true,
      automaticLayout: true,
      tabSize: 4,
    });
  };

  return (
    <div className="h-full flex flex-col rounded-2xl bg-white border border-[#D9D9D9] overflow-hidden shadow-sm">
      {/* Editor Top Toolbar: Language Selector, AI Assistant Buttons & Actions */}
      <div className="px-3.5 py-2 bg-[#F3F6F8] border-b border-[#E8E8E8] flex flex-wrap items-center justify-between gap-2">
        {/* Left: Language Selector & Reset */}
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-white text-[#1D2226] text-xs font-mono font-semibold rounded-lg border border-[#D9D9D9] px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            {SUPPORTED_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg text-[#788896] hover:text-[#1D2226] hover:bg-white transition"
            title="Reset code template"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Middle: AI Coding Assistant Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
          <Button
            size="xs"
            variant="ghost"
            className="text-[11px] text-[#8A6100] hover:bg-[#FFF4CC] px-2"
            disabled={isAiLoading}
            onClick={() => onAiAction('hint')}
            icon={<Lightbulb className="w-3 h-3 text-amber-500" />}
          >
            Give Hint
          </Button>

          <Button
            size="xs"
            variant="ghost"
            className="text-[11px] text-[#B3261E] hover:bg-[#FCE8E6] px-2"
            disabled={isAiLoading}
            onClick={() => onAiAction('explain_error')}
            icon={<AlertTriangle className="w-3 h-3 text-rose-500" />}
          >
            Explain Error
          </Button>

          <Button
            size="xs"
            variant="ghost"
            className="text-[11px] text-[#0A66C2] hover:bg-[#E8F3FF] px-2"
            disabled={isAiLoading}
            onClick={() => onAiAction('explain_code')}
            icon={<FileQuestion className="w-3 h-3 text-[#0A66C2]" />}
          >
            Explain Code
          </Button>

          <Button
            size="xs"
            variant="ghost"
            className="text-[11px] text-[#137333] hover:bg-[#E6F4EA] px-2"
            disabled={isAiLoading}
            onClick={() => onAiAction('optimize')}
            icon={<TrendingUp className="w-3 h-3 text-emerald-600" />}
          >
            Optimize
          </Button>

          <Button
            size="xs"
            variant="ghost"
            className="text-[11px] text-[#0A66C2] hover:bg-[#E8F3FF] px-2"
            disabled={isAiLoading}
            onClick={() => onAiAction('generate_tests')}
            icon={<FlaskConical className="w-3 h-3 text-[#0A66C2]" />}
          >
            Generate Tests
          </Button>
        </div>

        {/* Right: Run & Submit Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="secondary"
            loading={isExecuting}
            onClick={onRun}
            icon={<Play className="w-3 h-3 text-emerald-600" />}
          >
            Run
          </Button>

          <Button
            size="xs"
            variant="primary"
            loading={isExecuting}
            onClick={onSubmit}
            icon={<Check className="w-3.5 h-3.5" />}
          >
            Submit
          </Button>
        </div>
      </div>

      {/* Monaco Editor Component */}
      <div className="flex-1 w-full min-h-[260px] max-h-[440px] overflow-hidden">
        <Editor
          height="100%"
          language={currentMonacoLang}
          value={code}
          theme="vs-dark"
          onChange={(val) => onCodeChange(val || '')}
          onMount={handleEditorDidMount}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
          }}
        />
      </div>
    </div>
  );
};

export default CodeEditorPanel;
