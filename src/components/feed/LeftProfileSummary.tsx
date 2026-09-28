import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Link } from 'react-router-dom';
import { PostType } from '../../types';
import {
  Flame,
  Target,
  Trophy,
  Bookmark,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Layers,
  Code2,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';

export interface LeftProfileSummaryProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  savedCount: number;
}

export const LeftProfileSummary: React.FC<LeftProfileSummaryProps> = ({
  selectedType,
  onSelectType,
  savedCount,
}) => {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CX';

  const feedFilterTypes: Array<{ label: string; value: string }> = [
    { label: 'All Discussions', value: 'All' },
    { label: 'Technical Discussions', value: 'Technical Discussion' },
    { label: 'Achievements', value: 'Achievement' },
    { label: 'Engineering Projects', value: 'Project' },
    { label: 'Certifications', value: 'Certification' },
    { label: 'Career Advice', value: 'Career Advice' },
    { label: 'Learning Updates', value: 'Learning Update' },
    { label: 'Job Announcements', value: 'Job Announcement' },
  ];

  return (
    <div className="space-y-4">
      {/* Mini Profile Card */}
      <Card className="p-4 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-3.5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#0A66C2] border border-[#004182] flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm font-bold text-[#1D2226] dark:text-slate-100 truncate">{user?.name || 'Engineer'}</h3>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            </div>
            <p className="text-[11px] text-[#56687A] dark:text-slate-400 truncate font-medium">
              {user?.headline || (user?.role === 'recruiter' ? 'Technical Recruiter' : 'Software Engineer')}
            </p>
            {user?.location && (
              <p className="text-[10px] text-[#788896] dark:text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                <MapPin className="w-2.5 h-2.5" />
                {user.location}
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E8E8E8] dark:border-slate-700 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-[#F3F6F8] dark:bg-slate-800 border border-[#E8E8E8] dark:border-slate-700">
            <span className="text-[9px] uppercase text-[#788896] dark:text-slate-500 block">Streak</span>
            <span className="font-bold text-[#8A6100] dark:text-amber-400 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" /> 14 Days
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#F3F6F8] dark:bg-slate-800 border border-[#E8E8E8] dark:border-slate-700">
            <span className="text-[9px] uppercase text-[#788896] dark:text-slate-500 block">ATS Score</span>
            <span className="font-bold text-[#137333] dark:text-emerald-400">
              {user?.atsScore != null && user.atsScore > 0 ? `${user.atsScore}% Ready` : '0%'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#F3F6F8] dark:bg-slate-800 border border-[#E8E8E8] dark:border-slate-700 col-span-2 flex items-center justify-between">
            <span className="text-[#56687A] dark:text-slate-400">DSA Solved:</span>
            <span className="font-bold text-[#1D2226] dark:text-slate-100">142 / 150</span>
          </div>
        </div>

        <Link to="/profile" className="block pt-1">
          <button className="w-full py-1.5 rounded-lg bg-[#F3F6F8] dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 border border-[#D9D9D9] dark:border-slate-600 text-xs font-semibold text-[#1D2226] dark:text-slate-100 hover:text-[#0A66C2] dark:hover:text-blue-400 transition flex items-center justify-center gap-1 shadow-sm">
            <span>View Full Profile</span>
            <ExternalLink className="w-3 h-3 text-[#788896] dark:text-slate-400" />
          </button>
        </Link>
      </Card>

      {/* Feed Filters & Bookmarks Menu */}
      <Card className="p-3 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 space-y-1 text-xs">
        <span className="text-[10px] uppercase font-mono font-bold text-[#788896] dark:text-slate-400 px-2 py-1 block">
          Filter Feed by Topic
        </span>

        <div className="space-y-0.5">
          {feedFilterTypes.map((item) => (
            <button
              key={item.value}
              onClick={() => onSelectType(item.value)}
              className={cn(
                'w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition text-xs flex items-center justify-between',
                selectedType === item.value
                  ? 'bg-[#E8F3FF] dark:bg-blue-900/40 text-[#0A66C2] dark:text-blue-300 font-semibold'
                  : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
              )}
            >
              <span className="truncate">{item.label}</span>
            </button>
          ))}

          <button
            onClick={() => onSelectType('Saved')}
            className={cn(
              'w-full text-left px-2.5 py-1.5 rounded-lg font-medium transition text-xs flex items-center justify-between pt-1.5 border-t border-[#E8E8E8] dark:border-slate-700 mt-1',
              selectedType === 'Saved'
                ? 'bg-[#E8F3FF] dark:bg-blue-900/40 text-[#0A66C2] dark:text-blue-300 font-semibold'
                : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
            )}
          >
            <span className="flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Saved Posts</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 rounded bg-[#F3F6F8] dark:bg-slate-800 border border-[#D9D9D9] dark:border-slate-600 text-[#56687A] dark:text-slate-400">
              {savedCount}
            </span>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default LeftProfileSummary;
