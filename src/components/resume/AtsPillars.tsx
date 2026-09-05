import React from 'react';
import { Card } from '../common/Card';
import { Sparkles, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export interface PillarMetric {
  title: string;
  weight: string;
  score: number;
  status: 'optimal' | 'good' | 'needs_work';
  summary: string;
}

export interface AtsPillarsProps {
  pillars: PillarMetric[];
}

export const AtsPillars: React.FC<AtsPillarsProps> = ({ pillars }) => {
  const getStatusColor = (status: PillarMetric['status']) => {
    switch (status) {
      case 'optimal':
        return 'text-emerald-700 bg-emerald-600';
      case 'good':
        return 'text-[#0A66C2] bg-[#0A66C2]';
      case 'needs_work':
        return 'text-[#8A6100] bg-amber-500';
    }
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {pillars.map((p) => {
        const statusClass = getStatusColor(p.status);
        const [textColor, barColor] = statusClass.split(' ');

        return (
          <div
            key={p.title}
            className="p-3 rounded-xl bg-white border border-[#D9D9D9] space-y-2 flex flex-col justify-between shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-mono text-[#788896] truncate">
                {p.title}
              </span>
              <span className="text-[9px] font-mono text-[#788896]">{p.weight}</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <span className={`text-lg font-bold font-mono ${textColor}`}>{p.score}%</span>
                <span className="text-[10px] text-[#56687A] capitalize">{p.status.replace('_', ' ')}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-[#F3F6F8] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${p.score}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] text-[#56687A] leading-tight truncate mt-1" title={p.summary}>
              {p.summary}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default AtsPillars;
