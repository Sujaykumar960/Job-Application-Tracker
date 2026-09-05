import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { RecruiterCandidate } from '../../data/mockRecruiterData';
import {
  ShieldCheck,
  MapPin,
  Flame,
  Target,
  Code2,
  Trophy,
  Sparkles,
  TrendingUp,
  DollarSign,
  Mail,
  Lock,
  Star,
  MessageSquare,
  Calendar,
  ExternalLink,
  Download,
  FileText,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CandidateDossierModalProps {
  candidate: RecruiterCandidate | null;
  isOpen: boolean;
  onClose: () => void;
  onShortlistToggle: (candidateId: string) => void;
  onMessage: (candidate: RecruiterCandidate) => void;
}

export const CandidateDossierModal: React.FC<CandidateDossierModalProps> = ({
  candidate,
  isOpen,
  onClose,
  onShortlistToggle,
  onMessage,
}) => {
  if (!candidate) return null;

  const navigate = useNavigate();
  const { privacy } = candidate;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="4xl">
      <div className="space-y-5 -mt-4 text-xs text-[#38434F]">
        {/* ==================== 1. HERO HEADER ==================== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E8]">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-xl shadow border border-surface-700/60 flex-shrink-0',
                candidate.avatarGradient
              )}
            >
              {candidate.avatarInitials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-[#1D2226]">{candidate.name}</h2>
                <Badge variant="brand" size="sm" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  Verified Engineer
                </Badge>
                <Badge variant="success" size="sm">
                  ATS Score: {candidate.atsScore}%
                </Badge>
              </div>

              <p className="text-xs text-[#56687A] font-semibold">{candidate.role}</p>

              <div className="flex items-center gap-3 text-[11px] font-mono text-[#788896] pt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#788896]" />
                  {candidate.location}
                </span>
                <span>•</span>
                <span>Experience: {candidate.yearsExperience}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <Button
              size="xs"
              variant={candidate.isShortlisted ? 'outline' : 'secondary'}
              onClick={() => onShortlistToggle(candidate.id)}
              className={cn(
                'text-xs px-3',
                candidate.isShortlisted ? 'border-amber-500/40 text-amber-700 bg-amber-50' : ''
              )}
              icon={<Star className="w-3.5 h-3.5" />}
            >
              {candidate.isShortlisted ? 'Shortlisted' : 'Shortlist'}
            </Button>

            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                onClose();
                navigate('/profile');
              }}
              icon={<ExternalLink className="w-3.5 h-3.5 text-[#0A66C2]" />}
            >
              Full Profile
            </Button>

            <Button
              size="xs"
              variant="primary"
              onClick={() => {
                onClose();
                onMessage(candidate);
              }}
              icon={<MessageSquare className="w-3.5 h-3.5" />}
            >
              Message Candidate
            </Button>
          </div>
        </div>

        {/* ==================== 2. VERIFIED SCORECARD GRID ==================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
          <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] uppercase text-[#788896]">Assessment Score</span>
            <p className="text-base font-bold text-[#8A6100]">
              {candidate.assessmentScore}% ({candidate.assessmentPercentile})
            </p>
            <span className="text-[10px] text-[#56687A]">Senior Backend Verified</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] uppercase text-[#788896]">Questions Solved</span>
            <p className="text-base font-bold text-[#1D2226]">
              {candidate.questionsSolved} / {candidate.totalQuestions}
            </p>
            <span className="text-[10px] text-emerald-600">{candidate.accuracy}% 1st-Submit Acc</span>
          </div>

          <div className="p-3 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-0.5">
            <span className="text-[10px] uppercase text-[#788896]">Practice Consistency</span>
            <p className="text-base font-bold text-[#8A6100] flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500" />
              {candidate.streak} Days
            </p>
            <span className="text-[10px] text-[#56687A]">Active Coding Streak</span>
          </div>

          <div className="p-3 rounded-xl bg-[#E8F3FF] border border-[#0A66C2]/40 space-y-0.5">
            <span className="text-[10px] uppercase text-[#0A66C2]">Job Compatibility</span>
            <p className="text-base font-bold text-[#1D2226] flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {candidate.jobMatch}% Match
            </p>
            <span className="text-[10px] text-[#0A66C2] font-semibold">{candidate.targetRole}</span>
          </div>
        </div>

        {/* ==================== 3. PRODUCTION PORTFOLIO ==================== */}
        <div className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2.5">
          <h4 className="font-bold text-[#1D2226] uppercase font-mono text-[11px] tracking-wider flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-sky-600" />
            Verified Production Repositories ({candidate.projectsCount})
          </h4>
          <div className="space-y-2">
            {candidate.featuredProjects.map((pName) => (
              <div
                key={pName}
                className="p-2.5 rounded-lg bg-white border border-[#D9D9D9] flex items-center justify-between shadow-xs"
              >
                <div>
                  <h5 className="font-semibold text-[#1D2226]">{pName}</h5>
                  <span className="text-[10px] font-mono text-[#56687A]">
                    Full-Stack & Distributed Architecture Proof of Concept
                  </span>
                </div>
                <a
                  href={`https://github.com/alexrivera/${pName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-[#788896] hover:text-[#0A66C2] transition"
                  title="View GitHub Repository"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== 4. PRIVACY POLICIES ENFORCED ==================== */}
        <div className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
          <h4 className="font-bold text-[#1D2226] uppercase font-mono text-[11px] tracking-wider flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#0A66C2]" />
            Candidate Privacy & Visibility Directives
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
              <span className="text-[10px] text-[#788896] uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-emerald-600" /> Target Compensation
              </span>
              {privacy.showSalary ? (
                <p className="font-bold text-[#1D2226]">{privacy.salaryExpectation}</p>
              ) : (
                <p className="text-[#788896] italic">🔒 Confidential (Disclosed upon formal offer discussion)</p>
              )}
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-[#D9D9D9] space-y-1 shadow-xs">
              <span className="text-[10px] text-[#788896] uppercase flex items-center gap-1">
                <Mail className="w-3 h-3 text-sky-600" /> Candidate Direct Contact
              </span>
              {privacy.contactVisibility === 'all_recruiters' ? (
                <p className="font-bold text-[#1D2226]">{privacy.email} {privacy.phone && `• ${privacy.phone}`}</p>
              ) : (
                <p className="text-[#788896] italic">🔒 Masked by Privacy Shield (Use platform messenger)</p>
              )}
            </div>
          </div>
        </div>

        {/* ==================== 5. ATTACHED RESUME ==================== */}
        <div className="p-4 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-mono text-xs">
            <FileText className="w-4 h-4 text-[#0A66C2]" />
            <div>
              <span className="font-bold text-[#1D2226]">Verified_Resume_{candidate.name.replace(/\s+/g, '_')}.pdf</span>
              <span className="text-[10px] text-[#788896] block">ATS Score: {candidate.atsScore}% • 2.4 MB</span>
            </div>
          </div>

          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              const element = document.createElement('a');
              const file = new Blob(
                [`CareerX Verified Dossier - ${candidate.name}\nRole: ${candidate.role}\nATS Score: ${candidate.atsScore}%\nAssessment: ${candidate.assessmentScore}%\nSkills: ${candidate.skills.join(', ')}`],
                { type: 'text/plain' }
              );
              element.href = URL.createObjectURL(file);
              element.download = `Verified_Resume_${candidate.name.replace(/\s+/g, '_')}.txt`;
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            icon={<Download className="w-3 h-3" />}
          >
            Download Resume
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CandidateDossierModal;
