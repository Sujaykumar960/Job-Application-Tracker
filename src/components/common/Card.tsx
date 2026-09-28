import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className, hoverable = false, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-[#D9D9D9] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all duration-200',
        hoverable && 'hover:border-[#0A66C2] dark:hover:border-blue-500 hover:shadow-md cursor-pointer',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div
    className={cn('px-5 py-4 border-b border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between', className)}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={cn('text-sm font-semibold text-[#1D2226] dark:text-slate-100 tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('p-5 text-[#38434F] dark:text-slate-200', className)} {...props}>
    {children}
  </div>
);
