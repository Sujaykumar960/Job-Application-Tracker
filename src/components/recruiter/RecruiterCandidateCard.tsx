import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { RecruiterCandidate } from '../../types';
import {
  ShieldCheck,
  MapPin,
  Flame,
  Target,
  Code2,
  Trophy,
  Sparkles,
  TrendingUp,
  Star,
  MessageSquare,
  Eye,
  Lock,
  DollarSign,
  Mail,
  Building2,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface RecruiterCandidateCardProps {
  candidate: RecruiterCandidate;
  onViewProfile: (candidate: RecruiterCandidate) => void;
  onMessage: (candidate: RecruiterCandidate) => void;
  onShortlistToggle: (candidateId: string) => void;
}

export const RecruiterCandidateCard: React.FC<RecruiterCandidateCardProps> = ({
  candidate,
  onViewProfile,
  onMessage,
  onShortlistToggle,
}) => {
  const { privacy } = candidate;

  const searchStatusBadges = {
    actively_looking: { label: 'Actively Interviewing', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
    casually_browsing: { label: 'Casually Browsing', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
    not_looking: { label: 'Not Looking', color: 'text-slate-400 bg-surface-900 border-surface-800' },
  };

  const statusConfig = searchStatusBadges[privacy.searchStatus];

  return (
    <Card className="p-5 bg-white border border-[#D9D9D9] flex flex-col justify-between space-y-4 shadow-sm hover:border-[#0A66C2]/40 transition group">
      {/* Top Header: Avatar, Name, Job Match Dial & Shortlist */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar + Info */}
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm shadow border border-surface-700/60 flex-shrink-0',
                candidate.avatarGradient
              )}
            >
              {candidate.avatarInitials}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-bold text-[#1D2226] group-hover:text-[#0A66C2] transition truncate">
                  {candidate.name}
                </h3>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span
                  className={cn(
                    'px-2 py-0.2 rounded-full font-mono text-[9px] border font-semibold flex-shrink-0',
                    statusConfig.color
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>

              <p className="text-xs text-[#38434F] font-semibold leading-snug line-clamp-1 mt-0.5">
                {candidate.role}
              </p>

              <div className="flex items-center gap-3 text-[10px] font-mono text-[#788896] pt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 text-[#788896]" />
                  {candidate.location}
                </span>
                <span>•</span>
                <span>{candidate.yearsExperience}</span>
              </div>
            </div>
          </div>

          {/* Job Match Percentage & Shortlist Button */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#E8F3FF] border border-[#d0e6fc] text-[#0A66C2] font-mono text-xs font-bold shadow-xs">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{candidate.jobMatch}% Match</span>
            </div>

            <button
              onClick={() => onShortlistToggle(candidate.id)}
              className={cn(
                'p-1.5 rounded-lg border transition',
                candidate.isShortlisted
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-600'
                  : 'bg-[#F3F6F8] border-[#D9D9D9] text-[#788896] hover:text-[#1D2226] hover:bg-[#E8E8E8]'
              )}
              title={candidate.isShortlisted ? 'Remove from Shortlist' : 'Shortlist Candidate'}
            >
              <Star
                className={cn(
                  'w-4 h-4',
                  candidate.isShortlisted ? 'fill-amber-500 text-amber-500' : ''
                )}
              />
            </button>
          </div>
        </div>

        {/* ==================== METRICS GRID ==================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
          {/* Questions Solved */}
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[9px] uppercase text-[#788896] flex items-center gap-1">
              <Target className="w-2.5 h-2.5 text-[#0A66C2]" /> Questions Solved
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[#1D2226]">{candidate.questionsSolved}</span>
              <span className="text-[9px] text-emerald-600">({candidate.accuracy}%)</span>
            </div>
            <span className="text-[9px] text-amber-600 flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" /> {candidate.streak}d streak
            </span>
          </div>

          {/* Assessment Score */}
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[9px] uppercase text-[#788896] flex items-center gap-1">
              <Trophy className="w-2.5 h-2.5 text-amber-500" /> Assessment
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-[#8A6100]">{candidate.assessmentScore}%</span>
              <span className="text-[9px] text-[#788896]">({candidate.assessmentPercentile})</span>
            </div>
            <span className="text-[9px] text-[#56687A] truncate block">
              Senior Backend
            </span>
          </div>

          {/* Production Projects */}
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[9px] uppercase text-[#788896] flex items-center gap-1">
              <Code2 className="w-2.5 h-2.5 text-sky-600" /> Live Projects
            </span>
            <span className="font-bold text-[#1D2226] block">{candidate.projectsCount} Repositories</span>
            <span className="text-[9px] text-sky-600 truncate block">
              {candidate.featuredProjects[0]}
            </span>
          </div>

          {/* Career Growth Metric */}
          <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[9px] uppercase text-[#788896] flex items-center gap-1">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-600" /> Growth & ATS
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-bold text-emerald-600">ATS: {candidate.atsScore}%</span>
            </div>
            <span className="text-[9px] text-[#56687A] truncate block">
              +42% 6mo progress
            </span>
          </div>
        </div>

        {/* Skills Pills */}
        <div className="flex flex-wrap gap-1 pt-1">
          {candidate.skills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 rounded-md bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9] text-[10px] font-mono"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* ==================== CANDIDATE PRIVACY ENFORCEMENT ==================== */}
        <div className="p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between text-[10px] font-mono text-[#56687A] flex-wrap gap-2">
          {/* Compensation Privacy */}
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-3 h-3 text-emerald-600 flex-shrink-0" />
            <span>Target Comp: </span>
            {privacy.showSalary ? (
              <strong className="text-[#1D2226]">{privacy.salaryExpectation}</strong>
            ) : (
              <span className="text-[#788896] italic flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Confidential (Disclosed on mutual match)
              </span>
            )}
          </div>

          {/* Direct Contact Privacy */}
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-sky-600 flex-shrink-0" />
            {privacy.contactVisibility === 'all_recruiters' ? (
              <span className="text-[#1D2226]">{privacy.email}</span>
            ) : (
              <span className="text-[#788896] italic flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" /> Direct Contact Masked
              </span>
            )}
          </div>

          {/* Cloaking */}
          {privacy.cloakedFromCurrentEmployer && (
            <span className="text-[9px] text-[#B3261E] font-semibold flex items-center gap-1">
              🛡️ Cloaked from current employer
            </span>
          )}
        </div>
      </div>

      {/* ==================== ACTIONS BAR ==================== */}
      <div className="pt-3 border-t border-[#E8E8E8] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="outline"
            onClick={() => onViewProfile(candidate)}
            icon={<Eye className="w-3 h-3" />}
          >
            View Profile
          </Button>

          <Button
            size="xs"
            variant="ghost"
            onClick={() => onMessage(candidate)}
            className="text-[#56687A] hover:text-[#1D2226]"
            icon={<MessageSquare className="w-3 h-3" />}
          >
            Message
          </Button>
        </div>

        <Button
          size="xs"
          variant={candidate.isShortlisted ? 'outline' : 'primary'}
          onClick={() => onShortlistToggle(candidate.id)}
          className={cn(
            'text-xs',
            candidate.isShortlisted ? 'border-amber-500/40 text-amber-700 bg-amber-50' : ''
          )}
          icon={<Star className="w-3 h-3" />}
        >
          {candidate.isShortlisted ? 'Shortlisted' : 'Shortlist Candidate'}
        </Button>
      </div>
    </Card>
  );
};

export default RecruiterCandidateCard;
