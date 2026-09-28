import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className,
}) => {
  const variantStyles = {
    brand: 'bg-[#E8F3FF] dark:bg-blue-500/15 text-[#0A66C2] dark:text-blue-400 border-[#d0e6fc] dark:border-blue-500/30',
    success: 'bg-[#E6F4EA] dark:bg-emerald-500/15 text-[#137333] dark:text-emerald-400 border-[#c6ecd2] dark:border-emerald-500/30',
    warning: 'bg-[#FFF4CC] dark:bg-amber-500/15 text-[#8A6100] dark:text-amber-400 border-[#ffe899] dark:border-amber-500/30',
    danger: 'bg-[#FCE8E6] dark:bg-rose-500/15 text-[#B3261E] dark:text-rose-400 border-[#f8cbc7] dark:border-rose-500/30',
    info: 'bg-[#E8F3FF] dark:bg-blue-500/15 text-[#0A66C2] dark:text-blue-400 border-[#d0e6fc] dark:border-blue-500/30',
    neutral: 'bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-300 border-[#D9D9D9] dark:border-slate-700',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-medium',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
};
