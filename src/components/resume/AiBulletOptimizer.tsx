import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  TrendingUp,
  FileCheck,
} from 'lucide-react';

export interface BulletImprovement {
  id: string;
  section: string;
  original: string;
  optimized: string;
  rationale: string;
  scoreImpact: string;
}

export interface AiBulletOptimizerProps {
  bullets: BulletImprovement[];
}

export const AiBulletOptimizer: React.FC<AiBulletOptimizerProps> = ({ bullets }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5 uppercase font-mono tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            AI Bullet Enhancer (STAR Method)
          </h3>
          <p className="text-[11px] text-[#56687A] mt-0.5">
            Transform passive duty statements into quantified, high-impact achievements.
          </p>
        </div>
        <Badge variant="brand" size="sm">
          {bullets.length} High-Impact Suggestions
        </Badge>
      </div>

      <div className="space-y-3">
        {bullets.map((b) => (
          <div
            key={b.id}
            className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] hover:border-[#0A66C2]/40 transition-all space-y-3 shadow-xs"
          >
            {/* Header: Section & Impact Score */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-[#56687A] bg-[#F3F6F8] border border-[#D9D9D9] px-2 py-0.5 rounded">
                {b.section}
              </span>
              <span className="text-[10px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {b.scoreImpact}
              </span>
            </div>

            {/* Comparison Box */}
            <div className="space-y-2 text-xs">
              {/* 1. Verified User Original */}
              <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-[#788896] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#788896]" />
                    Verified User Content (Original)
                  </span>
                  <span className="text-[#788896] font-mono">Current Version</span>
                </div>
                <p className="text-[#56687A] italic leading-relaxed pl-1 font-sans">
                  "{b.original}"
                </p>
              </div>

              {/* 2. AI Recommendation */}
              <div className="p-3 rounded-xl bg-[#E8F3FF] border border-[#d0e6fc] space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-[#0A66C2] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    AI-Optimized Recommendation (STAR Framework)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(b.optimized, b.id)}
                    className="flex items-center gap-1 text-[10px] text-[#0A66C2] hover:text-[#004182] font-mono transition"
                  >
                    {copiedId === b.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[#1D2226] font-medium leading-relaxed font-sans">
                  "{b.optimized}"
                </p>
              </div>
            </div>

            {/* AI Diagnostics Rationale */}
            <div className="text-[11px] text-[#56687A] flex items-start gap-1.5 pt-1 border-t border-[#E8E8E8] font-mono">
              <span className="text-[#0A66C2] font-semibold flex-shrink-0">Why this works:</span>
              <span className="text-[#38434F]">{b.rationale}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiBulletOptimizer;
