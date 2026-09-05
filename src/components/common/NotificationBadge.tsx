import React from 'react';
import { cn } from '../../utils/cn';

export interface NotificationBadgeProps {
  count?: number;
  dot?: boolean;
  variant?: 'danger' | 'brand' | 'warning' | 'emerald';
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  dot = false,
  variant = 'danger',
  className,
}) => {
  if (!dot && (count === undefined || count <= 0)) {
    return null;
  }

  const variantStyles = {
    danger: 'bg-[#E6395A] text-white shadow-rose-500/20',
    brand: 'bg-[#0A66C2] text-white shadow-blue-500/20',
    warning: 'bg-[#F5A623] text-white shadow-amber-500/20',
    emerald: 'bg-[#12B886] text-white shadow-emerald-500/20',
  };

  if (dot) {
    return (
      <span
        className={cn(
          'w-2 h-2 rounded-full ring-2 ring-white animate-pulse',
          variantStyles[variant].split(' ')[0],
          className
        )}
      />
    );
  }

  const displayCount = count && count > 99 ? '99+' : count;

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full shadow-sm ring-2 ring-white',
        variantStyles[variant],
        className
      )}
    >
      {displayCount}
    </span>
  );
};

export default NotificationBadge;
