import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Clock,
  BookOpen,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Play,
  Award,
  Layers,
  BarChart2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface LearningModule {
  id: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  lessonsCount: number;
  progress: number; // 0 - 100
  isRecommended?: boolean;
  recommendationReason?: string;
  description: string;
  skillsCovered: string[];
}

export interface LearningModuleCardProps {
  module: LearningModule;
  onOpen: (module: LearningModule) => void;
}

export const LearningModuleCard: React.FC<LearningModuleCardProps> = ({ module, onOpen }) => {
  const difficultyColors = {
    Beginner: 'text-[#137333] bg-[#E6F4EA] border-[#c6ecd2]',
    Intermediate: 'text-[#8A6100] bg-[#FFF4CC] border-[#ffe899]',
    Advanced: 'text-[#B3261E] bg-[#FCE8E6] border-[#f8cbc7]',
  };

  const isCompleted = module.progress === 100;
  const isInProgress = module.progress > 0 && module.progress < 100;

  return (
    <Card className="p-4 flex flex-col justify-between hover:border-[#0A66C2]/40 hover:shadow-md transition-all duration-150 space-y-3 bg-white border border-[#D9D9D9] group shadow-xs">
      <div className="space-y-2.5">
        {/* Personalization Reason Pill (if recommended) */}
        {module.isRecommended && module.recommendationReason && (
          <div className="p-1.5 px-2 rounded-lg bg-[#E8F3FF] border border-[#d0e6fc] flex items-center gap-1.5 text-[10px] text-[#0A66C2] font-semibold font-mono">
            <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="truncate">{module.recommendationReason}</span>
          </div>
        )}

        {/* Category & Difficulty Row */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-mono text-[#788896] font-semibold uppercase truncate">
            {module.category}
          </span>
          <span
            className={cn(
              'text-[10px] font-mono font-semibold px-2 py-0.5 rounded border flex-shrink-0',
              difficultyColors[module.difficulty]
            )}
          >
            {module.difficulty}
          </span>
        </div>

        {/* Title & Description */}
        <div>
          <h3
            onClick={() => onOpen(module)}
            className="text-xs font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition cursor-pointer leading-snug line-clamp-2"
          >
            {module.title}
          </h3>
          <p className="text-[11px] text-[#56687A] mt-1 line-clamp-2 leading-relaxed">
            {module.description}
          </p>
        </div>

        {/* Skills Covered Tags */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {module.skillsCovered.map((skill) => (
            <span
              key={skill}
              className="px-1.5 py-0.2 rounded bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9] text-[10px] font-mono"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Footer: Progress & Action */}
      <div className="space-y-2.5 pt-2 border-t border-[#E8E8E8]">
        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono">
            <span className="text-[#788896] flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {module.duration} • {module.lessonsCount} lessons
            </span>
            <span
              className={cn(
                'font-bold',
                isCompleted
                  ? 'text-emerald-700'
                  : isInProgress
                  ? 'text-[#0A66C2]'
                  : 'text-[#788896]'
              )}
            >
              {module.progress}%
            </span>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[#F3F6F8] overflow-hidden border border-[#E8E8E8]">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isCompleted ? 'bg-emerald-600' : 'bg-[#0A66C2]'
              )}
              style={{ width: `${module.progress}%` }}
            />
          </div>
        </div>

        {/* Launch Button */}
        <Button
          size="xs"
          variant={isCompleted ? 'outline' : 'primary'}
          onClick={() => onOpen(module)}
          className="w-full text-xs"
          icon={
            isCompleted ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : isInProgress ? (
              <Play className="w-3 h-3" />
            ) : (
              <BookOpen className="w-3 h-3" />
            )
          }
        >
          {isCompleted
            ? 'Review Lesson'
            : isInProgress
            ? 'Continue Learning'
            : module.category === 'Mock Interview'
            ? 'Launch Mock Round'
            : module.category === 'Assessments'
            ? 'Take Assessment'
            : 'Start Module'}
        </Button>
      </div>
    </Card>
  );
};

export default LearningModuleCard;
