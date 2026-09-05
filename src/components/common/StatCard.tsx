import React from 'react';
import { Card } from './Card';
import { cn } from '../../utils/cn';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  variant?: 'brand' | 'success' | 'warning' | 'neutral';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtitle,
  icon,
  trend,
  variant = 'brand',
  className,
}) => {
  const iconColors = {
    brand: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
    success: 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]',
    warning: 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]',
    neutral: 'bg-[#F3F6F8] text-[#56687A] border-[#D9D9D9]',
  };

  return (
    <Card className={cn('p-4 flex items-center justify-between', className)}>
      <div className="space-y-1">
        <p className="text-xs font-medium text-[#56687A]">{label}</p>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-[#1D2226] tracking-tight">{value}</p>
          {trend && (
            <span className="text-[11px] font-medium text-[#12B886]">
              {trend}
            </span>
          )}
        </div>
        {subtitle && <p className="text-[11px] text-[#788896]">{subtitle}</p>}
      </div>

      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border', iconColors[variant])}>
        {icon}
      </div>
    </Card>
  );
};
