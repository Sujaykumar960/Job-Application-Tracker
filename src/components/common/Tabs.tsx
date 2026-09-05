import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'pill' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className,
  variant = 'pill',
}) => {
  if (variant === 'underline') {
    return (
      <div className={cn('flex items-center gap-6 border-b border-[#E8E8E8]', className)}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={cn(
                'pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition -mb-px',
                isActive
                  ? 'border-[#0A66C2] text-[#0A66C2]'
                  : 'border-transparent text-[#56687A] hover:text-[#1D2226]'
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-mono font-medium',
                    isActive ? 'bg-[#E8F3FF] text-[#0A66C2]' : 'bg-[#F3F6F8] text-[#56687A]'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('inline-flex p-1 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9]', className)}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition duration-150',
              isActive
                ? 'bg-[#0A66C2] text-white shadow-sm'
                : 'text-[#56687A] hover:text-[#1D2226] hover:bg-white/60'
            )}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-white text-[#56687A] border border-[#D9D9D9]'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
