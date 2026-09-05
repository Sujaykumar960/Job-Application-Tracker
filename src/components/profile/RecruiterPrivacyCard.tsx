import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  DollarSign,
  Building2,
  Mail,
  MapPin,
  Check,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface PrivacySettings {
  showSalary: boolean;
  salaryRange: string;
  hideFromCurrentEmployer: boolean;
  contactVisibility: 'all_recruiters' | 'mutual_matches' | 'hidden';
  searchStatus: 'actively_looking' | 'casually_browsing' | 'not_looking';
  openToRelocation: boolean;
}

export const RecruiterPrivacyCard: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettings>({
    showSalary: true,
    salaryRange: '$165,000 - $195,000',
    hideFromCurrentEmployer: true,
    contactVisibility: 'all_recruiters',
    searchStatus: 'actively_looking',
    openToRelocation: true,
  });

  const [savedFeedback, setSavedFeedback] = useState(false);

  const toggleSetting = (key: keyof PrivacySettings, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  return (
    <Card className="p-4 bg-white border border-[#D9D9D9] space-y-3.5 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8E8E8]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E8F3FF] border border-[#d0e6fc] flex items-center justify-center text-[#0A66C2]">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1D2226] flex items-center gap-1.5">
              Recruiter Privacy & Visibility Controls
              {savedFeedback && (
                <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Saved
                </span>
              )}
            </h3>
            <p className="text-[10px] text-[#56687A]">Manage what verified talent partners see</p>
          </div>
        </div>

        <Badge variant="brand" size="sm">
          Privacy Shield Active
        </Badge>
      </div>

      <div className="space-y-3 text-xs">
        {/* Job Search Status */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8]">
          <div className="space-y-0.5">
            <span className="font-semibold text-[#1D2226]">Job Search Availability</span>
            <p className="text-[11px] text-[#56687A]">Signal readiness to inbound talent teams</p>
          </div>
          <select
            value={settings.searchStatus}
            onChange={(e) => toggleSetting('searchStatus', e.target.value)}
            className="bg-white text-[#1D2226] text-xs font-semibold rounded-lg border border-[#D9D9D9] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="actively_looking">🟢 Actively Interviewing</option>
            <option value="casually_browsing">🟡 Casually Browsing</option>
            <option value="not_looking">⚪ Not Looking</option>
          </select>
        </div>

        {/* Show Salary Expectations */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#1D2226]">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Compensation Expectation ({settings.salaryRange})</span>
            </div>
            <p className="text-[11px] text-[#56687A]">Only verified recruiters with open headcount can see</p>
          </div>

          <button
            onClick={() => toggleSetting('showSalary', !settings.showSalary)}
            className={cn(
              'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
              settings.showSalary ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                settings.showSalary ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Hide from Current Employer */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#1D2226]">
              <Building2 className="w-3.5 h-3.5 text-[#B3261E]" />
              <span>Hide from Current Employer Domain</span>
            </div>
            <p className="text-[11px] text-[#56687A]">Excludes recruiters from @cloudscale.io</p>
          </div>

          <button
            onClick={() =>
              toggleSetting('hideFromCurrentEmployer', !settings.hideFromCurrentEmployer)
            }
            className={cn(
              'w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5',
              settings.hideFromCurrentEmployer ? 'bg-[#0A66C2]' : 'bg-[#D9D9D9]'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full bg-white transition-transform transform shadow-md',
                settings.hideFromCurrentEmployer ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Direct Email / Phone Visibility */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F3F6F8] border border-[#E8E8E8]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 font-semibold text-[#1D2226]">
              <Mail className="w-3.5 h-3.5 text-sky-600" />
              <span>Direct Contact Information</span>
            </div>
            <p className="text-[11px] text-[#56687A]">Control who can see your direct email & phone</p>
          </div>

          <select
            value={settings.contactVisibility}
            onChange={(e) => toggleSetting('contactVisibility', e.target.value)}
            className="bg-white text-[#1D2226] text-xs font-semibold rounded-lg border border-[#D9D9D9] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[#0A66C2]"
          >
            <option value="all_recruiters">All Verified Recruiters</option>
            <option value="mutual_matches">Only Mutual Applications</option>
            <option value="hidden">Hidden (Message via Platform)</option>
          </select>
        </div>
      </div>
    </Card>
  );
};

export default RecruiterPrivacyCard;
