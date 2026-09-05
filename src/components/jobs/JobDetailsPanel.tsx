import React from 'react';
import { Modal } from '../common/Modal';
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
  ExternalLink,
  Users,
  Briefcase,
  CheckCircle2,
  DollarSign,
  Gift,
  GitPullRequest,
} from 'lucide-react';

export interface JobDetailsPanelProps {
  job: JobItem | null;
  isOpen: boolean;
  isApplied: boolean;
  onClose: () => void;
  onApply: (job: JobItem) => void;
  onAnalyzeMatch: (job: JobItem) => void;
}

export const JobDetailsPanel: React.FC<JobDetailsPanelProps> = ({
  job,
  isOpen,
  isApplied,
  onClose,
  onApply,
  onAnalyzeMatch,
}) => {
  if (!job) return null;

  const matchedCount = job.skills.filter((s) => s.isMatched).length;
  const missingCount = job.skills.length - matchedCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={job.title}
      subtitle={`${job.company} • ${job.location} • ${job.workType}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Header Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#D9D9D9] flex items-center justify-center font-bold text-sm text-[#1D2226]">
              {job.company.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1D2226]">{job.company}</h4>
              <p className="text-xs text-emerald-700 font-mono font-semibold">{job.salaryRange}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#E6F4EA] text-[#137333] border border-[#c6ecd2] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {job.matchScore}% Match
            </span>
            {job.jobUrl && (
              <a
                href={job.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-[#788896] hover:text-[#0A66C2] hover:bg-white transition"
                title="View original posting"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] text-[#788896] uppercase font-mono">Job Type</span>
            <p className="font-semibold text-[#1D2226]">{job.jobType}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] text-[#788896] uppercase font-mono">Workplace</span>
            <p className="font-semibold text-[#1D2226]">{job.workType}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] text-[#788896] uppercase font-mono">Experience</span>
            <p className="font-semibold text-[#1D2226]">{job.experienceLevel}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] text-[#788896] uppercase font-mono">Applicants</span>
            <p className="font-semibold text-[#1D2226]">{job.applicantsCount || 85} applied</p>
          </div>
        </div>

        {/* Resume Match Breakdown Box */}
        <div className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#0A66C2]" />
              Profile Skills Match Breakdown
            </span>
            <span className="text-xs text-[#788896] font-mono">
              {matchedCount} Matched • {missingCount} Missing
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {job.skills.map((skill) => (
              <span
                key={skill.name}
                className={`inline-flex items-center gap-1 text-xs font-mono px-2.5 py-1 rounded-lg border ${
                  skill.isMatched
                    ? 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]'
                    : 'bg-[#FFF4CC] text-[#8A6100] border-[#ffe899]'
                }`}
              >
                <span>{skill.name}</span>
                {skill.isMatched ? (
                  <Check className="w-3.5 h-3.5 text-[#137333] stroke-[2.5]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#8A6100]" />
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Role Description */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
            About the Role
          </h4>
          <p className="text-xs text-[#38434F] leading-relaxed">{job.description}</p>
        </div>

        {/* Responsibilities */}
        {job.responsibilities.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
              Core Responsibilities
            </h4>
            <ul className="space-y-1.5 text-xs text-[#38434F] list-disc list-inside">
              {job.responsibilities.map((r, i) => (
                <li key={i} className="leading-relaxed">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Qualifications */}
        {job.qualifications.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider">
              Required Qualifications
            </h4>
            <ul className="space-y-1.5 text-xs text-[#38434F] list-disc list-inside">
              {job.qualifications.map((q, i) => (
                <li key={i} className="leading-relaxed">
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Benefits */}
        {job.benefits && job.benefits.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-[#1D2226] uppercase font-mono tracking-wider flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-[#0A66C2]" />
              Perks & Benefits
            </h4>
            <div className="flex flex-wrap gap-2">
              {job.benefits.map((b, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-lg bg-[#F3F6F8] border border-[#D9D9D9] text-xs text-[#38434F]"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Sticky Actions Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E8E8E8]">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAnalyzeMatch(job)}
            icon={<GitPullRequest className="w-3.5 h-3.5 text-[#0A66C2]" />}
          >
            Analyze Match in Depth
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              variant={isApplied ? 'outline' : 'primary'}
              onClick={() => onApply(job)}
              icon={
                isApplied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Send className="w-4 h-4" />
                )
              }
            >
              {isApplied ? 'Application Prepared ✓' : 'Apply & Track in Pipeline'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default JobDetailsPanel;
