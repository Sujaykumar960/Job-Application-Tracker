import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CodingProblem } from '../../data/codingProblems';
import {
  FileText,
  Building2,
  CheckCircle2,
  AlertCircle,
  Tag,
  ThumbsUp,
  Bookmark,
  Share2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ProblemDescriptionPanelProps {
  problem: CodingProblem;
  availableProblems: CodingProblem[];
  onSelectProblem: (id: string) => void;
}

export const ProblemDescriptionPanel: React.FC<ProblemDescriptionPanelProps> = ({
  problem,
  availableProblems,
  onSelectProblem,
}) => {
  const difficultyBadge = {
    Easy: 'success',
    Medium: 'warning',
    Hard: 'danger',
  } as const;

  return (
    <div className="h-full flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 overflow-hidden shadow-sm">
      {/* Problem Selector Bar */}
      <div className="px-4 py-2.5 bg-[#F3F6F8] dark:bg-slate-800/80 border-b border-[#E8E8E8] dark:border-slate-700 flex items-center justify-between">
        <select
          value={problem.id}
          onChange={(e) => onSelectProblem(e.target.value)}
          className="bg-white dark:bg-slate-800 text-[#1D2226] dark:text-slate-100 font-bold text-xs rounded-lg border border-[#D9D9D9] dark:border-slate-600 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
        >
          {availableProblems.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.difficulty})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1 text-[#788896]">
          <Badge variant={difficultyBadge[problem.difficulty]} size="sm">
            {problem.difficulty}
          </Badge>
          <span className="text-[10px] font-mono text-[#788896] dark:text-slate-400 ml-1">
            Acceptance: {problem.acceptance}
          </span>
        </div>
      </div>

      {/* Scrollable Problem Statement */}
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-280px)] text-xs text-[#38434F] dark:text-slate-300">
        {/* Title & Companies */}
        <div className="space-y-2">
          <h2 className="text-base font-extrabold text-[#1D2226] dark:text-slate-100">{problem.title}</h2>

          {/* Companies Tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-[#788896] dark:text-slate-400 uppercase font-mono flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Asked by:
            </span>
            {problem.companies.map((c) => (
              <span
                key={c}
                className="px-2 py-0.5 rounded-md bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-300 border border-[#D9D9D9] dark:border-slate-600 font-mono text-[10px]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* Detailed Statement */}
        <div className="space-y-2 leading-relaxed whitespace-pre-wrap font-sans text-[#38434F] dark:text-slate-300">
          {problem.description}
        </div>

        {/* Examples */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono tracking-wider">
            Examples
          </h3>
          {problem.examples.map((ex, i) => (
            <div
              key={i}
              className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-1.5 font-mono text-[11px]"
            >
              <div>
                <span className="text-[#788896] dark:text-slate-400">Input: </span>
                <span className="text-[#1D2226] dark:text-slate-200 whitespace-pre-wrap font-semibold">{ex.input}</span>
              </div>
              <div>
                <span className="text-[#788896] dark:text-slate-400">Output: </span>
                <span className="text-emerald-700 dark:text-emerald-400 whitespace-pre-wrap font-semibold">{ex.output}</span>
              </div>
              {ex.explanation && (
                <div className="text-[10px] text-[#56687A] dark:text-slate-400 pt-1 border-t border-[#E8E8E8] dark:border-slate-700">
                  <span className="text-[#788896] dark:text-slate-500">Explanation: </span>
                  <span className="whitespace-pre-wrap">{ex.explanation}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Constraints */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono tracking-wider">
            Constraints
          </h3>
          <ul className="space-y-1 list-disc list-inside text-[11px] font-mono text-[#56687A] dark:text-slate-400">
            {problem.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        {/* Tags */}
        <div className="pt-2 border-t border-[#E8E8E8] dark:border-slate-700 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-[#788896] dark:text-slate-400 uppercase font-mono flex items-center gap-1">
            <Tag className="w-3 h-3" />
            Tags:
          </span>
          {problem.tags.map((t) => (
            <span
              key={t}
              className="px-2 py-0.5 rounded-full bg-[#E8F3FF] dark:bg-blue-900/40 text-[#0A66C2] dark:text-blue-300 border border-[#d0e6fc] dark:border-blue-700/50 font-mono text-[10px]"
            >
              #{t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProblemDescriptionPanel;
