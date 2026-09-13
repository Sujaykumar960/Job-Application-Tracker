import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NetworkUser } from '../../types';
import {
  UserPlus,
  Clock,
  UserCheck,
  MapPin,
  Users,
  MessageSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CandidateCardProps {
  user: NetworkUser;
  onConnectToggle: (userId: string) => void;
  onMessage?: (userId: string) => void;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  user,
  onConnectToggle,
  onMessage,
}) => {
  const renderConnectionButton = () => {
    switch (user.connectionState) {
      case 'not_connected':
        return (
          <Button
            size="xs"
            variant="secondary"
            className="w-full text-xs font-semibold"
            onClick={() => onConnectToggle(user.id)}
            icon={<UserPlus className="w-3.5 h-3.5" />}
          >
            Connect
          </Button>
        );

      case 'pending':
        return (
          <Button
            size="xs"
            variant="outline"
            className="w-full text-xs text-[#8A6100] border-[#ffe899] bg-[#FFF4CC] hover:bg-[#ffe082] transition"
            onClick={() => onConnectToggle(user.id)}
            icon={<Clock className="w-3.5 h-3.5 text-[#8A6100]" />}
            title="Click to withdraw request"
          >
            Pending
          </Button>
        );

      case 'connected':
        return (
          <div className="flex items-center gap-1.5 w-full">
            <Button
              size="xs"
              variant="outline"
              className="flex-1 text-xs text-[#137333] border-[#c6ecd2] bg-[#E6F4EA]"
              icon={<UserCheck className="w-3.5 h-3.5 text-[#137333]" />}
              disabled
            >
              Connected
            </Button>
            {onMessage && (
              <Button
                size="xs"
                variant="primary"
                className="px-2.5"
                onClick={() => onMessage(user.id)}
                title="Send Message"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] flex flex-col justify-between space-y-3.5 shadow-sm hover:border-[#0A66C2]/40 transition group">
      {/* Top Details */}
      <div className="space-y-3">
        {/* Avatar + Name + Headline */}
        <div className="flex items-start gap-3">
          {/* Avatar / Photo */}
          <Link
            to={`/profile/${user.id}`}
            className={cn(
              'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow border border-surface-700/60 transition hover:opacity-90',
              user.avatarGradient
            )}
          >
            {user.avatarInitials}
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                to={`/profile/${user.id}`}
                className="text-xs font-bold text-[#1D2226] hover:text-[#0A66C2] transition truncate"
              >
                {user.name}
              </Link>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            </div>

            <p className="text-[11px] text-[#56687A] leading-snug line-clamp-2 mt-0.5">
              {user.headline}
            </p>

            <span className="text-[10px] text-[#788896] font-mono flex items-center gap-1 mt-1">
              <MapPin className="w-2.5 h-2.5 text-[#788896]" />
              {user.location}
            </span>
          </div>
        </div>

        {/* Skills Tags */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {user.skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-md bg-[#F3F6F8] text-[#56687A] border border-[#D9D9D9] text-[10px] font-mono"
            >
              {s}
            </span>
          ))}
          {user.skills.length > 4 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#F3F6F8] text-[#788896] border border-[#D9D9D9] text-[9px] font-mono">
              +{user.skills.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Area: Mutual Connections & Action Button */}
      <div className="space-y-2.5 pt-2 border-t border-[#E8E8E8]">
        {/* Mutual Connections */}
        <div className="flex items-center gap-1.5 text-[10px] text-[#788896] font-mono">
          <Users className="w-3 h-3 text-[#0A66C2] flex-shrink-0" />
          <span className="truncate">
            {user.mutualCount} mutual connections
            {user.mutualNames && user.mutualNames.length > 0 && ` (${user.mutualNames[0]})`}
          </span>
        </div>

        {/* Connect Action Button */}
        {renderConnectionButton()}
      </div>
    </Card>
  );
};

export default CandidateCard;
