import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Sparkles,
  Lightbulb,
  AlertTriangle,
  FileQuestion,
  TrendingUp,
  FlaskConical,
  X,
  Copy,
  Check,
  CheckCircle2,
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
    <div className="p-4 rounded-2xl bg-white border border-[#D9D9D9] shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2]">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] flex items-center gap-2">
              {response?.title || 'AI Coding Assistant'}
              {response?.badge && (
                <Badge variant="brand" size="sm">
                  {response.badge}
                </Badge>
              )}
            </h3>
            <p className="text-[10px] text-[#788896]">FAANG Technical Interview Copilot</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#788896] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-2">
          <Sparkles className="w-6 h-6 text-[#0A66C2] animate-spin" />
          <p className="text-xs font-semibold text-[#1D2226]">Analyzing syntax & algorithms...</p>
          <p className="text-[11px] text-[#788896]">Benchmarking space & time constraints</p>
        </div>
      ) : response ? (
        <div className="space-y-3 text-xs">
          {/* Complexity Badges if optimizing */}
          {(response.timeComplexity || response.spaceComplexity) && (
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {response.timeComplexity && (
                <span className="px-2 py-0.5 rounded bg-[#E6F4EA] text-[#137333] border border-[#c6ecd2] font-bold">
                  Time: {response.timeComplexity}
                </span>
              )}
              {response.spaceComplexity && (
                <span className="px-2 py-0.5 rounded bg-[#E8F3FF] text-[#0A66C2] border border-[#d0e6fc] font-bold">
                  Space: {response.spaceComplexity}
                </span>
              )}
            </div>
          )}

          {/* Explanation Content */}
          <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] text-[#38434F] whitespace-pre-wrap leading-relaxed">
            {response.content}
          </div>

          {/* Code Snippet if applicable */}
          {response.codeSnippet && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[#788896] font-mono">
                <span>Proposed Solution Snippet:</span>
                <button
                  onClick={() => handleCopy(response.codeSnippet!)}
                  className="flex items-center gap-1 text-[#0A66C2] hover:text-[#004182]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] font-mono text-[11px] text-[#0A66C2] overflow-x-auto leading-relaxed shadow-xs">
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
