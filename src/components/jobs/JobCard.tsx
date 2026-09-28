import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { JobItem } from '../../types';
import { CompanyLogo } from '../companies/CompanyLogo';
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
      ? 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
      : job.matchScore >= 85
      ? 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc] dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-800'
      : 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';

  return (
    <Card className="p-4 flex flex-col justify-between hover:border-[#0A66C2]/40 hover:shadow-md transition-all duration-150 space-y-3.5 group bg-white dark:bg-[#1E293B] border border-[#D9D9D9] dark:border-[#334155] shadow-sm">
      {/* Top Header: Company, Role, Location, Posted */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <CompanyLogo name={job.company} size="md" />
            <div className="min-w-0">
              <h3
                onClick={() => onView(job)}
                className="text-sm font-bold text-[#1D2226] dark:text-[#F8FAFC] hover:text-[#0A66C2] dark:hover:text-[#38BDF8] cursor-pointer transition truncate"
              >
                {job.title}
              </h3>
              <p className="text-xs font-semibold text-[#56687A] dark:text-[#94A3B8] truncate">{job.company}</p>
              <p className="text-[11px] text-[#788896] dark:text-[#94A3B8] flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#788896] dark:text-[#64748B] flex-shrink-0" />
                <span>{job.location}</span>
                <span className="text-[#D9D9D9] dark:text-[#334155]">•</span>
                <span className="text-[#56687A] dark:text-[#94A3B8]">{job.workType}</span>
              </p>
            </div>
          </div>

          <span className="text-[10px] text-[#788896] dark:text-[#94A3B8] flex-shrink-0 flex items-center gap-1 font-mono">
            <Clock className="w-2.5 h-2.5 text-[#788896] dark:text-[#64748B]" />
            {job.postedAgo}
          </span>
        </div>

        {/* Salary & Experience Pill */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
            {job.salaryRange}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F6F8] dark:bg-[#0B1120] text-[#56687A] dark:text-[#94A3B8] border border-[#D9D9D9] dark:border-[#334155] font-mono">
              {job.experienceLevel}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F3F6F8] dark:bg-[#0B1120] text-[#56687A] dark:text-[#94A3B8] border border-[#D9D9D9] dark:border-[#334155] font-mono">
              {job.jobType}
            </span>
          </div>
        </div>
      </div>

      {/* Middle: Resume Match Percentage */}
      <div className="py-2 px-3 rounded-xl bg-[#F3F6F8] dark:bg-[#0B1120] border border-[#E8E8E8] dark:border-[#1E293B] flex items-center justify-between">
        <span className="text-xs text-[#1D2226] dark:text-[#F8FAFC] font-medium flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#0A66C2] dark:text-[#38BDF8]" />
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
        <span className="text-[10px] font-mono text-[#788896] dark:text-[#94A3B8] uppercase tracking-wider block">
          Key Requirements
        </span>
        <div className="flex flex-wrap gap-1.5">
          {job.skills.map((skill) => (
            <span
              key={skill.name}
              className={`inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border transition ${
                skill.isMatched
                  ? 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2] dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899] dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800'
              }`}
              title={skill.isMatched ? 'Matched with candidate profile' : 'Missing competency in profile'}
            >
              <span>{skill.name}</span>
              {skill.isMatched ? (
                <Check className="w-3 h-3 text-[#137333] dark:text-emerald-400 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-3 h-3 text-[#8A6100] dark:text-amber-400" />
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Action Buttons: [View Job], [Apply], [Analyze Match] */}
      <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-[#E8E8E8] dark:border-[#1E293B]">
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
          className={`text-[11px] px-1.5 ${
            isApplied
              ? 'text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50'
              : ''
          }`}
          icon={isApplied ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Send className="w-3 h-3" />}
        >
          {isApplied ? 'Applied' : 'Apply'}
        </Button>

        <Button
          size="xs"
          variant="outline"
          onClick={() => onAnalyzeMatch(job)}
          className="text-[11px] px-1.5 text-[#0A66C2] dark:text-[#38BDF8] hover:text-[#004182]"
          icon={<GitPullRequest className="w-3 h-3 text-[#0A66C2] dark:text-[#38BDF8]" />}
        >
          Analyze
        </Button>
      </div>
    </Card>
  );
};

export default JobCard;
