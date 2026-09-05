import React from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../components/../common/Button';
import { DeadlineBadge } from './DeadlineBadge';
import { Application, ApplicationStatus } from '../../types';
import {
  Building2,
  MapPin,
  Globe,
  Calendar,
  Clock,
  User,
  Paperclip,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Trash2,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export interface ApplicationDetailModalProps {
  application: Application | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  if (!application) return null;

  const statusVariants: Record<ApplicationStatus, 'brand' | 'success' | 'warning' | 'danger'> = {
    Applied: 'warning',
    Interview: 'brand',
    Offer: 'success',
    Rejected: 'danger',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="xl">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 border border-brand-500/30 text-brand-300 font-bold text-sm flex items-center justify-center flex-shrink-0">
              {application.company.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white">{application.company}</h2>
                <Badge variant={statusVariants[application.status]} size="sm">
                  {application.status}
                </Badge>
                <Badge variant="neutral" size="sm">
                  {application.priority} Priority
                </Badge>
              </div>
              <p className="text-xs text-brand-300 mt-0.5">{application.role}</p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-500" />
                {application.location}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              icon={<Edit2 className="w-3 h-3" />}
              onClick={() => {
                onClose();
                onEdit(application);
              }}
            >
              Edit
            </Button>
            <Button
              size="xs"
              variant="danger"
              icon={<Trash2 className="w-3 h-3" />}
              onClick={() => {
                onDelete(application.id);
                onClose();
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Quick Transition Status Bar */}
        <div className="p-3 rounded-xl bg-surface-950/70 border border-surface-800 flex items-center justify-between flex-wrap gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick Status Shift:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['Applied', 'Interview', 'Offer', 'Rejected'] as ApplicationStatus[]).map((st) => (
              <button
                key={st}
                onClick={() => onStatusChange(application.id, st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                  application.status === st
                    ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                    : 'bg-surface-900 border-surface-800 text-slate-400 hover:text-slate-200 hover:border-surface-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Applied Date</span>
            <p className="font-semibold text-slate-200">{formatDate(application.appliedDate)}</p>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Deadline Status</span>
            <div>
              <DeadlineBadge deadline={application.deadline} />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-800 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-mono">Profile Match</span>
            <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
              <Sparkles className="w-3 h-3" />
              <span>{application.matchScore}% Match</span>
            </div>
          </div>

          {application.interviewDate && (
            <div className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-800 space-y-0.5 col-span-2 sm:col-span-3">
              <span className="text-[10px] text-brand-400 uppercase font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Next Interview Round
              </span>
              <p className="font-semibold text-slate-100">{application.interviewDate}</p>
            </div>
          )}

          {application.recruiter && (
            <div className="p-2.5 rounded-xl bg-surface-950/50 border border-surface-800 space-y-0.5 col-span-2 sm:col-span-3">
              <span className="text-[10px] text-slate-500 uppercase font-mono flex items-center gap-1">
                <User className="w-3 h-3" /> Recruiter Contact
              </span>
              <p className="text-slate-300 font-medium">{application.recruiter}</p>
            </div>
          )}
        </div>

        {/* Resume & Job URL */}
        <div className="space-y-2 text-xs">
          {application.jobUrl && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-950/40 border border-surface-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                Original Listing
              </span>
              <a
                href={application.jobUrl}
                target="_blank"
                rel="noreferrer"
                className="text-brand-400 hover:text-brand-300 flex items-center gap-1 font-mono text-[11px]"
              >
                View Job Post <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {application.resume && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface-950/40 border border-surface-800/80">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                Attached Resume
              </span>
              <span className="text-slate-200 font-mono text-[11px]">{application.resume}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {application.notes && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-300">Preparation & Debrief Notes</span>
            <div className="p-3 rounded-xl bg-surface-950 border border-surface-800 text-xs text-slate-300 leading-relaxed font-mono">
              {application.notes}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-surface-800">
          <Button size="sm" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ApplicationDetailModal;
