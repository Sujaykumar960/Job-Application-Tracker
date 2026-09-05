import React from 'react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { DeadlineBadge } from './DeadlineBadge';
import { Application, ApplicationStatus } from '../../types';
import { formatDate } from '../../utils/formatters';
import {
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Sparkles,
  MapPin,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';

export interface ApplicationTableViewProps {
  applications: Application[];
  onView: (app: Application) => void;
  onEdit: (app: Application) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
}

export const ApplicationTableView: React.FC<ApplicationTableViewProps> = ({
  applications,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  const statusBadges: Record<ApplicationStatus, { variant: 'brand' | 'success' | 'warning' | 'danger'; label: string }> = {
    Applied: { variant: 'warning', label: 'Applied' },
    Interview: { variant: 'brand', label: 'Interview' },
    Offer: { variant: 'success', label: 'Offer' },
    Rejected: { variant: 'danger', label: 'Rejected' },
  };

  const priorityColors = {
    High: 'text-[#B3261E] bg-[#FCE8E6] border-[#f8cbc7]',
    Medium: 'text-[#8A6100] bg-[#FFF4CC] border-[#ffe899]',
    Low: 'text-[#56687A] bg-[#F3F6F8] border-[#D9D9D9]',
  };

  if (applications.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-[#D9D9D9] rounded-2xl bg-[#F3F6F8]">
        <p className="text-sm font-semibold text-[#1D2226]">No applications match your filter</p>
        <p className="text-xs text-[#788896] mt-1">Try resetting search keywords or status filters</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#D9D9D9] bg-white shadow-sm">
      <table className="w-full text-left text-xs border-collapse">
        {/* Table Head */}
        <thead className="bg-[#F3F6F8] border-b border-[#E8E8E8] text-[#56687A] uppercase font-mono text-[10px] tracking-wider select-none">
          <tr>
            <th className="py-3 px-4 font-semibold">Company</th>
            <th className="py-3 px-4 font-semibold">Role</th>
            <th className="py-3 px-3 font-semibold">Status</th>
            <th className="py-3 px-3 font-semibold">Applied Date</th>
            <th className="py-3 px-3 font-semibold">Deadline</th>
            <th className="py-3 px-3 font-semibold">Interview</th>
            <th className="py-3 px-3 font-semibold text-center">Match</th>
            <th className="py-3 px-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>

        {/* Table Body */}
        <tbody className="divide-y divide-[#E8E8E8]">
          {applications.map((app) => {
            const statusConfig = statusBadges[app.status] || { variant: 'neutral', label: app.status };

            return (
              <tr
                key={app.id}
                className="hover:bg-[#F3F6F8] transition-colors duration-150 group"
              >
                {/* 1. Company */}
                <td className="py-2.5 px-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#F3F6F8] border border-[#D9D9D9] flex items-center justify-center font-bold text-xs text-[#1D2226] flex-shrink-0 group-hover:border-[#0A66C2] transition">
                      {app.company.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[#1D2226] flex items-center gap-1.5">
                        <span className="truncate max-w-[130px]">{app.company}</span>
                        {app.jobUrl && (
                          <a
                            href={app.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#788896] hover:text-[#0A66C2] transition"
                            title="Open external job listing"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-[10px] text-[#788896] flex items-center gap-0.5 truncate max-w-[140px]">
                        <MapPin className="w-2.5 h-2.5 text-[#788896] flex-shrink-0" />
                        {app.location}
                      </p>
                    </div>
                  </div>
                </td>

                {/* 2. Role */}
                <td className="py-2.5 px-4">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#1D2226] truncate max-w-[180px]">
                      {app.role}
                    </p>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded border ${
                          priorityColors[app.priority] || priorityColors.Medium
                        }`}
                      >
                        {app.priority}
                      </span>
                      {app.salaryRange && (
                        <span className="text-[10px] text-[#12B886] font-mono">
                          {app.salaryRange}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* 3. Status (with Quick Status Dropdown) */}
                <td className="py-2.5 px-3">
                  <div className="relative inline-block">
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(app.id, e.target.value as ApplicationStatus)}
                      className={`text-[11px] font-semibold rounded-lg pl-2 pr-5 py-1 appearance-none border cursor-pointer focus:outline-none transition ${
                        app.status === 'Applied'
                          ? 'bg-[#E8F3FF] text-[#0A66C2] border-[#d0e6fc]'
                          : app.status === 'Interview'
                          ? 'bg-[#F0F2FF] text-[#555BD9] border-[#d6d9fd]'
                          : app.status === 'Offer'
                          ? 'bg-[#E6F4EA] text-[#137333] border-[#c6ecd2]'
                          : 'bg-[#FCE8E6] text-[#B3261E] border-[#f8cbc7]'
                      }`}
                    >
                      <option value="Applied" className="bg-white text-[#1D2226]">Applied</option>
                      <option value="Interview" className="bg-white text-[#1D2226]">Interview</option>
                      <option value="Offer" className="bg-white text-[#1D2226]">Offer</option>
                      <option value="Rejected" className="bg-white text-[#1D2226]">Rejected</option>
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-2.5 pointer-events-none text-current opacity-70" />
                  </div>
                </td>

                {/* 4. Applied Date */}
                <td className="py-2.5 px-3 font-mono text-[11px] text-[#56687A] whitespace-nowrap">
                  {formatDate(app.appliedDate)}
                </td>

                {/* 5. Deadline (Upcoming, Today, Overdue) */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  <DeadlineBadge deadline={app.deadline} />
                </td>

                {/* 6. Interview */}
                <td className="py-2.5 px-3 whitespace-nowrap">
                  {app.interviewDate ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#0A66C2] font-medium">
                      <Calendar className="w-3 h-3 text-[#0A66C2] flex-shrink-0" />
                      <span className="truncate max-w-[110px]">{app.interviewDate}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#788896] italic">None set</span>
                  )}
                </td>

                {/* 7. Match Score */}
                <td className="py-2.5 px-3 text-center whitespace-nowrap">
                  <span
                    className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      app.matchScore >= 90
                        ? 'bg-[#E6F4EA] text-[#137333] border border-[#c6ecd2]'
                        : 'bg-[#E8F3FF] text-[#0A66C2] border border-[#d0e6fc]'
                    }`}
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    {app.matchScore}%
                  </span>
                </td>

                {/* 8. Actions (View, Edit, Delete) */}
                <td className="py-2.5 px-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onView(app)}
                      className="p-1.5 rounded-lg text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8] transition"
                      title="View Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onEdit(app)}
                      className="p-1.5 rounded-lg text-[#56687A] hover:text-[#0A66C2] hover:bg-[#F3F6F8] transition"
                      title="Edit Application"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(app.id)}
                      className="p-1.5 rounded-lg text-[#56687A] hover:text-[#E6395A] hover:bg-[#FCE8E6] transition"
                      title="Delete Application"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ApplicationTableView;
