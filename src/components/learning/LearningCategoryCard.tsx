import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  Code2,
  Terminal,
  Server,
  Layout,
  Database,
  Layers,
  FileCheck,
  Headphones,
  Award,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CategoryInfo {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  modulesCount: number;
  avgCompletion: number;
  accentColor: string;
  badgeColor: string;
}

export const LEARNING_CATEGORIES: CategoryInfo[] = [
  {
    id: 'Recommended',
    name: 'Recommended',
    icon: Sparkles,
    modulesCount: 4,
    avgCompletion: 25,
    accentColor: 'border-[#0A66C2]/40 text-[#0A66C2]',
    badgeColor: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
  },
  {
    id: 'Programming Languages',
    name: 'Programming Languages',
    icon: Code2,
    modulesCount: 5,
    avgCompletion: 65,
    accentColor: 'border-[#0A66C2]/40 text-[#0A66C2]',
    badgeColor: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
  },
  {
    id: 'DSA',
    name: 'DSA',
    icon: Terminal,
    modulesCount: 8,
    avgCompletion: 78,
    accentColor: 'border-emerald-500/40 text-emerald-700',
    badgeColor: 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]',
  },
  {
    id: 'Backend Development',
    name: 'Backend Development',
    icon: Server,
    modulesCount: 7,
    avgCompletion: 42,
    accentColor: 'border-[#0A66C2]/40 text-[#0A66C2]',
    badgeColor: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
  },
  {
    id: 'Frontend Development',
    name: 'Frontend Development',
    icon: Layout,
    modulesCount: 6,
    avgCompletion: 82,
    accentColor: 'border-rose-500/40 text-[#B3261E]',
    badgeColor: 'bg-[#FCE8E6] text-[#B3261E] border-[#f8cbc7]',
  },
  {
    id: 'Database / SQL',
    name: 'Database / SQL',
    icon: Database,
    modulesCount: 5,
    avgCompletion: 55,
    accentColor: 'border-amber-500/40 text-[#8A6100]',
    badgeColor: 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]',
  },
  {
    id: 'System Design',
    name: 'System Design',
    icon: Layers,
    modulesCount: 6,
    avgCompletion: 38,
    accentColor: 'border-[#0A66C2]/40 text-[#0A66C2]',
    badgeColor: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]',
  },
  {
    id: 'Interview Preparation',
    name: 'Interview Preparation',
    icon: FileCheck,
    modulesCount: 4,
    avgCompletion: 90,
    accentColor: 'border-emerald-500/40 text-emerald-700',
    badgeColor: 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]',
  },
  {
    id: 'Mock Interview',
    name: 'Mock Interview',
    icon: Headphones,
    modulesCount: 3,
    avgCompletion: 15,
    accentColor: 'border-rose-500/40 text-[#B3261E]',
    badgeColor: 'bg-[#FCE8E6] text-[#B3261E] border-[#f8cbc7]',
  },
  {
    id: 'Assessments',
    name: 'Assessments',
    icon: Award,
    modulesCount: 4,
    avgCompletion: 48,
    accentColor: 'border-amber-500/40 text-[#8A6100]',
    badgeColor: 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]',
  },
];

export interface LearningCategoryCardProps {
  category: CategoryInfo;
  isSelected: boolean;
  onSelect: (categoryId: string) => void;
}

export const LearningCategoryCard: React.FC<LearningCategoryCardProps> = ({
  category,
  isSelected,
  onSelect,
}) => {
  const Icon = category.icon;

  return (
    <button
      onClick={() => onSelect(category.id)}
      className={cn(
        'p-3 rounded-xl border text-left transition-all duration-150 flex flex-col justify-between space-y-2 group cursor-pointer w-full select-none shadow-xs',
        isSelected
          ? 'bg-[#E8F3FF] border-[#0A66C2] shadow-sm scale-[1.02]'
          : 'bg-white border-[#D9D9D9] hover:border-[#0A66C2]/40 hover:bg-[#F3F6F8]'
      )}
    >
      <div className="flex items-center justify-between w-full">
        <div
          className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center border transition',
            category.badgeColor
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-mono text-[#788896] font-semibold">
          {category.modulesCount} courses
        </span>
      </div>

      <div className="w-full">
        <h4 className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] truncate">
          {category.name}
        </h4>
        <div className="flex items-center justify-between text-[10px] text-[#788896] mt-1">
          <span>Progress</span>
          <span className="font-mono text-[#0A66C2] font-semibold">{category.avgCompletion}%</span>
        </div>
        <div className="w-full h-1 rounded-full bg-[#F3F6F8] mt-1 overflow-hidden">
          <div
            className="h-full bg-[#0A66C2] rounded-full transition-all duration-500"
            style={{ width: `${category.avgCompletion}%` }}
          />
        </div>
      </div>
    </button>
  );
};

export default LearningCategoryCard;
