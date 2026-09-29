import React from 'react';
import { cn } from '../../utils/cn';

export interface CircularAtsGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
}

export const CircularAtsGauge: React.FC<CircularAtsGaugeProps> = ({
  score,
  size = 140,
  strokeWidth = 10,
  label = 'Overall ATS Score',
  className,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Determine color theme based on score tier
  const getGradientId = () => {
    if (score >= 90) return 'atsGradientGreen';
    if (score >= 80) return 'atsGradientIndigo';
    return 'atsGradientAmber';
  };

  const getTierLabel = () => {
    if (score >= 90) return { text: 'Top 5% Tier', color: 'text-[#137333] dark:text-emerald-400 bg-[#E6F4EA] dark:bg-emerald-950/40 border-[#c6ecd2] dark:border-emerald-800/40' };
    if (score >= 80) return { text: 'FAANG Ready', color: 'text-[#0A66C2] dark:text-blue-400 bg-[#E8F3FF] dark:bg-blue-950/40 border-[#d0e6fc] dark:border-blue-800/40' };
    return { text: 'Needs Tuning', color: 'text-[#8A6100] dark:text-amber-400 bg-[#FFF4CC] dark:bg-amber-950/40 border-[#ffe899] dark:border-amber-800/40' };
  };

  const tier = getTierLabel();

  return (
    <div className={cn('flex flex-col items-center justify-center relative select-none', className)}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          <defs>
            {/* Emerald Gradient */}
            <linearGradient id="atsGradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#12B886" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            {/* Indigo Gradient */}
            <linearGradient id="atsGradientIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0A66C2" />
              <stop offset="100%" stopColor="#7C83FD" />
            </linearGradient>
            {/* Amber Gradient */}
            <linearGradient id="atsGradientAmber" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5A623" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Background track circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="transparent"
            className="stroke-[#E8E8E8] dark:stroke-slate-800"
          />

          {/* Foreground progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={`url(#${getGradientId()})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline">
            <span className="text-3xl font-extrabold text-[#1D2226] dark:text-slate-100 tracking-tight font-mono">
              {score}
            </span>
            <span className="text-xs text-[#788896] dark:text-slate-400 font-mono">/100</span>
          </div>
          <span className="text-[10px] text-[#56687A] dark:text-slate-400 font-medium">ATS Match</span>
        </div>
      </div>

      {/* Tier Badge */}
      <div className="mt-2 text-center">
        <span className={cn('text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full border', tier.color)}>
          {tier.text}
        </span>
        {label && <p className="text-[11px] text-[#56687A] dark:text-slate-400 mt-1">{label}</p>}
        <p className="text-[9px] text-[#788896] dark:text-slate-500 mt-0.5 font-sans">CareerX AI Heuristic Analysis</p>
      </div>
    </div>
  );
};

export default CircularAtsGauge;
