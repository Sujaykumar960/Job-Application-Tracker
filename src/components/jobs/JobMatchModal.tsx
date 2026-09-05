import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { JobItem } from '../../types';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  FileCheck,
  Send,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface JobMatchModalProps {
  job: JobItem | null;
  isOpen: boolean;
  onClose: () => void;
  onApply: (job: JobItem) => void;
}

export const JobMatchModal: React.FC<JobMatchModalProps> = ({
  job,
  isOpen,
  onClose,
  onApply,
}) => {
  if (!job) return null;

  const matched = job.skills.filter((s) => s.isMatched);
  const missing = job.skills.filter((s) => !s.isMatched);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Resume & Job Match Analysis"
      subtitle={`Detailed competency alignment for ${job.title} @ ${job.company}`}
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Compatibility Dial Banner */}
        <div className="p-4 rounded-xl bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-[#0A66C2]">Overall Match Probability</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#1D2226] font-mono">{job.matchScore}%</span>
              <span className="text-xs font-semibold text-emerald-700">Strong Alignment</span>
            </div>
            <p className="text-[11px] text-[#56687A]">
              Your profile satisfies {matched.length} of {job.skills.length} core technical requirements.
            </p>
          </div>

          <div className="w-16 h-16 rounded-2xl bg-white border border-[#d0e6fc] flex items-center justify-center font-extrabold text-[#0A66C2] text-lg shadow-sm">
            {job.matchScore}%
          </div>
        </div>

        {/* Two-Column Comparison: Matched vs Missing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Matched */}
          <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Matched Competencies ({matched.length})</span>
            </div>
            <div className="space-y-1.5">
              {matched.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9D9D9] text-xs shadow-xs"
                >
                  <span className="text-[#1D2226] font-semibold">{m.name}</span>
                  <Badge variant="success" size="sm">
                    Verified ✓
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Missing */}
          <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#8A6100]">
              <AlertTriangle className="w-4 h-4" />
              <span>Missing Competencies ({missing.length})</span>
            </div>
            <div className="space-y-1.5">
              {missing.length === 0 ? (
                <p className="text-xs text-[#788896] italic">No missing competencies detected!</p>
              ) : (
                missing.map((m) => (
                  <div
                    key={m.name}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-[#D9D9D9] text-xs shadow-xs"
                  >
                    <span className="text-[#1D2226]">{m.name}</span>
                    <Link
                      to="/learning"
                      onClick={onClose}
                      className="text-[10px] text-[#0A66C2] hover:text-[#004182] font-medium flex items-center gap-0.5"
                    >
                      Learn in Hub <ArrowRight className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* AI Recommendations Box */}
        <div className="p-3.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8] space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1D2226]">
            <Sparkles className="w-4 h-4 text-[#0A66C2]" />
            <span>AI Resume Tailoring Advice</span>
          </div>
          <p className="text-xs text-[#38434F] leading-relaxed">
            Highlight your experience with <span className="text-[#0A66C2] font-semibold">{matched.map((m) => m.name).join(', ')}</span> in your project summaries. If applying today, mention familiarity with <span className="text-[#8A6100] font-semibold">{missing.map((m) => m.name).join(', ')}</span> in your cover letter.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#E8E8E8]">
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              onApply(job);
              onClose();
            }}
            icon={<Send className="w-3.5 h-3.5" />}
          >
            Apply & Track Opportunity
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default JobMatchModal;
