import React from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Sparkles,
  X,
  Copy,
  Check,
} from 'lucide-react';

export type AiActionType =
  | 'hint'
  | 'explain_error'
  | 'explain_code'
  | 'optimize'
  | 'generate_tests';

export interface AiAssistantResponse {
  action: AiActionType;
  title: string;
  badge: string;
  content: string;
  codeSnippet?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  response: AiAssistantResponse | null;
  isLoading: boolean;
  onApplySnippet?: (snippet: string) => void;
}

const renderFormattedText = (text: string) => {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-[#1D2226] dark:text-slate-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 font-mono text-[11px] text-[#0A66C2] dark:text-sky-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const renderMarkdownContent = (content: string) => {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-xs text-[#38434F] dark:text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-0.5" />;
        }

        // Heading 3: ### Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={idx}
              className="text-xs font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono tracking-wider pt-1.5 first:pt-0"
            >
              {renderFormattedText(trimmed.replace(/^###\s+/, ''))}
            </h4>
          );
        }

        // Heading 2: ## Heading
        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={idx}
              className="text-sm font-bold text-[#1D2226] dark:text-slate-100 pt-2 first:pt-0"
            >
              {renderFormattedText(trimmed.replace(/^##\s+/, ''))}
            </h3>
          );
        }

        // Bullet item: - or *
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 leading-relaxed">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0A66C2] dark:bg-sky-400 mt-1.5 flex-shrink-0" />
              <span>{renderFormattedText(trimmed.replace(/^[-*]\s+/, ''))}</span>
            </div>
          );
        }

        // Numbered list: 1. 2. etc.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 leading-relaxed">
              <span className="text-[10px] font-mono font-bold text-[#0A66C2] dark:text-sky-400 bg-[#E8F3FF] dark:bg-sky-950/60 border border-[#d0e6fc] dark:border-sky-800/50 px-1 rounded flex-shrink-0">
                {numMatch[1]}
              </span>
              <span>{renderFormattedText(numMatch[2])}</span>
            </div>
          );
        }

        // Regular paragraph line
        return (
          <p key={idx} className="leading-relaxed">
            {renderFormattedText(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({
  isOpen,
  onClose,
  response,
  isLoading,
  onApplySnippet,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E8E8] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8F3FF] dark:bg-blue-900/40 border border-[#d0e6fc] dark:border-blue-700/50 flex items-center justify-center text-[#0A66C2] dark:text-blue-400">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 flex items-center gap-2">
              {response?.title || 'AI Coding Assistant'}
              {response?.badge && (
                <Badge variant="brand" size="sm">
                  {response.badge}
                </Badge>
              )}
            </h3>
            <p className="text-[10px] text-[#788896] dark:text-slate-400">FAANG Technical Interview Copilot</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#788896] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800 transition"
          aria-label="Close copilot"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
          <Sparkles className="w-6 h-6 text-[#0A66C2] dark:text-sky-400 animate-spin" />
          <p className="text-xs font-semibold text-[#1D2226] dark:text-slate-100">Analyzing syntax & algorithms...</p>
          <p className="text-[11px] text-[#788896] dark:text-slate-400">Benchmarking space & time constraints</p>
        </div>
      ) : response ? (
        <div className="space-y-3 text-xs">
          {/* Complexity Badges if optimizing */}
          {(response.timeComplexity || response.spaceComplexity) && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {response.timeComplexity && (
                <span className="px-2 py-0.5 rounded bg-[#E6F4EA] dark:bg-emerald-950/40 text-[#137333] dark:text-emerald-400 border border-[#c6ecd2] dark:border-emerald-800/40 font-bold">
                  Time: {response.timeComplexity}
                </span>
              )}
              {response.spaceComplexity && (
                <span className="px-2 py-0.5 rounded bg-[#E8F3FF] dark:bg-blue-950/40 text-[#0A66C2] dark:text-blue-400 border border-[#d0e6fc] dark:border-blue-800/40 font-bold">
                  Space: {response.spaceComplexity}
                </span>
              )}
            </div>
          )}

          {/* Explanation Content */}
          <div className="p-3.5 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700/80 leading-relaxed">
            {renderMarkdownContent(response.content)}
          </div>

          {/* Code Snippet if applicable */}
          {response.codeSnippet && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#788896] dark:text-slate-400 font-mono">
                <span>Proposed Solution Snippet:</span>
                <button
                  onClick={() => handleCopy(response.codeSnippet!)}
                  className="flex items-center gap-1 text-[#0A66C2] dark:text-sky-400 hover:text-[#004182] dark:hover:text-sky-300 font-semibold"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-700 dark:text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090D16] dark:bg-[#070D18] border border-slate-700/60 dark:border-slate-800 font-mono text-[12px] text-cyan-300 dark:text-cyan-300 overflow-x-auto leading-relaxed shadow-md">
                <pre>{response.codeSnippet}</pre>
              </div>

              {onApplySnippet && (
                <div className="flex justify-end pt-1">
                  <Button
                    size="xs"
                    variant="primary"
                    onClick={() => onApplySnippet(response.codeSnippet!)}
                  >
                    Apply Snippet to Editor
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default AiAssistantDrawer;
