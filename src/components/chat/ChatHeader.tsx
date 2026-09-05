import React from 'react';
import { ChatConversation } from '../../api/chatWebSocket';
import { Badge } from '../common/Badge';
import { Link } from 'react-router-dom';
import {
  ExternalLink,
  ShieldCheck,
  Circle,
  Building2,
  Calendar,
  MoreVertical,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ChatHeaderProps {
  conversation: ChatConversation;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({ conversation }) => {
  const { peer } = conversation;

  return (
    <div className="px-4 py-3 bg-white border-b border-[#D9D9D9] flex items-center justify-between gap-3">
      {/* Peer Info */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs shadow border border-surface-700/60',
              peer.avatarGradient
            )}
          >
            {peer.avatarInitials}
          </div>
          {peer.isOnline ? (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          ) : (
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-[#1D2226] truncate">{peer.name}</h3>
            <span className="text-[10px] text-[#56687A] font-mono flex items-center gap-1">
              <Building2 className="w-2.5 h-2.5 text-[#788896]" />
              {peer.company}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono">
            <span className="text-[#0A66C2] truncate">{peer.headline}</span>
            <span className="text-slate-300">•</span>
            <span
              className={cn(
                'flex items-center gap-1',
                peer.isOnline ? 'text-emerald-600' : 'text-[#788896]'
              )}
            >
              <Circle className={cn('w-1.5 h-1.5 fill-current')} />
              {peer.lastActive}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Link
          to="/profile"
          className="px-2.5 py-1 rounded-lg bg-[#F3F6F8] hover:bg-white border border-[#D9D9D9] text-[11px] font-semibold text-[#1D2226] hover:text-[#0A66C2] transition flex items-center gap-1 shadow-sm"
        >
          <span>View Profile</span>
          <ExternalLink className="w-3 h-3 text-[#788896]" />
        </Link>
      </div>
    </div>
  );
};

export default ChatHeader;
