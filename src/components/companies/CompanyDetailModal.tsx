import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { CompanyProfile } from '../../types/company';
import { CompanyLogo } from './CompanyLogo';
import { JobItem } from '../../types';
import {
  Building2,
  MapPin,
  Users,
  Globe,
  Briefcase,
  Check,
  Plus,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Calendar,
  Heart,
  TrendingUp,
  Award,
  UserPlus,
  UserCheck,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Link, useNavigate } from 'react-router-dom';

export interface CompanyDetailModalProps {
  company: CompanyProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onFollowToggle: (companyId: string) => void;
  onApplyJob: (job: JobItem) => void;
  onAnalyzeMatch: (job: JobItem) => void;
  appliedJobIds: Set<string>;
}

type TabType = 'about' | 'jobs' | 'posts' | 'employees';

export const CompanyDetailModal: React.FC<CompanyDetailModalProps> = ({
  company,
  isOpen,
  onClose,
  onFollowToggle,
  onApplyJob,
  onAnalyzeMatch,
  appliedJobIds,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('about');
  const [connectedEmployees, setConnectedEmployees] = useState<Set<string>>(new Set(['emp-1', 'emp-2', 'emp-4']));
  const navigate = useNavigate();

  if (!company) return null;

  const toggleEmployeeConnect = (empId: string) => {
    setConnectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="4xl"
    >
      <div className="space-y-5 -mt-4">
        {/* ==================== 1. HERO HEADER ==================== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E8E8] dark:border-slate-800">
          <div className="flex items-center gap-4">
            {/* Logo Monogram */}
            <CompanyLogo
              name={company.name}
              initials={company.logoInitials}
              gradient={company.logoGradient}
              size="xl"
            />

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-extrabold text-[#1D2226] dark:text-slate-100">{company.name}</h2>
                <Badge variant="brand" size="sm" className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  Verified Employer
                </Badge>
                <span className="text-[11px] font-mono text-[#788896] dark:text-slate-400">
                  {company.followersCount.toLocaleString()} followers
                </span>
              </div>
              <p className="text-xs text-[#56687A] dark:text-slate-400 font-medium">{company.tagline}</p>
              <div className="flex items-center gap-3 text-[11px] font-mono text-[#788896] dark:text-slate-400 pt-0.5 flex-wrap">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#788896] dark:text-slate-500" />
                  {company.industry}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#788896] dark:text-slate-500" />
                  {company.headquarters}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Follow & Website */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
            <Button
              size="xs"
              variant={company.isFollowing ? 'outline' : 'secondary'}
              onClick={() => onFollowToggle(company.id)}
              className={cn(
                "text-xs px-3",
                company.isFollowing
                  ? "border-[#0A66C2]/40 text-[#0A66C2] bg-[#E8F3FF] dark:border-sky-500/40 dark:text-sky-300 dark:bg-sky-950/40"
                  : "text-[#1D2226] dark:text-slate-200 bg-[#F3F6F8] dark:bg-slate-800 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 border-[#D9D9D9] dark:border-slate-700"
              )}
              icon={
                company.isFollowing ? (
                  <Check className="w-3.5 h-3.5 text-[#0A66C2] dark:text-sky-300" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )
              }
            >
              {company.isFollowing ? 'Following' : 'Follow'}
            </Button>

            <a
              href={company.website}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-lg bg-[#F3F6F8] dark:bg-slate-800 hover:bg-[#E8E8E8] dark:hover:bg-slate-700 border border-[#D9D9D9] dark:border-slate-700 text-xs font-semibold text-[#1D2226] dark:text-slate-100 transition flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5 text-[#788896] dark:text-slate-400" />
              <span>Website</span>
              <ExternalLink className="w-3 h-3 text-[#788896] dark:text-slate-400" />
            </a>
          </div>
        </div>

        {/* ==================== 2. TAB CONTROLS ==================== */}
        <div className="flex items-center gap-2 border-b border-[#E8E8E8] dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab('about')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer',
              activeTab === 'about'
                ? 'bg-[#0A66C2] text-white dark:bg-sky-600 shadow-sm'
                : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
            )}
          >
            About
          </button>

          <button
            onClick={() => setActiveTab('jobs')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer',
              activeTab === 'jobs'
                ? 'bg-[#0A66C2] text-white dark:bg-sky-600 shadow-sm'
                : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
            )}
          >
            <span>Open Jobs</span>
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
              activeTab === 'jobs' ? "bg-[#004182] dark:bg-sky-800 text-white" : "bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-400"
            )}>
              {company.jobs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('posts')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer',
              activeTab === 'posts'
                ? 'bg-[#0A66C2] text-white dark:bg-sky-600 shadow-sm'
                : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
            )}
          >
            <span>Tech Posts</span>
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
              activeTab === 'posts' ? "bg-[#004182] dark:bg-sky-800 text-white" : "bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-400"
            )}>
              {company.posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={cn(
              'px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer',
              activeTab === 'employees'
                ? 'bg-[#0A66C2] text-white dark:bg-sky-600 shadow-sm'
                : 'text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100 hover:bg-[#F3F6F8] dark:hover:bg-slate-800'
            )}
          >
            <span>Employees & Recruiters</span>
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.2 rounded-full",
              activeTab === 'employees' ? "bg-[#004182] dark:bg-sky-800 text-white" : "bg-[#F3F6F8] dark:bg-slate-800 text-[#56687A] dark:text-slate-400"
            )}>
              {company.employees.length}
            </span>
          </button>
        </div>

        {/* ==================== 3. TAB CONTENTS ==================== */}

        {/* TAB 1: ABOUT */}
        {activeTab === 'about' && (
          <div className="space-y-4 text-xs text-[#38434F] dark:text-slate-300">
            {/* Mission & Overview */}
            <div className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono text-[11px] tracking-wider">
                Company Mission & Overview
              </h4>
              <p className="leading-relaxed">{company.about}</p>
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 text-[#1D2226] dark:text-slate-200 italic font-sans text-xs">
                "{company.mission}"
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-[#788896] dark:text-slate-400 uppercase">Funding Stage</span>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">{company.funding}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-[#788896] dark:text-slate-400 uppercase">Headcount</span>
                <p className="font-bold text-[#1D2226] dark:text-slate-100">{company.size}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-[#788896] dark:text-slate-400 uppercase">Founded</span>
                <p className="font-bold text-[#1D2226] dark:text-slate-100">{company.founded}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-0.5">
                <span className="text-[10px] text-[#788896] dark:text-slate-400 uppercase">Open Positions</span>
                <p className="font-bold text-[#0A66C2] dark:text-blue-400">{company.jobs.length} roles</p>
              </div>
            </div>

            {/* Tech Stack Cloud */}
            <div className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono text-[11px] tracking-wider">
                Production Tech Stack
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {company.techStack.map((tech) => (
                  <span
                    key={tech}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 text-[#1D2226] dark:text-slate-200 font-mono text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Benefits & Perks */}
            <div className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-2">
              <h4 className="font-bold text-[#1D2226] dark:text-slate-100 uppercase font-mono text-[11px] tracking-wider">
                Perks & Engineering Culture
              </h4>
              <ul className="space-y-1.5 list-disc list-inside leading-relaxed text-[#38434F] dark:text-slate-300">
                {company.benefits.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2: JOBS */}
        {activeTab === 'jobs' && (
          <div className="space-y-3">
            {company.jobs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-[#D9D9D9] dark:border-slate-700 rounded-xl text-[#788896] dark:text-slate-400 text-xs">
                No active openings currently posted. Follow the company to receive alerts when new roles open.
              </div>
            ) : (
              company.jobs.map((job) => {
                const isApplied = appliedJobIds.has(job.id);

                return (
                  <div
                    key={job.id}
                    className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-3 hover:border-[#0A66C2]/40 dark:hover:border-sky-500/40 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#1D2226] dark:text-slate-100">{job.title}</h4>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-[#788896] dark:text-slate-400 pt-0.5 flex-wrap">
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{job.salaryRange}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                          <span>•</span>
                          <span className="px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 border border-[#D9D9D9] dark:border-slate-700 text-[10px] text-[#56687A] dark:text-slate-300">
                            {job.workType}
                          </span>
                        </div>
                      </div>

                      {/* Resume Match Dial */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8F3FF] dark:bg-sky-950/40 border border-[#d0e6fc] dark:border-sky-800">
                          <Sparkles className="w-3.5 h-3.5 text-[#0A66C2] dark:text-sky-300" />
                          <span className="font-mono text-xs font-bold text-[#0A66C2] dark:text-sky-300">
                            {job.matchScore}% Match
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-[#38434F] dark:text-slate-300 leading-relaxed line-clamp-2">
                      {job.description}
                    </p>

                    {/* Matched vs Missing Skills comparison */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {job.skills.map((s) => (
                        <span
                          key={s.name}
                          className={cn(
                            'px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border',
                            s.isMatched
                              ? 'bg-[#E6F4EA] dark:bg-emerald-950/40 text-[#137333] dark:text-emerald-400 border-[#c6ecd2] dark:border-emerald-800'
                              : 'bg-[#FFF4CC] dark:bg-amber-950/40 text-[#8A6100] dark:text-amber-400 border-[#ffe899] dark:border-amber-800'
                          )}
                        >
                          {s.isMatched ? '✓' : '⚠'} {s.name}
                        </span>
                      ))}
                    </div>

                    {/* Actions: Apply & Analyze Match */}
                    <div className="pt-2 border-t border-[#E8E8E8] dark:border-slate-700 flex items-center justify-end gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => onAnalyzeMatch(job)}
                        icon={<Sparkles className="w-3 h-3 text-[#0A66C2] dark:text-sky-400" />}
                      >
                        Analyze Match
                      </Button>

                      <Button
                        size="xs"
                        variant={isApplied ? 'outline' : 'primary'}
                        onClick={() => onApplyJob(job)}
                        disabled={isApplied}
                        icon={<Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                      >
                        {isApplied ? 'Application Submitted ✓' : 'Apply Now'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: POSTS */}
        {activeTab === 'posts' && (
          <div className="space-y-3">
            {company.posts.map((post) => (
              <div
                key={post.id}
                className="p-4 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#1D2226] dark:text-slate-100 text-xs">{post.title}</span>
                  <span className="text-[#788896] dark:text-slate-400 font-mono">{post.date}</span>
                </div>
                <p className="text-[#38434F] dark:text-slate-300 leading-relaxed">{post.content}</p>
                <div className="flex items-center justify-between pt-2 border-t border-[#E8E8E8] dark:border-slate-700 text-[10px] font-mono text-[#788896] dark:text-slate-400">
                  <span>
                    By <strong className="text-[#1D2226] dark:text-slate-100">{post.author}</strong> ({post.authorRole})
                  </span>
                  <span className="flex items-center gap-1 text-[#B3261E] dark:text-rose-400">
                    <Heart className="w-3 h-3 fill-current" /> {post.likesCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: EMPLOYEES & RECRUITERS */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {company.employees.map((emp) => {
              const isConn = connectedEmployees.has(emp.id);

              return (
                <div
                  key={emp.id}
                  className="p-3 rounded-xl bg-[#F3F6F8] dark:bg-slate-800/80 border border-[#E8E8E8] dark:border-slate-700 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow border border-surface-700/60',
                        emp.avatarGradient
                      )}
                    >
                      {emp.avatarInitials}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-bold text-[#1D2226] dark:text-slate-100 truncate">{emp.name}</h4>
                      <p className="text-[11px] text-[#56687A] dark:text-slate-400 truncate">{emp.role}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="xs"
                      variant={isConn ? 'outline' : 'secondary'}
                      onClick={() => toggleEmployeeConnect(emp.id)}
                      className="text-[10px] px-2"
                      icon={
                        isConn ? (
                          <UserCheck className="w-3 h-3 text-[#0A66C2] dark:text-sky-300" />
                        ) : (
                          <UserPlus className="w-3 h-3" />
                        )
                      }
                    >
                      {isConn ? 'Connected' : 'Connect'}
                    </Button>

                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => {
                        onClose();
                        navigate('/messages');
                      }}
                      className="p-1.5 text-[#56687A] dark:text-slate-400 hover:text-[#1D2226] dark:hover:text-slate-100"
                      title="Direct Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default CompanyDetailModal;
