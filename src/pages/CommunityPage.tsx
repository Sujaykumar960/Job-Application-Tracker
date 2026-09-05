import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Users, MessageSquare, Heart, Share2, Plus } from 'lucide-react';

export const CommunityPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-[#E8E8E8]">
        <div>
          <h1 className="text-xl font-bold text-[#1D2226] tracking-tight flex items-center gap-2">
            Engineering Community & Feed
          </h1>
          <p className="text-xs text-[#56687A] mt-0.5">
            Share technical interview debriefs, system design architectures, and refer engineers.
          </p>
        </div>

        <Button size="sm" variant="primary" icon={<Plus className="w-4 h-4" />}>
          Create Post
        </Button>
      </div>

      <div className="max-w-2xl space-y-4">
        <Card className="p-4 space-y-3 bg-white border border-[#D9D9D9] shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[#1D2226]">Alex Rivera</h4>
              <p className="text-[10px] text-[#788896]">Full Stack Engineer @ CloudScale</p>
            </div>
            <Badge variant="brand" size="sm">Interview Experience</Badge>
          </div>
          <p className="text-xs text-[#38434F] leading-relaxed">
            Key pattern from the Stripe infrastructure onsite: Always use a sliding window counter with atomic Redis Lua scripts rather than fixed windows for distributed rate limiting.
          </p>
          <div className="flex items-center gap-4 text-xs text-[#788896] pt-2 border-t border-[#E8E8E8]">
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500" /> 134</span>
            <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" /> 28 comments</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CommunityPage;
