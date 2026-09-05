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
    brand: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
    success: 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]',
    warning: 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]',
    danger: 'bg-[#FCE8E6] text-[#B3261E] border-[#f8cbc7]',
    info: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
    neutral: 'bg-[#F3F6F8] text-[#56687A] border-[#D9D9D9]',
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
