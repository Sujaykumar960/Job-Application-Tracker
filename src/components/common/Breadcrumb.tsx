import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
}

const ROUTE_LABELS: Record<string, string> = {
  applications: 'Applications',
  jobs: 'Jobs',
  companies: 'Companies',
  resume: 'Resume AI',
  matcher: 'Job Match',
  'job-match': 'Job Match',
  skills: 'Skill Gap',
  learning: 'Learning',
  languages: 'Programming Languages',
  code: 'Coding Practice',
  practice: 'Coding Practice',
  progress: 'Progress',
  feed: 'Social Feed',
  network: 'Network',
  community: 'Community',
  messages: 'Messages',
  notifications: 'Notifications',
  calendar: 'Calendar',
  profile: 'Profile',
  settings: 'Settings',
  recruiter: 'Recruiter Portal',
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className,
  showHomeIcon = true,
}) => {
  const location = useLocation();

  // If no items are explicitly passed, derive them from current route pathname
  const breadcrumbs: BreadcrumbItem[] =
    items ||
    (() => {
      const paths = location.pathname.split('/').filter(Boolean);
      if (paths.length === 0) {
        return [{ label: 'Dashboard', href: '/' }];
      }

      const generated: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/' }];
      let accumulatedPath = '';

      paths.forEach((segment, index) => {
        accumulatedPath += `/${segment}`;
        const isLast = index === paths.length - 1;
        const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        generated.push({
          label,
          href: isLast ? undefined : accumulatedPath,
        });
      });

      return generated;
    })();

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center space-x-1.5 text-xs text-[#56687A] select-none', className)}
    >
      {breadcrumbs.map((crumb, index) => {
        const isLast = index === breadcrumbs.length - 1;
        const isFirst = index === 0;

        return (
          <div key={`${crumb.label}-${index}`} className="flex items-center space-x-1.5">
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#788896] flex-shrink-0" />}
            {crumb.href && !isLast ? (
              <Link
                to={crumb.href}
                className="hover:text-[#0A66C2] transition-colors duration-150 flex items-center gap-1"
              >
                {isFirst && showHomeIcon && <Home className="w-3.5 h-3.5 text-[#788896]" />}
                <span>{crumb.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  'font-medium truncate max-w-[200px]',
                  isLast ? 'text-[#1D2226] font-semibold' : 'text-[#56687A]'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {crumb.label}
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
