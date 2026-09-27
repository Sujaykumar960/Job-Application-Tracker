import React from 'react';
import { ChatConversation } from '../../api/chatWebSocket';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  ShieldCheck,
  Building2,
  Briefcase,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { getAvatarGradientClass, getAvatarInitials } from './avatarUtils';

export interface ChatHeaderProps {
  conversation: ChatConversation;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation }) => {
  const { peer } = conversation;
  const gradientClass = getAvatarGradientClass(peer.name || peer.id);
  const initials = getAvatarInitials(peer.name, peer.avatarInitials);

  return (
    <div className="px-5 py-3.5 bg-white dark:bg-[#0F172A] border-b border-slate-200/80 dark:border-[#1E293B] flex items-center justify-between gap-3 shadow-xs">
      {/* Peer Info */}
      <div className="flex items-center gap-3.5 min-w-0">
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-black/5 select-none',
              gradientClass
            )}
          >
            {initials}
          </div>
          {peer.isOnline ? (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-[#0F172A] shadow-xs" />
            </span>
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-[#0F172A] shadow-xs" />
          )}
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] tracking-tight truncate">
              {peer.name}
            </h3>
            <span title="Verified Member" className="flex items-center">
              <ShieldCheck className="w-4 h-4 text-[#0A66C2] dark:text-[#38BDF8] flex-shrink-0" />
            </span>
            {peer.company && peer.company !== 'Tech' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#1E293B] text-slate-700 dark:text-[#94A3B8] font-medium text-[10px] border border-slate-200/60 dark:border-[#334155]">
                <Building2 className="w-2.5 h-2.5 text-slate-500 dark:text-[#64748B]" />
                {peer.company}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#94A3B8] flex-wrap">
            <span className="truncate text-[11px] font-medium text-slate-600 dark:text-[#94A3B8]">
              {peer.headline || 'Software Engineer'}
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[11px] font-medium',
                peer.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-[#64748B]'
              )}
            >
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  peer.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                )}
              />
              {peer.isOnline ? 'Active now' : peer.lastActive || 'Recently'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to={`/profile/${peer.id}`}
          className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#1E293B] hover:bg-slate-100 dark:hover:bg-[#28384E] border border-slate-200 dark:border-[#334155] text-xs font-semibold text-slate-700 dark:text-[#94A3B8] hover:text-[#0A66C2] dark:hover:text-[#38BDF8] transition-colors flex items-center gap-1.5 shadow-2xs group"
        >
          <span>View Profile</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-[#64748B] group-hover:text-[#0A66C2] dark:group-hover:text-[#38BDF8] transition-colors" />
        </Link>
      </div>
    </div>
  );
};

export default ChatHeader;
