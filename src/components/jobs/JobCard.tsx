import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { JobItem } from '../../types';
import {
  Building2,
  MapPin,
  Clock,
  Sparkles,
  Check,
  AlertTriangle,
  Send,
  Eye,
  GitPullRequest,
  CheckCircle2,
} from 'lucide-react';

export interface JobCardProps {
  job: JobItem;
  isApplied: boolean;
  onView: (job: JobItem) => void;
  onApply: (job: JobItem) => void;
  onAnalyzeMatch: (job: JobItem) => void;
}

export const JobCard: React.FC<JobCardProps> = ({
  job,
  isApplied,
  onView,
  onApply,
  onAnalyzeMatch,
}) => {
  const matchColor =
    job.matchScore >= 92
      ? 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]'
      : job.matchScore >= 85
      ? 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]'
      : 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]';

  return (
    <Card className="p-4 flex flex-col justify-between hover:border-[#0A66C2]/40 hover:shadow-md transition-all duration-150 space-y-3.5 group bg-white border border-[#D9D9D9] shadow-sm">
      {/* Top Header: Company, Role, Location, Posted */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#F3F6F8] border border-[#D9D9D9] flex items-center justify-center font-bold text-xs text-[#1D2226] flex-shrink-0 group-hover:border-[#0A66C2]/40 group-hover:text-[#0A66C2] transition">
              {job.company.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3
                onClick={() => onView(job)}
                className="text-sm font-bold text-[#1D2226] hover:text-[#0A66C2] cursor-pointer transition truncate"
              >
                {job.title}
              </h3>
              <p className="text-xs font-semibold text-[#56687A] truncate">{job.company}</p>
              <p className="text-[11px] text-[#788896] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#788896] flex-shrink-0" />
                <span>{job.location}</span>
                <span className="text-[#D9D9D9]">•</span>
                <span className="text-[#56687A]">{job.workType}</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] text-[#788896] flex-shrink-0 flex items-center gap-1 font-mono">
            <Clock className="w-2.5 h-2.5 text-[#788896]" />
            {job.postedAgo}
          </span>
        </div>

        {/* Salary & Experience Pill */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="font-mono text-emerald-700 font-semibold text-[11px]">
            {job.salaryRange}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9] font-mono">
              {job.experienceLevel}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9] font-mono">
              {job.jobType}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Resume Match Percentage */}
      <div className="py-2 px-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
        <span className="text-xs text-[#1D2226] font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0A66C2]" />
          <span>Resume Match:</span>
        </span>
        <span
          className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md border ${matchColor}`}
        >
          {job.matchScore}%
        </span>
      </div>

      {/* Skills Checklist: Matched (✓) and Missing (⚠) */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono text-[#788896] uppercase tracking-wider block">
          Key Requirements
        </span>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <span
              key={skill.name}
              className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border transition ${
                skill.isMatched
                  ? 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]'
                  : 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]'
              }`}
              title={skill.isMatched ? 'Matched with candidate profile' : 'Missing competency in profile'}
            >
              <span>{skill.name}</span>
              {skill.isMatched ? (
                <Check className="w-3 h-3 text-[#137333] stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-[#8A6100]" />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons: [View Job], [Apply], [Analyze Match] */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#E8E8E8]">
        <Button
          size="xs"
          variant="secondary"
          onClick={() => onView(job)}
          className="text-[11px] px-1.5"
          icon={<Eye className="w-3 h-3" />}
        >
          View Job
        </Button>

        <Button
          size="xs"
          variant={isApplied ? 'outline' : 'primary'}
          onClick={() => onApply(job)}
          className={`text-[11px] px-1.5 ${isApplied ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : ''}`}
          icon={isApplied ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Send className="w-3 h-3" />}
        >
          {isApplied ? 'Applied' : 'Apply'}
        </Button>

        <Button
          size="xs"
          variant="outline"
          onClick={() => onAnalyzeMatch(job)}
          className="text-[11px] px-1.5 text-[#0A66C2] hover:text-[#004182]"
          icon={<GitPullRequest className="w-3 h-3 text-[#0A66C2]" />}
        >
          Analyze
        </Button>
      </div>
    </Card>
  );
};

export default JobCard;
