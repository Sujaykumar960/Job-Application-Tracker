import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { CompanyProfile } from '../../types/company';
import { CompanyLogo } from './CompanyLogo';
import {
  Building2,
  MapPin,
  Users,
  Briefcase,
  Check,
  Plus,
  ArrowRight,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CompanyCardProps {
  company: CompanyProfile;
  onFollowToggle: (companyId: string) => void;
  onSelectCompany: (company: CompanyProfile) => void;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({
  company,
  onFollowToggle,
  onSelectCompany,
}) => {
  return (
    <Card className="p-5 bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-sm hover:border-[#0A66C2]/40 dark:hover:border-sky-500/40 hover:shadow-md transition group">
      {/* Top Header: Logo + Name + Follow Toggle */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Company Logo Monogram */}
            <CompanyLogo
              name={company.name}
              initials={company.logoInitials}
              gradient={company.logoGradient}
              size="lg"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  onClick={() => onSelectCompany(company)}
                  className="text-sm font-bold text-[#1D2226] dark:text-slate-100 group-hover:text-[#0A66C2] dark:group-hover:text-sky-400 transition truncate cursor-pointer"
                >
                  {company.name}
                </h3>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              </div>
              <p className="text-[11px] text-[#56687A] dark:text-slate-400 font-mono truncate">{company.industry}</p>
            </div>
          </div>

          {/* Follow Button */}
          <Button
            size="xs"
            variant={company.isFollowing ? 'outline' : 'secondary'}
            onClick={() => onFollowToggle(company.id)}
            className={cn(
              "flex-shrink-0 text-[11px] px-2.5 font-semibold",
              company.isFollowing
                ? "border-[#0A66C2]/40 text-[#0A66C2] bg-[#E8F3FF] dark:border-sky-500/40 dark:text-sky-300 dark:bg-sky-950/40"
                : "text-[#1D2226] dark:text-slate-200 bg-[#F3F6F8] dark:bg-slate-800 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 border-[#D9D9D9] dark:border-slate-700"
            )}
            icon={
              company.isFollowing ? (
                <Check className="w-3 h-3 text-[#0A66C2] dark:text-sky-300" />
              ) : (
                <Plus className="w-3 h-3" />
              )
            }
          >
            {company.isFollowing ? 'Following' : 'Follow'}
          </Button>
        </div>

        {/* Tagline */}
        <p className="text-xs text-[#38434F] dark:text-slate-300 leading-snug line-clamp-2">
          {company.tagline}
        </p>

        {/* Details Matrix: HQ & Headcount */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-[#788896] dark:text-slate-400 flex-wrap pt-0.5">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#788896] dark:text-slate-500" />
            {company.headquarters.split('&')[0].trim()}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[#788896] dark:text-slate-500" />
            {company.size}
          </span>
        </div>

        {/* Tech Stack Pills */}
        <div className="flex flex-wrap gap-1 pt-1">
          {company.techStack.slice(0, 5).map((tech) => (
            <span
              key={tech}
              className="px-2 py-0.5 rounded-md bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-300 border border-[#D9D9D9] dark:border-slate-700 text-[10px] font-mono"
            >
              {tech}
            </span>
          ))}
          {company.techStack.length > 5 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#F3F6F8] dark:bg-slate-800 text-[#788896] dark:text-slate-400 border border-[#E8E8E8] dark:border-slate-700 text-[9px] font-mono">
              +{company.techStack.length - 5}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer: Open Jobs Count & Inspect Button */}
      <div className="pt-3 border-t border-[#E8E8E8] dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <Briefcase className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-semibold text-[#1D2226] dark:text-slate-100">{company.openJobsCount}</span>
          <span className="text-[#56687A] dark:text-slate-400">open positions</span>
        </div>

        <Button
          size="xs"
          variant="primary"
          onClick={() => onSelectCompany(company)}
          icon={<ArrowRight className="w-3 h-3" />}
        >
          View Company & Jobs
        </Button>
      </div>
    </Card>
  );
};

export default CompanyCard;

