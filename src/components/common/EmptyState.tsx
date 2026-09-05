import React from 'react';
import { cn } from '../../utils/cn';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#D9D9D9] bg-[#F3F6F8]',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-white border border-[#D9D9D9] flex items-center justify-center text-[#788896] mb-3.5 shadow-xs">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-[#1D2226]">{title}</h3>
      <p className="text-xs text-[#56687A] max-w-sm mt-1 mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
