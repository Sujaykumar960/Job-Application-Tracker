import React from 'react';
import { cn } from '../../utils/cn';

export interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  className,
}) => {
  const sizeStyles = {
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-lg',
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className={cn('relative inline-flex flex-shrink-0', className)}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn('rounded-full object-cover border border-surface-700', sizeStyles[size])}
        />
      ) : (
        <div
          className={cn(
            'rounded-full bg-brand-600/20 text-brand-300 font-semibold border border-brand-500/30 flex items-center justify-center',
            sizeStyles[size]
          )}
        >
          {getInitials(name)}
        </div>
      )}
      {isOnline !== undefined && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-surface-950',
            isOnline ? 'bg-emerald-400' : 'bg-slate-500',
            size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5'
          )}
        />
      )}
    </div>
  );
};
