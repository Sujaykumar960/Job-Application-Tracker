import React from 'react';
import { cn } from '../../utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'rect',
  ...props
}) => {
  const variantStyles = {
    rect: 'rounded-lg',
    circle: 'rounded-full',
    text: 'rounded h-3.5 w-full',
  };

  return (
    <div
      className={cn(
        'animate-pulse bg-surface-800/60',
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
};

export default Skeleton;
