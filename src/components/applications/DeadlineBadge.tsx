import React from 'react';
import { AlertCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface DeadlineBadgeProps {
  deadline?: string;
  className?: string;
  compact?: boolean;
}

export const DeadlineBadge: React.FC<DeadlineBadgeProps> = ({
  deadline,
  className,
  compact = false,
}) => {
  if (!deadline) {
    return <span className="text-[11px] text-slate-500 font-mono italic">No cutoff</span>;
  }

  // Parse YYYY-MM-DD
  const targetDate = new Date(deadline);
  targetDate.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = targetDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  let status: 'today' | 'overdue' | 'upcoming';
  let label = '';
  let badgeStyle = '';
  let Icon = Clock;

  if (diffDays === 0) {
    status = 'today';
    label = 'Today';
    badgeStyle = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    Icon = AlertTriangle;
  } else if (diffDays < 0) {
    status = 'overdue';
    const pastDays = Math.abs(diffDays);
    label = compact ? 'Overdue' : `Overdue (${pastDays}d ago)`;
    badgeStyle = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    Icon = AlertCircle;
  } else {
    status = 'upcoming';
    label = compact ? 'Upcoming' : `In ${diffDays}d`;
    badgeStyle = 'bg-sky-500/10 text-sky-300 border-sky-500/20';
    Icon = Clock;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-mono font-medium rounded-md px-1.5 py-0.5 text-[11px] border',
        badgeStyle,
        className
      )}
      title={`Deadline: ${deadline} (${status})`}
    >
      <Icon className="w-3 h-3 flex-shrink-0" />
      <span>{label}</span>
    </span>
  );
};

export default DeadlineBadge;
