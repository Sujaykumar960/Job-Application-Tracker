import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CompanyCard } from '../components/companies/CompanyCard';
import { CompanyDetailModal } from '../components/companies/CompanyDetailModal';
import { JobMatchModal } from '../components/jobs/JobMatchModal';
import { MOCK_COMPANIES } from '../data/mockCompanies';
import { CompanyProfile } from '../types/company';
import { JobItem, Application } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  Sparkles,
  Briefcase,
  Users,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../utils/cn';

const APPLICATIONS_STORAGE_KEY = 'careerx_applications_v2';
const COMPANIES_STORAGE_KEY = 'careerx_companies_v2';

export const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();

  // Companies state with localStorage persistence
  const [companies, setCompanies] = useState<CompanyProfile[]>(() => {
    const saved = localStorage.getItem(COMPANIES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return MOCK_COMPANIES;
      }
    }
    return MOCK_COMPANIES;
  });

  const [selectedCompany, setSelectedCompany] = useState<CompanyProfile | null>(null);
  const [matchAnalysisJob, setMatchAnalysisJob] = useState<JobItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Track applied jobs
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(() => {
    const existing = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (existing) {
      try {
        const apps: Application[] = JSON.parse(existing);
        const appliedTitles = new Set(apps.map((a) => `${a.company.toLowerCase()}-${a.role.toLowerCase()}`));
        const ids = new Set<string>();
        MOCK_COMPANIES.forEach((c) => {
          c.jobs.forEach((j) => {
            if (appliedTitles.has(`${j.company.toLowerCase()}-${j.title.toLowerCase()}`)) {
              ids.add(j.id);
            }
          });
        });
        return ids;
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const syncCompanies = (updated: CompanyProfile[]) => {
    setCompanies(updated);
    localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(updated));
    if (selectedCompany) {
      const active = updated.find((c) => c.id === selectedCompany.id);
      if (active) setSelectedCompany(active);
    }
  };

  // Follow Toggle
  const handleFollowToggle = (companyId: string) => {
    const updated = companies.map((c) => {
      if (c.id === companyId) {
        const nextFollowing = !c.isFollowing;
        return {
          ...c,
          isFollowing: nextFollowing,
          followersCount: nextFollowing ? c.followersCount + 1 : c.followersCount - 1,
        };
      }
      return c;
    });
    syncCompanies(updated);
  };

  // Apply to Job
  const handleApplyJob = (job: JobItem) => {
    const existingApps: Application[] = (() => {
      const stored = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return [];
        }
      }
      return [];
    })();

    const alreadyApplied = existingApps.some(
      (a) => a.company.toLowerCase() === job.company.toLowerCase() && a.role.toLowerCase() === job.title.toLowerCase()
    );

    if (alreadyApplied) {
      setToastMessage(`You have already applied to ${job.title} at ${job.company}`);
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    const newApplication: Application = {
      id: `app-${Date.now()}`,
      company: job.company,
      role: job.title,
      location: job.location,
      appliedDate: new Date().toISOString().split('T')[0],
      deadline: '2026-09-30',
      status: 'Applied',
      priority: 'High',
      matchScore: job.matchScore,
      salaryRange: job.salaryRange,
      tags: job.skills.slice(0, 3).map((s) => s.name),
      notes: `Direct application submitted via CareerX Companies Portal. Tech stack verified: ${job.skills.map((s) => s.name).join(', ')}.`,
      resume: 'Alex_Rivera_Distributed_Systems.pdf',
    };

    const updatedApps = [newApplication, ...existingApps];
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(updatedApps));

    setAppliedJobIds((prev) => new Set([...prev, job.id]));
    setToastMessage(`🎉 Applied successfully to ${job.title} at ${job.company}! Added to your Application Tracker.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Filtered Companies
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.headquarters.toLowerCase().includes(q) ||
        c.techStack.some((t) => t.toLowerCase().includes(q)) ||
        c.jobs.some((j) => j.title.toLowerCase().includes(q));

      const matchesIndustry =
        selectedIndustry === 'All' || c.industry.toLowerCase().includes(selectedIndustry.toLowerCase());

      return matchesSearch && matchesIndustry;
    });
  }, [companies, searchQuery, selectedIndustry]);

  const totalJobs = useMemo(
    () => companies.reduce((acc, c) => acc + c.jobs.length, 0),
    [companies]
  );

  const followingCount = useMemo(
    () => companies.filter((c) => c.isFollowing).length,
    [companies]
  );

  const industriesList = ['All', 'Fintech', 'Developer Tools', 'Cloud Platform', 'Monitoring'];

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-brand-950 border border-brand-500 text-white text-xs flex items-center justify-between shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link
            to="/applications"
            className="text-xs font-bold text-brand-300 hover:text-white underline ml-4 flex-shrink-0"
          >
            View Applications →
          </Link>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Partner Engineering Companies"
        description="Explore top engineering cultures, tech stacks, open engineering roles, and connect with technical recruiters."
        badge={
          <Badge variant="brand" size="sm">
            {companies.length} Hiring Partners
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link to="/jobs">
              <Button size="sm" variant="outline" icon={<Briefcase className="w-3.5 h-3.5 text-brand-400" />}>
                All Marketplace Jobs
              </Button>
            </Link>
          </div>
        }
      />

      {/* ========================================================================= */}
      {/* 1. TOP STATS BAR                                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Companies</span>
          <p className="text-xl font-bold text-[#1D2226] font-mono">{companies.length}</p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Tier-1 Tech</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Open Engineering Roles</span>
          <p className="text-xl font-bold text-[#0A66C2] font-mono">{totalJobs} Roles</p>
          <span className="text-[10px] text-[#0A66C2] font-mono font-semibold">Active Pipelines</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Following</span>
          <p className="text-xl font-bold text-[#8A6100] font-mono">{followingCount}</p>
          <span className="text-[10px] text-[#8A6100] font-mono font-semibold">Instant Alerts</span>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-[#D9D9D9] space-y-0.5 shadow-xs">
          <span className="text-[10px] uppercase font-mono text-[#788896] block">Avg Profile Match</span>
          <p className="text-xl font-bold text-emerald-700 font-mono">91%</p>
          <span className="text-[10px] text-emerald-700 font-mono font-semibold">Based on ATS Resume</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEARCH & INDUSTRY FILTER BAR                                           */}
      {/* ========================================================================= */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#D9D9D9] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-[#788896] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, tech stack (Go, Kafka, React), or location..."
            className="w-full bg-white text-[#1D2226] placeholder-[#788896] text-xs rounded-xl border border-[#D9D9D9] pl-9 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#0A66C2] font-mono"
          />
        </div>

        {/* Industry Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {industriesList.map((ind) => (
            <button
              key={ind}
              onClick={() => setSelectedIndustry(ind)}
              className={cn(
                'px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                selectedIndustry === ind
                  ? 'bg-[#0A66C2] text-white shadow-sm'
                  : 'text-[#56687A] hover:text-[#1D2226] hover:bg-[#F3F6F8]'
              )}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. COMPANIES CARDS GRID                                                   */}
      {/* ========================================================================= */}
      {filteredCompanies.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-surface-800 rounded-2xl bg-surface-900/40 space-y-2">
          <p className="text-sm font-semibold text-slate-300">No companies found matching your criteria</p>
          <p className="text-xs text-slate-500">
            Try adjusting your search query or reset the industry filter.
          </p>
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setSearchQuery('');
              setSelectedIndustry('All');
            }}
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompanies.map((comp) => (
            <CompanyCard
              key={comp.id}
              company={comp}
              onFollowToggle={handleFollowToggle}
              onSelectCompany={setSelectedCompany}
            />
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. COMPANY DETAIL MODAL (About, Jobs, Posts, Employees)                   */}
      {/* ========================================================================= */}
      <CompanyDetailModal
        company={selectedCompany}
        isOpen={Boolean(selectedCompany)}
        onClose={() => setSelectedCompany(null)}
        onFollowToggle={handleFollowToggle}
        onApplyJob={handleApplyJob}
        onAnalyzeMatch={(job) => setMatchAnalysisJob(job)}
        appliedJobIds={appliedJobIds}
      />

      {/* ========================================================================= */}
      {/* 5. JOB MATCH MODAL (Analyze Match against Candidate Resume)               */}
      {/* ========================================================================= */}
      {matchAnalysisJob && (
        <JobMatchModal
          job={matchAnalysisJob}
          isOpen={Boolean(matchAnalysisJob)}
          onClose={() => setMatchAnalysisJob(null)}
          onApply={(job) => {
            handleApplyJob(job);
            setMatchAnalysisJob(null);
          }}
        />
      )}
    </div>
  );
};

export default CompaniesPage;
