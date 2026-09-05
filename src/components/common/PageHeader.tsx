import React from 'react';
import { Breadcrumb, BreadcrumbItem } from './Breadcrumb';
import { cn } from '../../utils/cn';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  breadcrumbs,
  showBreadcrumbs = true,
  className,
}) => {
  return (
    <div className={cn('space-y-2 pb-5 border-b border-[#D9D9D9]', className)}>
      {showBreadcrumbs && (
        <div className="mb-1.5">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-lg sm:text-xl laptop:text-2xl font-bold tracking-tight text-[#1D2226] font-sans leading-snug">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-[#56687A] max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
