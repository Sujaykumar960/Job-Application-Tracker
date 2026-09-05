import React from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { DeadlineBadge } from './DeadlineBadge';
import { Application, ApplicationStatus } from '../../types';
import {
  Sparkles,
  Calendar,
  MapPin,
  Eye,
  Edit2,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Clock,
  MoreVertical,
} from 'lucide-react';

export interface ApplicationKanbanViewProps {
  applications: Application[];
  onView: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
}

const KANBAN_STAGES: Array<{
  status: ApplicationStatus;
  label: string;
  color: string;
  headerBg: string;
}> = [
  { status: 'Applied', label: 'Applied', color: '#0A66C2', headerBg: 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]' },
  { status: 'Interview', label: 'Interview', color: '#7C83FD', headerBg: 'bg-[#F0F2FF] text-[#555BD9] border-[#d6d9fd]' },
  { status: 'Offer', label: 'Offer', color: '#12B886', headerBg: 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]' },
  { status: 'Rejected', label: 'Rejected', color: '#E6395A', headerBg: 'bg-[#FCE8E6] text-[#B3261E] border-[#f8cbc7]' },
];

export const ApplicationKanbanView: React.FC<ApplicationKanbanViewProps> = ({
  applications,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const getNextStage = (current: ApplicationStatus): ApplicationStatus | null => {
    switch (current) {
      case 'Applied':
        return 'Interview';
      case 'Interview':
        return 'Offer';
      default:
        return null;
    }
  };

  const getPrevStage = (current: ApplicationStatus): ApplicationStatus | null => {
    switch (current) {
      case 'Offer':
        return 'Interview';
      case 'Interview':
        return 'Applied';
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5 items-start">
      {KANBAN_STAGES.map((stage) => {
        const stageApps = applications.filter((app) => app.status === stage.status);

        return (
          <div
            key={stage.status}
            className="flex flex-col rounded-2xl bg-[#F3F6F8]/60 border border-[#D9D9D9] overflow-hidden shadow-sm"
          >
            {/* Column Header */}
            <div
              className={`px-3.5 py-2.5 border-b border-[#D9D9D9] flex items-center justify-between ${stage.headerBg}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono">
                  {stage.label}
                </h3>
              </div>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#1D2226] border border-[#D9D9D9]">
                {stageApps.length}
              </span>
            </div>

            {/* Cards Container with smooth scrolling */}
            <div className="p-2.5 space-y-2.5 min-h-[420px] max-h-[calc(100vh-280px)] overflow-y-auto">
              {stageApps.length === 0 ? (
                <div className="h-28 flex flex-col items-center justify-center text-center p-3 border border-dashed border-[#D9D9D9] rounded-xl">
                  <span className="text-xs text-[#788896] italic">No applications</span>
                </div>
              ) : (
                stageApps.map((app) => {
                  const nextStage = getNextStage(app.status);
                  const prevStage = getPrevStage(app.status);

                  return (
                    <div
                      key={app.id}
                      className="p-3 rounded-xl bg-white border border-[#D9D9D9] hover:border-[#0A66C2] hover:shadow-md transition-all duration-150 space-y-2.5 group"
                    >
                      {/* Top row: Company, Priority, Actions */}
                      <div className="flex items-start justify-between gap-1">
                        <div className="min-w-0">
                          <h4
                            onClick={() => onView(app)}
                            className="text-xs font-bold text-white hover:text-brand-300 transition cursor-pointer truncate"
                          >
                            {app.company}
                          </h4>
                          <p className="text-[11px] text-slate-300 truncate">{app.role}</p>
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition flex-shrink-0">
                          <button
                            onClick={() => onView(app)}
                            className="p-1 rounded text-slate-400 hover:text-white"
                            title="View"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onEdit(app)}
                            className="p-1 rounded text-slate-400 hover:text-brand-300"
                            title="Edit"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDelete(app.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Location & Match Score */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 truncate max-w-[120px]">
                          <MapPin className="w-2.5 h-2.5 text-slate-500" />
                          {app.location}
                        </span>
                        <span className="flex items-center gap-0.5 text-emerald-400 font-mono font-bold">
                          <Sparkles className="w-2.5 h-2.5" />
                          {app.matchScore}%
                        </span>
                      </div>

                      {/* Deadline & Interview Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <DeadlineBadge deadline={app.deadline} />

                        {app.interviewDate && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20 truncate">
                            <Calendar className="w-2.5 h-2.5" />
                            {app.interviewDate.split(' ')[0]}
                          </span>
                        )}
                      </div>

                      {/* Card Footer: Quick Stage Shifter Buttons */}
                      <div className="pt-2 border-t border-surface-800/80 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          {prevStage && (
                            <button
                              onClick={() => onStatusChange(app.id, prevStage)}
                              className="px-1.5 py-0.5 rounded bg-surface-950 hover:bg-surface-800 border border-surface-800 text-slate-400 hover:text-white flex items-center gap-0.5 transition"
                              title={`Move back to ${prevStage}`}
                            >
                              <ArrowLeft className="w-2.5 h-2.5" />
                              <span>{prevStage}</span>
                            </button>
                          )}
                          {app.status !== 'Rejected' && (
                            <button
                              onClick={() => onStatusChange(app.id, 'Rejected')}
                              className="px-1.5 py-0.5 rounded bg-surface-950 hover:bg-rose-500/20 border border-surface-800 text-slate-500 hover:text-rose-400 transition"
                              title="Mark as Rejected"
                            >
                              Reject
                            </button>
                          )}
                        </div>

                        {nextStage && (
                          <button
                            onClick={() => onStatusChange(app.id, nextStage)}
                            className="px-2 py-0.5 rounded bg-brand-600/90 hover:bg-brand-600 text-white font-medium flex items-center gap-1 shadow-sm transition"
                            title={`Advance to ${nextStage}`}
                          >
                            <span>{nextStage}</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApplicationKanbanView;
