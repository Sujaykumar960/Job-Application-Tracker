import React from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { NetworkUser } from '../../data/mockNetwork';
import { Check, X, Users, MapPin, ShieldCheck, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ConnectionRequestCardProps {
  user: NetworkUser;
  onAccept: (userId: string) => void;
  onIgnore: (userId: string) => void;
}

export const ConnectionRequestCard: React.FC<ConnectionRequestCardProps> = ({
  user,
  onAccept,
  onIgnore,
}) => {
  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-[#0A66C2]/40 transition">
      {/* Left: Avatar + Details + Personal Note */}
      <div className="flex items-start gap-3.5 min-w-0 flex-1">
        <div
          className={cn(
            'w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow border border-surface-700/60',
            user.avatarGradient
          )}
        >
          {user.avatarInitials}
        </div>

        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-[#1D2226] truncate">{user.name}</h4>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-[10px] text-[#788896] font-mono flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" />
              {user.requestDate || 'Recent'}
            </span>
          </div>

          <p className="text-xs text-[#56687A] leading-snug">{user.headline}</p>

          <div className="flex items-center gap-3 text-[10px] font-mono text-[#788896] flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 text-[#788896]" />
              {user.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-2.5 h-2.5 text-[#0A66C2]" />
              {user.mutualCount} mutual connections
            </span>
          </div>

          {/* Optional Note */}
          {user.note && (
            <div className="p-2.5 rounded-lg bg-[#F3F6F8] border border-[#D9D9D9] text-[11px] text-[#38434F] italic">
              "{user.note}"
            </div>
          )}
        </div>
      </div>

      {/* Right: Accept & Ignore Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
        <Button
          size="xs"
          variant="ghost"
          className="text-[#56687A] hover:text-[#B3261E] hover:bg-[#FCE8E6]"
          onClick={() => onIgnore(user.id)}
          icon={<X className="w-3.5 h-3.5" />}
        >
          Ignore
        </Button>

        <Button
          size="xs"
          variant="primary"
          onClick={() => onAccept(user.id)}
          icon={<Check className="w-3.5 h-3.5" />}
        >
          Accept
        </Button>
      </div>
    </Card>
  );
};

export default ConnectionRequestCard;
