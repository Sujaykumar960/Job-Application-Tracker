import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { CheckCircle2, Circle, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ProfileCompletionItem {
  label: string;
  isComplete: boolean;
  impact: string;
}

export const ProfileCompletionCard: React.FC = () => {
  const completionItems: ProfileCompletionItem[] = [
    { label: 'Profile Photo & Professional Headline', isComplete: true, impact: '15%' },
    { label: 'Work Experience with Quantified Metrics', isComplete: true, impact: '25%' },
    { label: 'Production Projects with Live GitHub Repos', isComplete: true, impact: '20%' },
    { label: 'Technical Skills & Verified Certifications', isComplete: true, impact: '15%' },
    { label: 'Attached Resume with 88% ATS Score', isComplete: true, impact: '17%' },
    { label: 'Verified Direct Phone for Fast-Track SMS', isComplete: false, impact: '+8%' },
  ];

  const completionPercent = 92;

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <div>
            <h3 className="text-xs font-bold text-[#1D2226]">Profile Strength</h3>
            <span className="text-[10px] text-emerald-600 font-mono font-semibold">
              All-Star Tier ({completionPercent}%)
            </span>
          </div>
        </div>

        <Badge variant="brand" size="sm">
          Top 4% Profile
        </Badge>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-[#F3F6F8] overflow-hidden border border-[#D9D9D9]">
          <div
            className="h-full bg-gradient-to-r from-[#0A66C2] to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-[#56687A]">
          All-star profiles receive <strong className="text-[#1D2226]">4.2x more inbound recruiter contacts</strong>.
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2 pt-1 border-t border-[#E8E8E8] text-xs">
        {completionItems.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              {item.isComplete ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-[#788896] flex-shrink-0" />
              )}
              <span className={item.isComplete ? 'text-[#1D2226]' : 'text-[#56687A] font-medium'}>
                {item.label}
              </span>
            </div>

            <span
              className={cn(
                'font-mono text-[10px]',
                item.isComplete ? 'text-[#788896]' : 'text-[#0A66C2] font-bold'
              )}
            >
              {item.impact}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ProfileCompletionCard;
